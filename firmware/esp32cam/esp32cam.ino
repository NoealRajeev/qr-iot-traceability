#include "WiFi.h"
#include "WebServer.h"
#include "esp_camera.h"
#include "base64.h"

#define WIFI_SSID "YOUR_SSID"
#define WIFI_PASS "YOUR_PASS"

// AI-Thinker pin map
#define PWDN_GPIO_NUM 32
#define RESET_GPIO_NUM -1
#define XCLK_GPIO_NUM 0
#define SIOD_GPIO_NUM 26
#define SIOC_GPIO_NUM 27
#define Y9_GPIO_NUM 35
#define Y8_GPIO_NUM 34
#define Y7_GPIO_NUM 39
#define Y6_GPIO_NUM 36
#define Y5_GPIO_NUM 21
#define Y4_GPIO_NUM 19
#define Y3_GPIO_NUM 18
#define Y2_GPIO_NUM 5
#define VSYNC_GPIO_NUM 25
#define HREF_GPIO_NUM 23
#define PCLK_GPIO_NUM 22
#define FLASH_GPIO_NUM 4

WebServer server(80);
const char *API_BASE = "http://192.168.1.100:3000"; // Next.js
String deviceId = "ESP32CAM-1";

bool initCamera()
{
  camera_config_t c;
  c.ledc_channel = LEDC_CHANNEL_0;
  c.ledc_timer = LEDC_TIMER_0;
  c.pin_d0 = Y2_GPIO_NUM;
  c.pin_d1 = Y3_GPIO_NUM;
  c.pin_d2 = Y4_GPIO_NUM;
  c.pin_d3 = Y5_GPIO_NUM;
  c.pin_d4 = Y6_GPIO_NUM;
  c.pin_d5 = Y7_GPIO_NUM;
  c.pin_d6 = Y8_GPIO_NUM;
  c.pin_d7 = Y9_GPIO_NUM;
  c.pin_xclk = XCLK_GPIO_NUM;
  c.pin_pclk = PCLK_GPIO_NUM;
  c.pin_vsync = VSYNC_GPIO_NUM;
  c.pin_href = HREF_GPIO_NUM;
  c.pin_sccb_sda = SIOD_GPIO_NUM;
  c.pin_sccb_scl = SIOC_GPIO_NUM;
  c.pin_pwdn = PWDN_GPIO_NUM;
  c.pin_reset = RESET_GPIO_NUM;
  c.xclk_freq_hz = 20000000;
  c.pixel_format = PIXFORMAT_JPEG;
  // Use VGA or SVGA for better QR success
  c.frame_size = FRAMESIZE_VGA; // 640x480
  c.jpeg_quality = 12;
  c.fb_count = 1;

  esp_err_t err = esp_camera_init(&c);
  return (err == ESP_OK);
}

void postEvent(const String &lot, const uint8_t *buf, size_t len, const String &qs)
{
  // multipart/form-data POST to /api/event
  WiFiClient client;
  String host, path = "/api/event";
  // Simple HTTP/1.1 multipart build
  String boundary = "----cam" + String(millis());
  String start = "--" + boundary + "\r\n"
                                   "Content-Disposition: form-data; name=\"lotId\"\r\n\r\n" +
                 lot + "\r\n"
                       "--" +
                 boundary + "\r\n"
                            "Content-Disposition: form-data; name=\"type\"\r\n\r\nPASS\r\n";
  // Append optional fields from query string (pir, dist)
  start += "--" + boundary + "\r\nContent-Disposition: form-data; name=\"meta\"\r\n\r\n" + qs + "\r\n";
  String fileHdr = "--" + boundary + "\r\n"
                                     "Content-Disposition: form-data; name=\"photo\"; filename=\"snap.jpg\"\r\n"
                                     "Content-Type: image/jpeg\r\n\r\n";
  String end = "\r\n--" + boundary + "--\r\n";

  // Connect
  if (!client.connect("192.168.1.100", 3000))
    return;
  // Headers
  client.printf("POST %s HTTP/1.1\r\n", path.c_str());
  client.print("Host: 192.168.1.100\r\n");
  client.print("Connection: close\r\n");
  client.print("Content-Type: multipart/form-data; boundary=" + boundary + "\r\n");
  size_t contentLen = start.length() + fileHdr.length() + len + end.length();
  client.print("Content-Length: " + String(contentLen) + "\r\n\r\n");

  // Body
  client.print(start);
  client.print(fileHdr);
  client.write(buf, len);
  client.print(end);

  // Drain response
  while (client.connected() || client.available())
  {
    if (client.read() < 0)
      break;
  }
}

void handleCapture()
{
  String lot = server.hasArg("lot") ? server.arg("lot") : "UNKNOWN";
  String qs = server.hasArg("pir") || server.hasArg("dist") ? ("pir=" + server.arg("pir") + ",dist=" + server.arg("dist")) : "";
  // Optional: blink flash for feedback
  pinMode(FLASH_GPIO_NUM, OUTPUT);
  digitalWrite(FLASH_GPIO_NUM, HIGH);
  camera_fb_t *fb = esp_camera_fb_get();
  digitalWrite(FLASH_GPIO_NUM, LOW);

  if (!fb)
  {
    server.send(500, "text/plain", "Camera capture failed");
    return;
  }

  postEvent(lot, fb->buf, fb->len, qs);
  esp_camera_fb_return(fb);
  server.send(200, "text/plain", "OK");
}

void setup()
{
  pinMode(FLASH_GPIO_NUM, OUTPUT);
  digitalWrite(FLASH_GPIO_NUM, LOW);
  WiFi.begin(WIFI_SSID, WIFI_PASS);
  while (WiFi.status() != WL_CONNECTED)
  {
    delay(500);
  }
  initCamera();
  server.on("/capture", HTTP_GET, handleCapture);
  server.begin();
}

void loop() { server.handleClient(); }
