const express = require('express');
const app = express();
const PORT = 5000;

// Start MQTT publisher
require('./publisher');

app.get('/', (req, res) => {
  res.send('Sender service is running');
});

app.listen(PORT, () => {
  console.log(`🚀 Sender server running on http://localhost:${PORT}`);
});
