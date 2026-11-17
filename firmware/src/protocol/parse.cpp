#include "parse.h"
#include <ArduinoJson.h>
#include <cstring>
#include <algorithm>

bool parse_incoming_message(const char* json_str, size_t length, InMessage& out_msg) {
    out_msg = InMessage{};

    if (json_str == nullptr || length == 0) {
        out_msg.error = ParseError::BAD_MSG;
        return false;
    }

    if (length > MAX_MESSAGE_SIZE) {
        out_msg.error = ParseError::TOO_LONG;
        return false;
    }

    JsonDocument doc;
    DeserializationError err = deserializeJson(doc, json_str, length);
    if (err) {
        out_msg.error = ParseError::BAD_MSG;
        return false;
    }

    const char* t = doc["t"];
    if (t == nullptr) {
        out_msg.error = ParseError::BAD_MSG;
        return false;
    }

    // Ping message does not require sequence number q
    if (std::strcmp(t, "ping") == 0) {
        if (!doc["n"].is<int32_t>()) {
            out_msg.error = ParseError::BAD_MSG;
            return false;
        }
        out_msg.type = InMessageType::PING;
        out_msg.n = doc["n"].as<int32_t>();
        if (doc["q"].is<uint32_t>()) {
            out_msg.q = doc["q"].as<uint32_t>();
        }
        return true;
    }

    // Hello message does not require sequence number q
    if (std::strcmp(t, "hello") == 0) {
        if (!doc["v"].is<int32_t>()) {
            out_msg.error = ParseError::BAD_MSG;
            return false;
        }
        out_msg.type = InMessageType::HELLO;
        out_msg.v = doc["v"].as<int32_t>();
        return true;
    }

    // All other commands require positive sequence number q (PROTOCOL.md §4)
    if (!doc["q"].is<uint32_t>() || doc["q"].as<uint32_t>() == 0) {
        out_msg.error = ParseError::BAD_MSG;
        return false;
    }
    out_msg.q = doc["q"].as<uint32_t>();

    if (std::strcmp(t, "drive") == 0) {
        if (!doc["d"].is<int>() || !doc["m"].is<float>() || !doc["s"].is<int>()) {
            out_msg.error = ParseError::BAD_MSG;
            return false;
        }
        int d = doc["d"].as<int>();
        if (d < -1 || d > 15) {
            out_msg.error = ParseError::BAD_MSG;
            return false;
        }
        float m = doc["m"].as<float>();
        m = std::max(0.0f, std::min(1.0f, m));

        int s = doc["s"].as<int>();
        s = std::max(80, std::min(255, s));

        out_msg.type = InMessageType::DRIVE;
        out_msg.d = static_cast<int8_t>(d);
        out_msg.m = m;
        out_msg.s = static_cast<uint8_t>(s);
        return true;
    }

    if (std::strcmp(t, "spin") == 0) {
        if (!doc["r"].is<int>() || !doc["s"].is<int>()) {
            out_msg.error = ParseError::BAD_MSG;
            return false;
        }
        int r = doc["r"].as<int>();
        if (r != -1 && r != 0 && r != 1) {
            out_msg.error = ParseError::BAD_MSG;
            return false;
        }
        int s = doc["s"].as<int>();
        s = std::max(80, std::min(255, s));

        out_msg.type = InMessageType::SPIN;
        out_msg.r = static_cast<int8_t>(r);
        out_msg.s = static_cast<uint8_t>(s);
        return true;
    }

    if (std::strcmp(t, "stop") == 0) {
        out_msg.type = InMessageType::STOP;
        return true;
    }

    if (std::strcmp(t, "turn") == 0) {
        if (!doc["a"].is<int>()) {
            out_msg.error = ParseError::BAD_MSG;
            return false;
        }
        int a = doc["a"].as<int>();
        if (a != 90 && a != -90 && a != 180 && a != -180) {
            out_msg.error = ParseError::BAD_MSG;
            return false;
        }
        out_msg.type = InMessageType::TURN;
        out_msg.a = static_cast<int16_t>(a);
        if (doc["s"].is<int>()) {
            int s = doc["s"].as<int>();
            out_msg.s = static_cast<uint8_t>(std::max(80, std::min(255, s)));
        }
        return true;
    }

    // Unknown command type
    out_msg.type = InMessageType::UNKNOWN;
    out_msg.error = ParseError::BAD_MSG;
    return false;
}

