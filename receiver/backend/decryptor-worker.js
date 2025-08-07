const forge = require('node-forge');
const fs = require('fs');
const path = require('path');
const Redis = require('ioredis');
const { Worker } = require('bullmq');

const redisConnection = new Redis({ maxRetriesPerRequest: null });

const keysPath = path.join(__dirname, 'keys');
const privateKeyPath = path.join(keysPath, 'private.pem');

let currentPrivateKey = null;
let previousPrivateKey = null;

// Load and set the private key
function loadPrivateKey() {
  try {
    const privatePem = fs.readFileSync(privateKeyPath, 'utf8');
    const newKey = forge.pki.privateKeyFromPem(privatePem);

    if (currentPrivateKey) {
      previousPrivateKey = currentPrivateKey; // Backup old key
    }

    currentPrivateKey = newKey;
    console.log('🔁 Private key reloaded (dual-key ready)');
  } catch (err) {
    console.error('❌ Failed to load private key:', err.message);
  }
}

// Watch for private key changes (hot reload)
fs.watchFile(privateKeyPath, { interval: 1000 }, (curr, prev) => {
  if (curr.mtime !== prev.mtime) {
    loadPrivateKey();
  }
});

// Try to decrypt with current key, fallback to previous if needed
function tryDecrypt(payload) {
  const binary = forge.util.decode64(payload);

  try {
    return currentPrivateKey.decrypt(binary, 'RSA-OAEP');
  } catch (err1) {
    if (previousPrivateKey) {
      try {
        console.warn('⚠️ Fallback to previous key for decryption');
        return previousPrivateKey.decrypt(binary, 'RSA-OAEP');
      } catch (err2) {
        throw new Error('Decryption failed with both keys');
      }
    } else {
      throw new Error('Decryption failed with current key (no fallback)');
    }
  }
}

// Start BullMQ worker for decryption
function startWorker(io) {
  if (!fs.existsSync(privateKeyPath)) {
    console.error('❌ Private key not found. Run setupKeys() first.');
    return;
  }

  loadPrivateKey();

  new Worker(
    'sensor-data',
    async (job) => {
      const { topic, payload } = job.data;

      try {
        const decrypted = tryDecrypt(payload);
        const data = JSON.parse(decrypted);

        console.log(`✅ Decrypted payload from ${topic}:`, data);

        // Emit live data to frontend
        if (io) {
          io.emit('sensor-data', {
            topic,
            ...data,
          });
        }
      } catch (err) {
        console.error(`❌ Failed to decrypt: ${err.message}`);
      }
    },
    { connection: redisConnection }
  );

  console.log('🛠️  Decryption worker running with dual-key fallback');
}

module.exports = startWorker;
