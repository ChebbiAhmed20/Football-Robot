#include "web.h"
#include <LittleFS.h>

WebServerManager::WebServerManager(AsyncWebServer* server) : server_(server) {}

bool WebServerManager::init() {
    if (!LittleFS.begin(true)) {
        return false;
    }

    if (server_ != nullptr) {
        // Serve static controller files from LittleFS with automatic gzip support
        server_->serveStatic("/", LittleFS, "/")
               .setDefaultFile("index.html")
               .setCacheControl("max-age=3600");

        server_->onNotFound([](AsyncWebServerRequest *request) {
            request->send(404, "text/plain", "404 Not Found on FootBot\n");
        });
    }

    return true;
}

