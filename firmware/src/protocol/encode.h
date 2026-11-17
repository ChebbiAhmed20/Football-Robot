#pragma once

#include <stddef.h>
#include <stdint.h>
#include "config.h"

// Encodes hello message: {"t":"hello","v":4,"fw":"1.0.0"}
size_t encode_hello(char* buffer, size_t max_len, int version = PROTOCOL_VERSION, const char* fw = FW_VERSION);

// Encodes ack message: {"t":"ack","q":N}
size_t encode_ack(char* buffer, size_t max_len, uint32_t q);

// Encodes done message: {"t":"done","q":N}
size_t encode_done(char* buffer, size_t max_len, uint32_t q);

// Encodes error message: {"t":"err","q":N,"c":"..."}
size_t encode_err(char* buffer, size_t max_len, uint32_t q, const char* code);

// Encodes pong message: {"t":"pong","n":N}
size_t encode_pong(char* buffer, size_t max_len, int32_t n);

// Encodes status message: {"t":"status","rssi":N,"ms":N}
size_t encode_status(char* buffer, size_t max_len, int32_t rssi, uint32_t ms);

