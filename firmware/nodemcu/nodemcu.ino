// ESP8266 NodeMCU – Sensors + Trigger
#include <ESP8266WiFi.h>
#include <ESP8266HTTPClient.h>
#include <OneWire.h>
#include <DallasTemperature.h>
#include "DHT.h"

#define WIFI_SSID     "YOUR_SSID"
#define WIFI_PASS     "YOUR_PASS"

#define PIN_DHT       D4          // GPIO2
#define DHTTYPE       DHT11
#define PIN_ONEWIRE   D2          // GPIO4
#define PIN_TRIG      D5          // GPIO14
#define PIN_ECHO      D6          // GPIO12 (via voltage divider!)
#define PIN_PIR       D7          // GPIO13

const char* ESP32CAM_HOST = "http://192.168.1.50";    // <-- set ESP32-CAM IP
const char* API_BASE      = "http://192.168.1.100:3000"; // Next.js dev server
const char* LOT_ID        = "L2409A";

DHT dht(PIN_DHT, DHTTYPE);
OneWire oneWire(PIN_ONEWIRE);
DallasTemperature ds18(&oneWire);

float readDistanceCm() {
  digitalWrite(PIN_TRIG, LOW); delayMicroseconds(3);
  digitalWrite(PIN_TRIG, HIGH); delayMicroseconds(10);
  digitalWrite(PIN_TRIG, LOW);
  long dur = pulseIn(PIN_ECHO, HIGH, 30000); // 30ms timeout (~5m)
  if (dur == 0) return 9999.0;               // timeout
  return dur / 58.0;                          // cm
}

void httpGET(const String& url) {
  HTTPClient http; WiFiClient client;
  if (http.begin(client, url)) { http.GET(); http.end(); }
}

void postJSON(const String& path, const String& json) {
  HTTPClient http; WiFiClient client;
  if (http.begin(client, String(API_BASE) + path)) {
    http.addHeader("Content-Type", "application/json");
    http.POST(json); http.end();
  }
}

void setup() {
  pinMode(PIN_TRIG, OUTPUT);
  pinMode(PIN_ECHO, INPUT);
  pinMode(PIN_PIR,  INPUT);
  dht.begin(); ds18.begin();

  WiFi.begin(WIFI_SSID, WIFI_PASS);
  while (WiFi.status() != WL_CONNECTED) { delay(500); }

  // Warm-up
  delay(1000);
}

unsigned long lastTelemetry = 0;
bool gateArmed = true;

void loop() {
  // Gate logic: detect pack near sensor
  float dist = readDistanceCm();
  bool pir  = digitalRead(PIN_PIR) == HIGH;

  if (gateArmed && dist > 0 && dist < 12.0) {  // threshold ~12 cm
    // Trigger ESP32-CAM capture (include lot, pir, and measured distance)
    String url = String(ESP32CAM_HOST) + "/capture?lot=" + LOT_ID +
                 "&pir=" + (pir ? "1":"0") + "&dist=" + String(dist,1);
    httpGET(url);
    gateArmed = false;                // simple debounce
  }
  if (dist > 20.0) gateArmed = true;  // re-arm when path clear

  // Periodic telemetry (every 30s)
  unsigned long now = millis();
  if (now - lastTelemetry > 30000) {
    float t = dht.readTemperature();
    float h = dht.readHumidity();
    ds18.requestTemperatures();
    float cold = ds18.getTempCByIndex(0);

    String env = String("{\"lotId\":\"") + LOT_ID +
                 "\",\"type\":\"line_env\",\"temp\":" + String(t,1) +
                 ",\"hum\":" + String(h,1) + "}";
    postJSON("/api/telemetry", env);

    String cb = String("{\"lotId\":\"") + LOT_ID +
                "\",\"type\":\"cold\",\"temp\":" + String(cold,1) + "}";
    postJSON("/api/telemetry", cb);

    lastTelemetry = now;
  }

  delay(50);
}
