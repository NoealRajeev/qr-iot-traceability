# QR-Enabled IoT Traceability System for Food Packs

Final-year IoT prototype that demonstrates **food pack traceability** using **QR codes, ESP32-CAM, NodeMCU (ESP8266)**, and a **Next.js dashboard**.

- **ESP32-CAM** → Captures images of packs at the gate (used for QR label verification).
- **NodeMCU (ESP8266)** → Reads environment sensors (DHT11, DS18B20, PIR, Ultrasonic) and controls a demo conveyor motor.
- **Next.js (TypeScript)** → Backend + Dashboard with Prisma (SQLite), APIs for events/telemetry, QR landing page, freshness scoring.

This project is designed as a **college IoT demo** with foam-board layout, cheap sensors, and minimal but realistic traceability flow.

---

## 📂 Repository Structure

```

qr-iot-traceability/
├─ firmware/
│  ├─ esp32cam/           # ESP32-CAM firmware (camera capture + HTTP server)
│  └─ nodemcu/            # NodeMCU firmware (DHT11, DS18B20, HC-SR04, PIR, motor)
├─ web/                   # Next.js 14 TypeScript app (dashboard + backend APIs)
│  ├─ app/                # App Router pages & APIs
│  ├─ prisma/             # Prisma schema + migrations
│  └─ lib/                # Freshness score logic
├─ docs/
│  ├─ bom.md              # Bill of Materials (components + sources in India)
│  └─ demo-script.md      # Step-by-step demo procedure
└─ README.md              # Full project guide (this file)

```

---

## 🛠 Hardware Setup

### Components

- **ESP32-CAM (AI-Thinker)** ×1
- **NodeMCU ESP8266** ×1
- **Sensors**:
  - DHT11 (ambient temp/humidity)
  - DS18B20 (cold box temp, waterproof probe)
  - HC-SR04 ultrasonic (pack detection at gate)
  - PIR motion sensor (operator presence)
- **Conveyor (optional but recommended)**
  - DC geared motor (3–6 V)
  - Motor driver (L9110S or L298N)
  - Belt substitute (rubber band + rollers on foam board)
- **Misc**
  - Foam board (demo layout)
  - Lunch box + ice pack (cold-chain demo)
  - QR labels printed on paper
  - Power supplies (2A for ESP32-CAM, 1–2A for NodeMCU + motor)
  - Jumper wires, breadboards, resistors (10kΩ, 20kΩ, 4.7kΩ)

### Wiring Summary

#### NodeMCU (all sensors + motor)

| Sensor/Actuator  | Pin (NodeMCU)   | Notes                      |
| ---------------- | --------------- | -------------------------- |
| DHT11 DATA       | **D4 (GPIO2)**  | Ambient temp/humidity      |
| DS18B20 DATA     | **D2 (GPIO4)**  | Add 4.7kΩ pull-up to 3.3V  |
| HC-SR04 TRIG     | **D5 (GPIO14)** | Output only                |
| HC-SR04 ECHO     | **D6 (GPIO12)** | Use 10k/20k divider → 3.3V |
| PIR OUT          | **D7 (GPIO13)** | Detect operator presence   |
| Motor driver INA | **D5 (GPIO14)** | Forward control            |
| Motor driver INB | **D6 (GPIO12)** | Reverse control            |

#### ESP32-CAM

- Runs **camera only** (no extra sensors).
- Exposes **HTTP `/capture`** endpoint to take JPEG snapshot.
- Posts captured image to **Next.js `/api/event`**.

#### Power

- **ESP32-CAM**: 5V / 2A supply (brownouts are common with weak supplies).
- **NodeMCU**: USB 5V (separate supply).
- **Motor driver**: Separate 5–6V supply for motor (share **GND** only).

---

## 💻 Firmware

### NodeMCU (ESP8266)

- Reads **DHT11, DS18B20, HC-SR04, PIR**.
- Detects pack with ultrasonic → triggers ESP32-CAM via HTTP GET.
- Sends telemetry every 30s to Next.js:
  - Ambient temp/humidity
  - Cold box temp
  - Operator presence

### ESP32-CAM

