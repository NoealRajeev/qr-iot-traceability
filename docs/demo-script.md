# Demo Script: QR-Enabled IoT Traceability System

## Step-by-Step Demo Procedure

1. **Power on all hardware** (ESP32-CAM, NodeMCU, sensors, conveyor).
2. **Place a food pack** with QR label on the conveyor.
3. **Conveyor moves pack** to the scanning area.
4. **ESP32-CAM scans QR code** and checks label presence (TCRT5000).
5. **NodeMCU reads sensors** (DHT11, DS18B20) for ambient/cold chain data.
6. **Data sent to Next.js dashboard** (web app) via WiFi.
7. **Dashboard displays traceability info** (QR, timestamps, sensor data).
8. **Demonstrate error handling** (e.g., missing label, out-of-range temp).
9. **Show data logging** and traceability history in the dashboard.
