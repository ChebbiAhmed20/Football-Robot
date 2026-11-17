#pragma once

#include <stdint.h>
#include "config.h"

enum class LedMode {
    FAST_BLINK, // No controller connected (~2 Hz)
    STEADY_ON,  // Controller connected
    OFF
};

class StatusLed {
public:
    StatusLed();

    void init();
    void set_mode(LedMode mode);
    void update(uint32_t current_time_ms);

private:
    LedMode mode_{LedMode::FAST_BLINK};
    uint32_t last_toggle_ms_{0};
    bool led_state_{false};
};
