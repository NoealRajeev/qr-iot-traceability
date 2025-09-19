#include "WiFi.h"
#include "WebServer.h"
#include "esp_camera.h"
// #include "base64.h" // not needed here; remove if unused to save space

// ---------- WiFi ----------
#define WIFI_SSID "meti"
#define WIFI_PASS "12345678"

// ---------- Next.js server (change to your host/IP) ----------
const char* API_HOST = "10.36.70.95";
const uint16_t API_PORT = 3000;
const char* API_EVENT_PATH = "/api/event";

// ---------- Camera: AI-Thinker pin map ----------
#define PWDN_GPIO_NUM     32
#define RESET_GPIO_NUM    -1
#define XCLK_GPIO_NUM      0
#define SIOD_GPIO_NUM     26
#define SIOC_GPIO_NUM     27
#define Y9_GPIO_NUM       35
#define Y8_GPIO_NUM       34
#define Y7_GPIO_NUM       39
#define Y6_GPIO_NUM       36
#define Y5_GPIO_NUM       21
#define Y4_GPIO_NUM       19
#define Y3_GPIO_NUM       18
#define Y2_GPIO_NUM        5
#define VSYNC_GPIO_NUM    25
#define HREF_GPIO_NUM     23
#define PCLK_GPIO_NUM     22
#define FLASH_GPIO_NUM     4

WebServer server(80);
String deviceId = "ESP32CAM-1";

// ----------- Helpers -----------
static void logHeap(const char* tag) {
  Serial.printf("[%s] Free heap: %u bytes\n", tag, ESP.getFreeHeap());
}

bool initCamera() {
  camera_config_t c;
  c.ledc_channel = LEDC_CHANNEL_0;
  c.ledc_timer   = LEDC_TIMER_0;
  c.pin_d0 = Y2_GPIO_NUM;  c.pin_d1 = Y3_GPIO_NUM;  c.pin_d2 = Y4_GPIO_NUM;
  c.pin_d3 = Y5_GPIO_NUM;  c.pin_d4 = Y6_GPIO_NUM;  c.pin_d5 = Y7_GPIO_NUM;
  c.pin_d6 = Y8_GPIO_NUM;  c.pin_d7 = Y9_GPIO_NUM;
  c.pin_xclk = XCLK_GPIO_NUM; c.pin_pclk = PCLK_GPIO_NUM; c.pin_vsync = VSYNC_GPIO_NUM;
  c.pin_href = HREF_GPIO_NUM; c.pin_sccb_sda = SIOD_GPIO_NUM; c.pin_sccb_scl = SIOC_GPIO_NUM;
  c.pin_pwdn = PWDN_GPIO_NUM; c.pin_reset = RESET_GPIO_NUM;

  // Image params
  c.xclk_freq_hz = 20000000;
  c.pixel_format = PIXFORMAT_JPEG;
  c.frame_size   = FRAMESIZE_VGA;     // 640x480 (try SVGA for more detail)
  c.jpeg_quality = 12;                // 10–20 is fine; lower = better quality
  c.fb_count     = 1;

  Serial.println("[cam] Initializing camera...");
  esp_err_t err = esp_camera_init(&c);
  if (err != ESP_OK) {
    Serial.printf("[cam][ERR] esp_camera_init failed: 0x%X\n", err);
    return false;
  }
  sensor_t* s = esp_camera_sensor_get();
  if (s) {
    Serial.printf("[cam] Sensor found. PID: 0x%X\n", s->id.PID);
  }
  return true;
}

