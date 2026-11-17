#include "motors.h"
#include <Arduino.h>
#include <algorithm>

MotorDriver::MotorDriver() {}

void MotorDriver::init() {
    // 1. Immediately drive all directional pins LOW before setting pin modes
    digitalWrite(PIN_IN1, LOW);
    digitalWrite(PIN_IN2, LOW);
    digitalWrite(PIN_IN3, LOW);
    digitalWrite(PIN_IN4, LOW);

    pinMode(PIN_IN1, OUTPUT);
    pinMode(PIN_IN2, OUTPUT);
    pinMode(PIN_IN3, OUTPUT);
    pinMode(PIN_IN4, OUTPUT);

    // 2. Configure ESP32 LEDC PWM channels (Arduino Core 2.x isolated here)
    ledcSetup(LEDC_CHANNEL_LEFT, PWM_FREQ, PWM_BITS);
    ledcSetup(LEDC_CHANNEL_RIGHT, PWM_FREQ, PWM_BITS);

    ledcAttachPin(PIN_ENA, LEDC_CHANNEL_LEFT);
    ledcAttachPin(PIN_ENB, LEDC_CHANNEL_RIGHT);

    // 3. Ensure zero PWM at boot
    ledcWrite(LEDC_CHANNEL_LEFT, 0);
    ledcWrite(LEDC_CHANNEL_RIGHT, 0);
}

void MotorDriver::set(int16_t left, int16_t right) {
    // Cap at PWM_CAP
    int16_t cap = PWM_CAP;
    left = std::max(static_cast<int16_t>(-cap), std::min(cap, left));
    right = std::max(static_cast<int16_t>(-cap), std::min(cap, right));

    // Left Motor (PROTOCOL.md §8: Positive PWM = Forward)
    if (left > 0) {
        digitalWrite(PIN_IN1, HIGH);
        digitalWrite(PIN_IN2, LOW);
        ledcWrite(LEDC_CHANNEL_LEFT, static_cast<uint32_t>(left));
    } else if (left < 0) {
        digitalWrite(PIN_IN1, LOW);
        digitalWrite(PIN_IN2, HIGH);
        ledcWrite(LEDC_CHANNEL_LEFT, static_cast<uint32_t>(-left));
    } else {
        digitalWrite(PIN_IN1, LOW);
        digitalWrite(PIN_IN2, LOW);
        ledcWrite(LEDC_CHANNEL_LEFT, 0);
    }

    // Right Motor (PROTOCOL.md §8: Positive PWM = Forward)
    if (right > 0) {
        digitalWrite(PIN_IN3, HIGH);
        digitalWrite(PIN_IN4, LOW);
        ledcWrite(LEDC_CHANNEL_RIGHT, static_cast<uint32_t>(right));
    } else if (right < 0) {
        digitalWrite(PIN_IN3, LOW);
        digitalWrite(PIN_IN4, HIGH);
        ledcWrite(LEDC_CHANNEL_RIGHT, static_cast<uint32_t>(-right));
    } else {
        digitalWrite(PIN_IN3, LOW);
        digitalWrite(PIN_IN4, LOW);
        ledcWrite(LEDC_CHANNEL_RIGHT, 0);
    }
}

void MotorDriver::stop() {
    set(0, 0);
}

