const mqtt = require('mqtt');
const forge = require('node-forge');
const axios = require('axios');
const dotenv = require('dotenv');
dotenv.config();

const senderCars = ['car1', 'car2'];

let currentPublicKey = null;
let currentCID = null;

const PINATA_GATEWAY = 'https://gateway.pinata.cloud/ipfs/';

async function fetchPublicKeyFromIPFS(cid) {
  try {
    const res = await axios.get(`${PINATA_GATEWAY}${cid}`);
    const pem = res.data.publicKey || res.data; 
    const cert = forge.pki.publicKeyFromPem(pem);
    return cert;
  } catch (err) {
    console.error('❌ Failed to fetch public key from IPFS:', err.message);
    return null;
  }
}

async function updatePublicKeyIfChanged() {
  try {
    const res = await axios.get('http://localhost:7070/public-key/receiver');
    const latestCID = res.data.ipfsHash;

    if (latestCID !== currentCID) {
      const pubKey = await fetchPublicKeyFromIPFS(latestCID);
      if (pubKey) {
        currentCID = latestCID;
        currentPublicKey = pubKey;
        console.log(`🔁 Updated public key from IPFS (CID: ${latestCID})`);
      }
    }
  } catch (err) {
    console.error('❌ Error fetching public key metadata:', err.message);
  }
}


setInterval(updatePublicKeyIfChanged, 3000);
updatePublicKeyIfChanged(); 

// MQTT Publisher
const client = mqtt.connect('mqtt://localhost:1883');
client.on('connect', () => {
  console.log('🚗 Publisher connected to MQTT broker');

  setInterval(() => {
    if (!currentPublicKey) {
      console.warn('⚠️ Public key not yet available. Skipping encryption.');
      return;
    }

    senderCars.forEach((carId) => {
      const topic = `car/${carId}/data`;

      const payload = {
        carId,
        timestamp: new Date().toISOString(),
        sensors: {
          temperature: (Math.random() * 40 + 10).toFixed(2),
          humidity: (Math.random() * 100).toFixed(2),
          speed: (Math.random() * 120).toFixed(2),
          battery: (Math.random() * 100).toFixed(2),
          pressure: (Math.random() * 50 + 950).toFixed(2),
        },
      };

      try {
        const encrypted = currentPublicKey.encrypt(JSON.stringify(payload), 'RSA-OAEP');
        const base64 = forge.util.encode64(encrypted);
        client.publish(topic, base64);

        console.log(`📤 Encrypted data from ${carId} to ${topic}`);
        // console.log(`📤 Encrypted data from ${carId} is ${base64}`);
      } catch (err) {
        console.error('❌ Encryption failed:', err.message);
      }
    });
  }, 1000);
});
