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

---

## 🛠 Tech Stack

| Service       | Purpose                                      |
|---------------|----------------------------------------------|
| Node.js       | Microservices                                |
| Mosquitto     | MQTT Broker                                  |
| Redis + BullMQ| Job queue for incoming messages              |
| node-forge    | RSA encryption & certificate generation      |
| Pinata        | IPFS public key storage                      |
| Bull Board    | Redis job UI                                 |
| PM2 + Nginx   | Hosting & process manager (for EC2)          |

---

## 📁 Project Structure

SecureMqtt/
├── sender/ # Publisher encrypts and sends data
├── receiver/ # Receiver decrypts and processes data
├── pkiServer/ # Issues signed X.509 certs, uploads public keys to IPFS
├── certs/ # Generated certificates
├── ca/ # Certificate Authority keys


---

## 🚀 Features

- ✅ **PKI Auth & Encryption** using RSA (2048-bit)
- 🕒 **Key rotation every 2 minutes**
- 🔁 **Dual-key fallback** to prevent decryption failure mid-rotation
- 📡 **MQTT topics** like `car/car1/data`, `car/car2/data`
- 📥 **Redis Queue** for decoupling decryption and processing
- 🌍 **Public keys pinned to IPFS** using Pinata
- 📊 **Bull Board** for job monitoring at `/admin/queues`

---

## 🧪 How to Run (EC2 or Localhost)

### 1. Install Dependencies

sudo apt update && sudo apt install -y redis mosquitto
npm install

## Decentralized PKI and Messaging System
This project is a decentralized PKI and messaging system composed of three core services: a PKI server, a message receiver/decryptor, and a message sender/publisher.🚀 Getting Started1. Install DependenciesFirst, ensure you have the necessary dependencies by running these commands from the project root.# Install project dependencies
npm install

# Install nodemon globally for live reloading
npm install -g nodemon
2. Set Up Environment VariablesCreate a .env file inside the pkiServer/ directory and add your Pinata API keys.PINATA_API_KEY=your_pinata_api_key
PINATA_SECRET_API_KEY=your_pinata_secret
🏃 Running All ServicesTo run the full system, you will need to open three separate terminals (or use a tool like tmux) and start each service individually.
Terminal 1: PKI ServerStarts the PKI server on port 7070.cd pkiServer
nodemon index.js
Terminal 2: Receiver, Decryptor, and QueueStarts the receiver, decryptor, and the BullMQ job queue on port 5001.cd receiver
nodemon index.js
Terminal 3: Sender / PublisherStarts the sender/publisher service on port 5000.cd sender
nodemon index.js
## 🔒 Security NotesSecure Decryption: Only the receiver service has access to the private key and can decrypt messages.
# Key Rotation: The receiver automatically rotates certificates every 2 minutes and reloads the private key without a service restart.
# Public Key Retrieval: The sender checks IPFS for the latest public key every 3 seconds to stay up-to-date.Dual-Key Support: Decryption uses a dual-key fallback, which checks both the current and the previous key to handle messages sent during key rotation.
Local Management: No external database is used; certificates and keys are managed locally.
🖥️ EC2 Hosting NotesThis system can be hosted on a single EC2 instance.
Required Security Group PortsYou must open the following ports in your EC2 security group:Port Purpose 22 SSH 5000 Sender (HTTP)5001Receiver (HTTP + Bull Board UI)7070PKI Server1883MQTT Broker (internal use only)6379Redis (internal use only)Optional: Nginx ProxyFor a more secure setup, you can use Nginx to expose only ports 5001 (BullMQ) and 7070 (PKI Server) securely over HTTPS.✅ System StatusMQTT secure publisher is working.Receiver decrypts live messages successfully.Dual-key fallback is functioning smoothly.IPFS public key fetch logic is stable.BullMQ job queue and Bull Board UI are operational.Nodemon live reload is enabled for all services.
