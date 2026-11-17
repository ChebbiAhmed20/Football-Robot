#pragma once

#include "messages.h"
#include <stddef.h>

// Maximum allowed message length per PROTOCOL.md §2 (128 bytes)
constexpr size_t MAX_MESSAGE_SIZE = 128;

// Parses an incoming JSON message according to PROTOCOL.md v4.
// Enforces max message size, schema validation, range checks, and error tagging.
bool parse_incoming_message(const char* json_str, size_t length, InMessage& out_msg);
