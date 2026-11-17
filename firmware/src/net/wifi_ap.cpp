#include "wifi_ap.h"
#include <WiFi.h>

bool WifiAccessPoint::init(const char* ssid, const char* password) {
    WiFi.mode(WIFI_AP);

    IPAddress local_ip(192, 168, 4, 1);
    IPAddress gateway(192, 168, 4, 1);
    IPAddress subnet(255, 255, 255, 0);

    WiFi.softAPConfig(local_ip, gateway, subnet);
    return WiFi.softAP(ssid, password);
}

