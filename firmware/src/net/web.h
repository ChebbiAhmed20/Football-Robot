#pragma once

#include <ESPAsyncWebServer.h>
#include "config.h"

class WebServerManager {
public:
    explicit WebServerManager(AsyncWebServer* server);

    // Mounts LittleFS and registers static routes
    bool init();

private:
    AsyncWebServer* server_;
};

