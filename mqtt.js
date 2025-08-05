const mqtt = require('mqtt');

const brokerUrl = 'mqtt://localhost:1883';
const topic = 'random/number';

const client = mqtt.connect(brokerUrl);

client.on('connect', () => {
  console.log('📡 Connected to MQTT broker');

  setInterval(() => {
    const randomNum = Math.floor(Math.random() * 100); // 0–99
    const epochTime = Date.now() / 1000; // seconds

    const message = JSON.stringify({
      obj1: {
        time: +epochTime.toFixed(3),      // float epoch
        amplitude: randomNum              // random number
      }
    });

    client.publish(topic, message, { qos: 0 }, (err) => {
      if (err) {
        console.error('❌ Publish error:', err);
      } else {
        console.log('📤 Published:', message);
      }
    });
  }, 2000);
});
