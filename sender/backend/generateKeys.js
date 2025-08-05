// sender/backend/generateKeys.js
const forge = require('node-forge');
const fs = require('fs');
const path = require('path');

const { pki } = forge;
const keypair = pki.rsa.generateKeyPair(2048);

// Store public key in sender/backend/keys
const publicPem = pki.publicKeyToPem(keypair.publicKey);
fs.mkdirSync(path.join(__dirname, 'keys'), { recursive: true });
fs.writeFileSync(path.join(__dirname, 'keys', 'public.pem'), publicPem);

// Store private key in receiver/backend/keys
const privatePem = pki.privateKeyToPem(keypair.privateKey);
fs.mkdirSync(path.resolve(__dirname, '../../receiver/backend/keys'), { recursive: true });
fs.writeFileSync(path.resolve(__dirname, '../../receiver/backend/keys/private.pem'), privatePem);

console.log('✅ Keys generated and distributed.');
