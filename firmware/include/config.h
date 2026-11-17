#pragma once

#include <stdint.h>

// FootBot Configuration
// All pins, timings and constants live here. No magic numbers elsewhere.

// Protocol & Identity
#define PROTOCOL_VERSION 4
#define FW_VERSION "1.0.0"

// Wi-Fi Access Point
#define AP_SSID "FootBot"
#define AP_PASS "footbot123"
#define AP_IP_STR "192.168.4.1"
#define WS_PATH "/ws"
#define HTTP_PORT 80

// Pin Mapping (PROTOCOL.md §12)
#define PIN_ENA 25       // Left motor PWM
#define PIN_IN1 26       // Left direction 1
#define PIN_IN2 27       // Left direction 2
#define PIN_IN3 32       // Right direction 1
#define PIN_IN4 33       // Right direction 2
#define PIN_ENB 13       // Right motor PWM
#define PIN_STATUS_LED 2 // Onboard LED

// Motor & PWM Settings
#define PWM_FREQ 1000     // 1 kHz
#define PWM_BITS 8        // 8-bit resolution (0..255)
#define MIN_PWM 70        // Minimum PWM threshold to overcome TT motor stall
#define PWM_CAP 255       // Firmware-side upper limit for motor PWM

// Safety & Watchdogs
#define FAILSAFE_MS 800   // Motors stop if no message arrives in 800 ms
#define STATUS_INTERVAL_MS 500 // Broadcast robot status every 500 ms
#define MAX_EVENT_QUEUE 8 // Max pending events in queue

// Timed Turn Calibration (PROTOCOL.md §6.4)
#define TURN_PWM 200
#define TURN_MS_PER_DEG_RIGHT 4.5f
#define TURN_MS_PER_DEG_LEFT 4.5f

