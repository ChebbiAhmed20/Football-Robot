#include "status_led.h"
#include <Arduino.h>

StatusLed::StatusLed() {}

void StatusLed::init() {
    pinMode(PIN_STATUS_LED, OUTPUT);
    digitalWrite(PIN_STATUS_LED, LOW);
    led_state_ = false;
    last_toggle_ms_ = 0;
}

void StatusLed::set_mode(LedMode mode) {
    if (mode_ == mode) return;
    mode_ = mode;

    if (mode_ == LedMode::STEADY_ON) {
        digitalWrite(PIN_STATUS_LED, HIGH);
        led_state_ = true;
    } else if (mode_ == LedMode::OFF) {
        digitalWrite(PIN_STATUS_LED, LOW);
        led_state_ = false;
    }
}

void StatusLed::update(uint32_t current_time_ms) {
    if (mode_ != LedMode::FAST_BLINK) {
        return;
    }

    // Toggle every 250 ms (2 Hz blink rate)
    if (current_time_ms - last_toggle_ms_ >= 250) {
        last_toggle_ms_ = current_time_ms;
        led_state_ = !led_state_;
        digitalWrite(PIN_STATUS_LED, led_state_ ? HIGH : LOW);
    }
}

