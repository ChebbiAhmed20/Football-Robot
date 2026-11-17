#pragma once

#include <stdint.h>
#include "config.h"

class MotorDriver {
public:
    MotorDriver();

    // Initializes GPIO pins and PWM channels.
    // Guarantees all pins are LOW and duty is 0 on boot (PROTOCOL.md §11).
    void init();

    // Sets left and right motor speeds and directions (PROTOCOL.md §8).
    // left: -255 to 255 (positive = forward)
    // right: -255 to 255 (positive = forward)
    void set(int16_t left, int16_t right);

    // Immediately stops both motors and zeroes PWM
    void stop();

private:
    static constexpr uint8_t LEDC_CHANNEL_LEFT = 0;
    static constexpr uint8_t LEDC_CHANNEL_RIGHT = 1;
};
