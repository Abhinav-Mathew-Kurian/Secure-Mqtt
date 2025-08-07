const express = require('express');
const fs = require('fs'); 
const path = require('path'); 
const axios = require('axios'); 
const forge = require('node-forge'); 
const { Queue } = require('bullmq');
const { ExpressAdapter } = require('@bull-board/express');
const { createBullBoard } = require('@bull-board/api');
const { BullMQAdapter } = require('@bull-board/api/bullMQAdapter');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const mqttIngestor = require('./mqtt-ingestor');
const startWorker = require('./decryptor-worker');
require('./key-rotation-worker');

const app = express();
const PORT = 5001;
const keysPath = path.join(__dirname, 'keys');
const deviceId = 'receiver';
app.use(cors({
  origin: "http://localhost:5173", 
  methods: ["GET", "POST"]
}));
// Bull Board UI setup
const sensorQueue = new Queue('sensor-data', {
  connection: {
    host: '127.0.0.1',
    port: 6379,
    maxRetriesPerRequest: null,
  }
});

const serverAdapter = new ExpressAdapter();
serverAdapter.setBasePath('/admin/queues');
createBullBoard({
  queues: [new BullMQAdapter(sensorQueue)],
  serverAdapter,
});
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*', 
    methods: ['GET', 'POST']
  }
});



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
app.use('/admin/queues', serverAdapter.getRouter());

app.get('/', (req, res) => {
  res.send('Receiver is running with BullMQ.');
});

server.listen(PORT, async () => {
  console.log(`📥 Receiver server running at http://localhost:${PORT}`);
  console.log(`📊 Bull Board UI at http://localhost:${PORT}/admin/queues`);

  await setupKeys();

  mqttIngestor();
  startWorker(io);
});
