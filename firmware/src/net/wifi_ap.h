#pragma once

#include "config.h"

class WifiAccessPoint {
public:
    static bool init(const char* ssid = AP_SSID, const char* password = AP_PASS);
};
