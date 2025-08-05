const express = require('express');
const forge = require('node-forge');
const fs = require('fs');
const path = require('path');
const pinataSDK = require('@pinata/sdk');
require('dotenv').config();

const app = express();
app.use(express.json());
const PORT = 7070;

const pinata = new pinataSDK({
  pinataApiKey: process.env.PINATA_API_KEY,
  pinataSecretApiKey: process.env.PINATA_SECRET_API_KEY,
});

const caKeyPem = fs.readFileSync(path.join(__dirname, '../ca/ca.key'), 'utf8');
const caCertPem = fs.readFileSync(path.join(__dirname, '../ca/ca.pem'), 'utf8');
const caKey = forge.pki.privateKeyFromPem(caKeyPem);
const caCert = forge.pki.certificateFromPem(caCertPem);

app.post('/register/:deviceId', async (req, res) => {
  const { deviceId } = req.params;
  console.log(`📨 Registering device: ${deviceId}`);

  const keys = forge.pki.rsa.generateKeyPair(2048);
  const cert = forge.pki.createCertificate();
  cert.publicKey = keys.publicKey;
  cert.serialNumber = `${Date.now()}`;
  cert.validity.notBefore = new Date();
  cert.validity.notAfter = new Date();
  cert.validity.notAfter.setMinutes(cert.validity.notBefore.getMinutes() + 2);
  cert.setSubject([{ name: 'commonName', value: deviceId }]);
  cert.setIssuer(caCert.subject.attributes);
  cert.setExtensions([
    { name: 'basicConstraints', cA: false },
    { name: 'keyUsage', digitalSignature: true, keyEncipherment: true },
    { name: 'extKeyUsage', serverAuth: true, clientAuth: true },
    { name: 'subjectAltName', altNames: [{ type: 2, value: deviceId }] },
  ]);
  cert.sign(caKey, forge.md.sha256.create());

  const certPem = forge.pki.certificateToPem(cert);
  const privatePem = forge.pki.privateKeyToPem(keys.privateKey);
  const publicPem = forge.pki.publicKeyToPem(keys.publicKey);

  // 🔐 Pin public key to IPFS with metadata for future filtering
  const pinResult = await pinata.pinJSONToIPFS(
    { deviceId, publicKey: publicPem },
    {
      pinataMetadata: {
        name: `public-key-${deviceId}`,
        keyvalues: {
          deviceId: deviceId,
        },
      },
    }
  );

  console.log(`📦 Public key pinned to IPFS: ${pinResult.IpfsHash}`);

  const folder = path.join(__dirname, '../certs', deviceId);
  fs.mkdirSync(folder, { recursive: true });
  fs.writeFileSync(path.join(folder, 'cert.pem'), certPem);
  fs.writeFileSync(path.join(folder, 'private.pem'), privatePem);
  fs.writeFileSync(path.join(folder, 'public.pem'), publicPem);

  res.json({
    certificate: certPem,
    privateKey: privatePem,
    publicKey: publicPem,
    ca: caCertPem,
    ipfsHash: pinResult.IpfsHash,
  });
});

app.get('/public-key/:deviceId', async (req, res) => {
  const { deviceId } = req.params;
  const certPath = path.join(__dirname, '../certs', deviceId, 'public.pem');

  if (!fs.existsSync(certPath)) {
    return res.status(404).json({ error: 'Device not found' });
  }

  const publicPem = fs.readFileSync(certPath, 'utf8');

  const pinned = await pinata.pinList({
    status: 'pinned',
    metadata: {
      keyvalues: {
        deviceId: {
          value: deviceId,
          op: 'eq',
        },
      },
    },
  });

  if (!pinned.rows || pinned.rows.length === 0) {
    return res.status(404).json({ error: 'No public key pinned for this device' });
  }

  res.json({
    publicKey: publicPem,
    ipfsHash: pinned.rows[0].ipfs_pin_hash,
  });
});

app.listen(PORT, () => {
  console.log(`🔐 PKI server running at http://localhost:${PORT}`);
});
