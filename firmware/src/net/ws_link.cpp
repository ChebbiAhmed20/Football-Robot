#include "ws_link.h"

WsLink::WsLink(const char* path) : ws_(path) {
    rx_queue_ = xQueueCreate(16, sizeof(WsEvent));
}

bool WsLink::init(AsyncWebServer* server) {
    if (!server || !rx_queue_) {
        return false;
    }

    ws_.onEvent([this](AsyncWebSocket *s, AsyncWebSocketClient *c, AwsEventType t, void *arg, uint8_t *d, size_t l) {
        this->handle_event(s, c, t, arg, d, l);
    });

    server->addHandler(&ws_);
    return true;
}

void WsLink::handle_event(AsyncWebSocket *server, AsyncWebSocketClient *client,
                          AwsEventType type, void *arg, uint8_t *data, size_t len) {
    if (!client) return;

    if (type == WS_EVT_CONNECT) {
        if (active_client_id_ == 0) {
            // Accept primary client
            active_client_id_ = client->id();
            WsEvent evt;
            evt.type = WsEvent::CONNECTED;
            xQueueSend(rx_queue_, &evt, 0);
        } else {
            // Reject second concurrent client (PROTOCOL.md §1 & §10)
            client->close(4001, "Already connected");
        }
    } else if (type == WS_EVT_DISCONNECT) {
        if (client->id() == active_client_id_) {
            active_client_id_ = 0;
            WsEvent evt;
            evt.type = WsEvent::DISCONNECTED;
            xQueueSend(rx_queue_, &evt, 0);
        }
    } else if (type == WS_EVT_DATA) {
        if (client->id() != active_client_id_) {
            return;
        }

        AwsFrameInfo *info = (AwsFrameInfo*)arg;
        if (info->final && info->index == 0 && info->len == len && info->opcode == WS_TEXT) {
            WsEvent evt;
            evt.type = WsEvent::MESSAGE;
            parse_incoming_message((const char*)data, len, evt.msg);
            xQueueSend(rx_queue_, &evt, 0);
        }
    }
}

bool WsLink::pop_event(WsEvent& out_event) {
    if (!rx_queue_) return false;
    return xQueueReceive(rx_queue_, &out_event, 0) == pdTRUE;
}

bool WsLink::send_text(const char* text) {
    if (active_client_id_ == 0 || !text) return false;
    AsyncWebSocketClient* client = ws_.client(active_client_id_);
    if (client && client->status() == WS_CONNECTED) {
        client->text(text);
        return true;
    }
    return false;
}

bool WsLink::send_hello(int version, const char* fw) {
    encode_hello(tx_buffer_, sizeof(tx_buffer_), version, fw);
    return send_text(tx_buffer_);
}

bool WsLink::send_ack(uint32_t q) {
    encode_ack(tx_buffer_, sizeof(tx_buffer_), q);
    return send_text(tx_buffer_);
}

bool WsLink::send_done(uint32_t q) {
    encode_done(tx_buffer_, sizeof(tx_buffer_), q);
    return send_text(tx_buffer_);
}

bool WsLink::send_err(uint32_t q, const char* code) {
    encode_err(tx_buffer_, sizeof(tx_buffer_), q, code);
    return send_text(tx_buffer_);
}

bool WsLink::send_pong(int32_t n) {
    encode_pong(tx_buffer_, sizeof(tx_buffer_), n);
    return send_text(tx_buffer_);
}

bool WsLink::send_status(int32_t rssi, uint32_t ms) {
    encode_status(tx_buffer_, sizeof(tx_buffer_), rssi, ms);
    return send_text(tx_buffer_);
}
