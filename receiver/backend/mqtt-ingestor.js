const mqtt = require('mqtt');
const { Queue } = require('bullmq');
const Redis = require('ioredis');

const redisConnection = new Redis({ maxRetriesPerRequest: null });

function mqttIngestor() {
  const jobQueue = new Queue('sensor-data', { connection: redisConnection });
  const client = mqtt.connect('mqtt://localhost:1883');

  client.on('connect', () => {
    console.log('📡 MQTT Ingestor connected');
    client.subscribe('car/+/data');
  });

  client.on('message', async (topic, message) => {
    await jobQueue.add(
      'decrypt',
      {
        topic,
        payload: message.toString()
      },
      {
        attempts: 3, // Retry 3 times
        backoff: {
          type: 'exponential',
          delay: 2000
        }
      }
    );
    console.log(`🧾 Enqueued job from topic: ${topic}`);
  });
}

module.exports = mqttIngestor;
