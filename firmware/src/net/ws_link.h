#pragma once

#include <ESPAsyncWebServer.h>
#include <freertos/FreeRTOS.h>
#include <freertos/queue.h>
#include "protocol/messages.h"
#include "protocol/parse.h"
#include "protocol/encode.h"
#include "config.h"

struct WsEvent {
    enum Type {
        CONNECTED,
        DISCONNECTED,
        MESSAGE
    } type;
    InMessage msg;
};

class WsLink {
public:
    explicit WsLink(const char* path = WS_PATH);

    bool init(AsyncWebServer* server);

    // Pops an event received from network task into the control loop.
    bool pop_event(WsEvent& out_event);

    // Sends a text message to the active connected client
    bool send_text(const char* text);

    // Helper message encoders
    bool send_hello(int version = PROTOCOL_VERSION, const char* fw = FW_VERSION);
    bool send_ack(uint32_t q);
    bool send_done(uint32_t q);
    bool send_err(uint32_t q, const char* code);
    bool send_pong(int32_t n);
    bool send_status(int32_t rssi, uint32_t ms);

    bool has_active_client() const { return active_client_id_ != 0; }
    uint32_t get_active_client_id() const { return active_client_id_; }

private:
    void handle_event(AsyncWebSocket *server, AsyncWebSocketClient *client,
                      AwsEventType type, void *arg, uint8_t *data, size_t len);

    AsyncWebSocket ws_;
    uint32_t active_client_id_{0};
    QueueHandle_t rx_queue_{nullptr};
    char tx_buffer_[MAX_MESSAGE_SIZE + 1]{0};
};

