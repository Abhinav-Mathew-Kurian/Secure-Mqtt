# 🔐 Secure MQTT IoT System with PKI, IPFS, Redis, and BullMQ

This project is a secure microservice-based MQTT communication system built using **Node.js**, **Mosquitto**, **Redis (BullMQ)**, and **X.509 PKI certificates**. It supports:

- 🔑 Certificate-based encryption/decryption (RSA)
- 🔁 Key rotation every 2 minutes
- 📦 Public key storage on **IPFS (via Pinata)**
- 💥 Dual-key decryption fallback to avoid message loss
- 📊 Background job processing with Redis & BullMQ
- 🧠 No external DB used – all certs & keys are handled in memory or filesystem

---

## 🌐 System Architecture