- Hosts a **tiny web server** (`/capture?lot=...`).
- On trigger from NodeMCU, captures **JPEG** and posts it to Next.js `/api/event`.
- Flash LED blinks on capture.

---

## 🌐 Next.js App

### Features

- **Public QR page (`/p/[lotId]`)**:
  - Shows product, lot, expiry
  - Displays freshness score (A–E)
  - Last few events + telemetry
- **Staff dashboard (`/dashboard/[lotId]`)**:
  - Timeline of events
  - Temperature & humidity charts
  - Last photo from ESP32-CAM
  - Recall simulation (CSV export)

### API Routes

- `POST /api/event` → save event, photo, label check (QR decode server-side)
- `POST /api/telemetry` → save telemetry (env/cold), recompute freshness
- `GET /api/lot/[id]` → public lot data

### Database (Prisma + SQLite)

```prisma
model Lot {
  id        String   @id
  product   String
  exp       DateTime
  events    Event[]
  telemetry Telemetry[]
  score     Score?
}

model Event {
  id       String   @id @default(cuid())
  lotId    String
  type     String   // PASS, PACKED, RECEIVED
  labelOk  Boolean?
  photoUrl String?
  ts       DateTime @default(now())
}

model Telemetry {
  id     String   @id @default(cuid())
  lotId  String
  kind   String   // "line_env" | "cold"
  temp   Float?
  hum    Float?
  ts     DateTime @default(now())
}

model Score {
  lotId       String @id
  freshness   String
  breaches    Int
  lastUpdated DateTime @default(now())
}
```

---

## ⚡ Freshness Score Algorithm

- Safe band for cold-chain: **2–8 °C**
- **A**: ≥95% samples in band
- **B**: 90–95%
- **C**: 80–90%
- **D**: <80%
- **E**: Continuous breach >30 min

---

## 🚀 Quick Start (Web Dashboard)

1. Install dependencies:

   ```bash
   cd web
   npm install
   ```

2. Run DB migrations:

   ```bash
   npx prisma migrate dev
   ```

3. Start server:

   ```bash
   npm run dev
   ```

4. Open [http://localhost:3000](http://localhost:3000).

---

## 📜 Demo Script (foam board prototype)

1. Place a cardboard “food pack” with QR at the **Pack & Label** station.
2. PIR detects operator presence (event logged).
3. Move pack into gate → HC-SR04 triggers → ESP32-CAM captures photo.
4. Server decodes QR → logs **PASS event** (`labelOk=true/false`).
5. DS18B20 in cold box measures temperature → if ice removed, **Freshness Score drops**.
6. Dashboard updates in real time with:

   - Timeline of events
   - Latest telemetry
   - Captured pack photo
   - Freshness score badge

7. Scan QR label on pack → public page shows trace + score.

---

## 🧑‍💻 Development Flow

- **Firmware**: Arduino IDE / PlatformIO

  - ESP8266 core for NodeMCU
  - ESP32 core for ESP32-CAM
  - Required libraries:

    - `DHT sensor library` (Adafruit)
    - `Adafruit Unified Sensor`
    - `OneWire`
    - `DallasTemperature`
    - `ESP8266WiFi`, `ESP8266HTTPClient` (bundled with ESP8266 core)
    - `WiFi`, `WebServer`, `esp_camera` (bundled with ESP32 core)

- **Web App**: Next.js 14, Prisma, SQLite

  - Prisma schema for lots, events, telemetry, scores
  - API routes to receive data from firmware
  - QR decode library (`@zxing/library`) to check labels

---

## ⚠️ Notes & Pitfalls

- ESP32-CAM needs a **5V/2A** stable supply (brownouts common).
- Tie all **grounds (GND)** together.
- HC-SR04 ECHO is **5V** → must level-shift to 3.3V.
- DS18B20 requires **4.7 kΩ pull-up resistor** on data line.
- DHT11 on GPIO2 (D4) is safe if left HIGH at boot.
- Keep motor driver power isolated; share only ground with NodeMCU.

---

## ✅ Deliverables

- **Working firmware** for ESP8266 & ESP32-CAM
- **Next.js dashboard** with QR landing + staff view
- **Demo-ready foam board** with conveyor, cold box, sensors
- **Documentation**: BOM + Demo script in `/docs`
