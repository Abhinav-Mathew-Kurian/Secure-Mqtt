const forge = require('node-forge');
const axios = require('axios');
const fs = require('fs');
const path = require('path');

const deviceId = 'receiver';
const keysPath = path.join(__dirname, 'keys');

async function setupKeys() {
  if (fs.existsSync(path.join(keysPath, 'cert.pem'))) {
    console.log('🔐 Receiver keys already exist');
    return;
  }

  console.log('🔐 Fetching receiver cert...');
  const res = await axios.post(`http://localhost:7070/register/${deviceId}`);
  fs.mkdirSync(keysPath, { recursive: true });
  fs.writeFileSync(path.join(keysPath, 'cert.pem'), res.data.certificate);
  fs.writeFileSync(path.join(keysPath, 'private.pem'), res.data.privateKey);
  fs.writeFileSync(path.join(keysPath, 'ca.pem'), res.data.ca);

  const forgeCert = forge.pki.certificateFromPem(res.data.certificate);
  const forgeCA = forge.pki.certificateFromPem(res.data.ca);
  const verified = forgeCA.verify(forgeCert);
  console.log(`🛡️  Receiver cert verified by CA: ${verified}`);
}

module.exports = setupKeys;
