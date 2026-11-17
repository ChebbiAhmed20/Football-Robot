#include "encode.h"
#include <cstdio>

size_t encode_hello(char* buffer, size_t max_len, int version, const char* fw) {
    if (!buffer || max_len == 0) return 0;
    int written = std::snprintf(buffer, max_len, "{\"t\":\"hello\",\"v\":%d,\"fw\":\"%s\"}", version, fw ? fw : "1.0.0");
    return (written > 0 && static_cast<size_t>(written) < max_len) ? static_cast<size_t>(written) : 0;
}

size_t encode_ack(char* buffer, size_t max_len, uint32_t q) {
    if (!buffer || max_len == 0) return 0;
    int written = std::snprintf(buffer, max_len, "{\"t\":\"ack\",\"q\":%u}", q);
    return (written > 0 && static_cast<size_t>(written) < max_len) ? static_cast<size_t>(written) : 0;
}

size_t encode_done(char* buffer, size_t max_len, uint32_t q) {
    if (!buffer || max_len == 0) return 0;
    int written = std::snprintf(buffer, max_len, "{\"t\":\"done\",\"q\":%u}", q);
    return (written > 0 && static_cast<size_t>(written) < max_len) ? static_cast<size_t>(written) : 0;
}

size_t encode_err(char* buffer, size_t max_len, uint32_t q, const char* code) {
    if (!buffer || max_len == 0) return 0;
    int written = std::snprintf(buffer, max_len, "{\"t\":\"err\",\"q\":%u,\"c\":\"%s\"}", q, code ? code : "bad_msg");
    return (written > 0 && static_cast<size_t>(written) < max_len) ? static_cast<size_t>(written) : 0;
}

size_t encode_pong(char* buffer, size_t max_len, int32_t n) {
    if (!buffer || max_len == 0) return 0;
    int written = std::snprintf(buffer, max_len, "{\"t\":\"pong\",\"n\":%d}", n);
    return (written > 0 && static_cast<size_t>(written) < max_len) ? static_cast<size_t>(written) : 0;
}

size_t encode_status(char* buffer, size_t max_len, int32_t rssi, uint32_t ms) {
    if (!buffer || max_len == 0) return 0;
    int written = std::snprintf(buffer, max_len, "{\"t\":\"status\",\"rssi\":%d,\"ms\":%u}", rssi, ms);
    return (written > 0 && static_cast<size_t>(written) < max_len) ? static_cast<size_t>(written) : 0;
}