void postEvent(const String& lot, const uint8_t* buf, size_t len, const String& metaQS) {
  WiFiClient client;
  const String boundary = "----cam" + String(millis());

  // Build multipart body segments
  String part1 = "--" + boundary + "\r\n"
                 "Content-Disposition: form-data; name=\"lotId\"\r\n\r\n" + lot + "\r\n"
                 "--" + boundary + "\r\n"
                 "Content-Disposition: form-data; name=\"type\"\r\n\r\nPASS\r\n";

  String partMeta = "--" + boundary + "\r\n"
                    "Content-Disposition: form-data; name=\"meta\"\r\n\r\n" + metaQS + "\r\n";

  String fileHdr = "--" + boundary + "\r\n"
                   "Content-Disposition: form-data; name=\"photo\"; filename=\"snap.jpg\"\r\n"
                   "Content-Type: image/jpeg\r\n\r\n";

  String end = "\r\n--" + boundary + "--\r\n";

  size_t contentLen = part1.length() + partMeta.length() + fileHdr.length() + len + end.length();

  Serial.printf("[post] Connecting to %s:%u ...\n", API_HOST, API_PORT);
  if (!client.connect(API_HOST, API_PORT)) {
    Serial.println("[post][ERR] Connection failed");
    return;
  }

  // Request line + headers
  client.printf("POST %s HTTP/1.1\r\n", API_EVENT_PATH);
  client.printf("Host: %s\r\n", API_HOST);
  client.print("Connection: close\r\n");
  client.print("Content-Type: multipart/form-data; boundary=" + boundary + "\r\n");
  client.print("Content-Length: " + String(contentLen) + "\r\n\r\n");

  // Body
  client.print(part1);
  client.print(partMeta);
  client.print(fileHdr);
  client.write(buf, len);
  client.print(end);

  // Read response (non-blocking-ish)
  unsigned long startMs = millis();
  String resp;
  while (millis() - startMs < 5000) {   // 5s window
    while (client.available()) {
      char c = client.read();
      resp += c;
    }
    if (!client.connected()) break;
    delay(10);
  }
  client.stop();

  // Log first line of response
  int eol = resp.indexOf("\r\n");
  String firstLine = (eol > 0) ? resp.substring(0, eol) : resp;
  Serial.printf("[post] Response: %s\n", firstLine.c_str());
}

void handleCapture() {
  String lot = server.hasArg("lot") ? server.arg("lot") : "UNKNOWN";
  String qs  = (server.hasArg("pir") || server.hasArg("dist"))
               ? ("pir=" + server.arg("pir") + ",dist=" + server.arg("dist"))
               : "";

  Serial.printf("[http] /capture lot=%s meta=%s\n", lot.c_str(), qs.c_str());

  // flash on
  pinMode(FLASH_GPIO_NUM, OUTPUT);
  digitalWrite(FLASH_GPIO_NUM, HIGH);
  camera_fb_t* fb = esp_camera_fb_get();
  digitalWrite(FLASH_GPIO_NUM, LOW);   // flash off

  if (!fb) {
    Serial.println("[cap][ERR] Camera capture failed");
    server.send(500, "text/plain", "Camera capture failed");
    return;
  }

  Serial.printf("[cap] Captured %ux%u JPEG (%u bytes)\n", fb->width, fb->height, fb->len);
  logHeap("before POST");
  postEvent(lot, fb->buf, fb->len, qs);
  logHeap("after POST");
  esp_camera_fb_return(fb);
  server.send(200, "text/plain", "OK");
}

void waitForWiFi() {
  Serial.printf("[wifi] Connecting to SSID: %s\n", WIFI_SSID);
  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASS);

  uint8_t tries = 0;
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
    if (++tries >= 60) {         // ~30s timeout
      Serial.println("\n[wifi][WARN] WiFi connect timeout, retrying...");
      WiFi.disconnect(true);
      delay(500);
      WiFi.begin(WIFI_SSID, WIFI_PASS);
      tries = 0;
    }
  }
  Serial.println();
  Serial.printf("[wifi] Connected. IP: %s, RSSI: %d dBm\n",
                WiFi.localIP().toString().c_str(), WiFi.RSSI());
}

void setup() {
  Serial.begin(115200);
  Serial.setDebugOutput(false);
  delay(200);

  pinMode(FLASH_GPIO_NUM, OUTPUT);
  digitalWrite(FLASH_GPIO_NUM, LOW);

  waitForWiFi();

  if (!initCamera()) {
    Serial.println("[cam][FATAL] Camera init failed. Rebooting in 5s...");
    delay(5000);
    ESP.restart();
  }

  server.on("/capture", HTTP_GET, handleCapture);
  server.onNotFound([](){
    server.send(404, "text/plain", "Not Found");
  });
  server.begin();

  Serial.println("[http] Server started");
  Serial.printf("[http] Try: http://%s/capture?lot=L2409A&pir=1&dist=11.8\n",
                WiFi.localIP().toString().c_str());
  logHeap("boot");
}

void loop() {
  server.handleClient();

  // Optional: reconnect if WiFi drops
  static unsigned long lastCheck = 0;
  if (millis() - lastCheck > 5000) {
    if (WiFi.status() != WL_CONNECTED) {
      Serial.println("[wifi][WARN] Disconnected. Reconnecting...");
      waitForWiFi();
    }
    lastCheck = millis();
  }
}
