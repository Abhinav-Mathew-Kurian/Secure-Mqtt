const fs = require('fs');
const path = require('path');
const axios = require('axios');
const forge = require('node-forge');
const crypto = require('crypto');

const keysPath = path.join(__dirname, 'keys');
const certPath = path.join(keysPath, 'cert.pem');
const privateKeyPath = path.join(keysPath, 'private.pem');
const deviceId = 'receiver';

let isRotating = false;
let lastRotationTime = 0;

function hashPem(pem) {
  return crypto.createHash('sha256').update(pem).digest('hex');
}

async function fetchNewCert() {
  try {
    isRotating = true;
    lastRotationTime = Date.now();

    const res = await axios.post(`http://localhost:7070/register/${deviceId}`);
    const certPem = res.data.certificate;
    const privatePem = res.data.privateKey;

    fs.mkdirSync(keysPath, { recursive: true });
    fs.writeFileSync(certPath, certPem);
    fs.writeFileSync(privateKeyPath, privatePem);
    fs.writeFileSync(path.join(keysPath, 'ca.pem'), res.data.ca);

    const newCert = forge.pki.certificateFromPem(certPem);
    const newHash = hashPem(certPem);

    console.log('✅ New certificate fetched and stored');
    console.log(`🔐 Serial: ${newCert.serialNumber}`);
    console.log(`🔐 Expires at: ${newCert.validity.notAfter}`);
    console.log(`🔐 New Cert Hash: ${newHash}`);
  } catch (err) {
    console.error('❌ Failed to fetch new cert:', err.message);
  } finally {
    isRotating = false;
  }
}

async function rotateKeysIfExpired() {
  if (isRotating) return;

  const now = Date.now();

  // Prevent rotation spam: skip if within 5 seconds of last rotation
  if (now - lastRotationTime < 5000) {
    return;
  }

  try {
    if (!fs.existsSync(certPath)) {
      console.log('🔁 No cert found. Fetching...');
      await fetchNewCert();
      return;
    }

    const certPem = fs.readFileSync(certPath, 'utf8');
    const cert = forge.pki.certificateFromPem(certPem);
    const currentTime = new Date();

    if (currentTime >= cert.validity.notAfter) {
      console.log('🔁 Certificate expired. Rotating...');
      await fetchNewCert();
    } else {
      const secondsLeft = (cert.validity.notAfter - currentTime) / 1000;
      console.log(`⏳ Certificate valid for ${secondsLeft.toFixed(1)} seconds`);
    }
  } catch (err) {
    console.error('❌ Error in cert rotation logic:', err.message);
  }
}

rotateKeysIfExpired();
setInterval(rotateKeysIfExpired, 1000); // still 1s interval, now safe
