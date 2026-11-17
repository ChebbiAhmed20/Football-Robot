#pragma once

#include <stdint.h>
#include <stddef.h>

enum class InMessageType {
    UNKNOWN,
    HELLO,
    DRIVE,
    SPIN,
    STOP,
    TURN,
    PING
};

enum class ParseError {
    NONE,
    BAD_MSG,
    TOO_LONG
};

struct InMessage {
    InMessageType type{InMessageType::UNKNOWN};
    uint32_t q{0};
    ParseError error{ParseError::NONE};

    // Fields by message type:
    // HELLO
    int32_t v{0};

    // DRIVE
    int8_t d{-1};
    float m{0.0f};
    uint8_t s{200};

    // SPIN
    int8_t r{0};

    // TURN
    int16_t a{0};

    // PING
    int32_t n{0};
};

enum class OutMessageType {
    HELLO,
    ACK,
    DONE,
    ERR,
    PONG,
    STATUS
};

struct OutMessage {
    OutMessageType type{OutMessageType::HELLO};
    uint32_t q{0};
    const char* err_code{nullptr}; // "bad_msg", "busy", "cancelled", "queue_full"
    int32_t n{0};                  // pong
    int32_t rssi{0};               // status
    uint32_t ms{0};                // status uptime
};
