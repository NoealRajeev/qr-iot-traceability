# QR-Enabled IoT Traceability System

Prototype IoT system for food pack traceability using QR codes, ESP32-CAM, NodeMCU, and a Next.js dashboard.

## Repository Structure

```
qr-iot-traceability/
├─ firmware/
│  ├─ esp32cam/.keep      # ESP32-CAM firmware (empty, tracked by .keep)
│  └─ nodemcu/.keep       # NodeMCU firmware (empty, tracked by .keep)
├─ web/                   # Next.js 14 TypeScript app (dashboard/backend)
├─ docs/
│  ├─ bom.md              # Bill of Materials
│  └─ demo-script.md      # Demo procedure
└─ README.md              # Project overview & instructions
```

## Quick Start (Web Dashboard)

1. Install dependencies:
   ```bash
   cd web
   npm install
   ```
2. Run database migrations:
   ```bash
   npx prisma migrate dev
   ```
3. Start the development server:
   ```bash
   npm run dev
   ```

## About

- **ESP32-CAM**: QR code scanning, label check (TCRT5000), break-beam sensor
- **NodeMCU (ESP8266)**: DHT11/DS18B20 sensors, conveyor control
- **Next.js App**: Dashboard, backend API, data logging (Prisma/SQLite)

See `docs/` for BOM and demo instructions.
