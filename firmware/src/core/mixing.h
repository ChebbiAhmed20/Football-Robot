#pragma once

#include <stdint.h>
#include "config.h"

struct MotorOutput {
    int16_t left;
    int16_t right;
};

// Computes left and right motor PWM values for a drive command (PROTOCOL.md §7).
// d: direction index (-1 to 15)
// m: throttle factor (0.0f to 1.0f)
// s: speed max PWM (80 to 255)
// min_pwm: stall prevention threshold (default MIN_PWM = 70)
// pwm_cap: maximum allowable PWM (default PWM_CAP = 255)
MotorOutput mix_drive(int8_t d, float m, uint8_t s, uint8_t min_pwm = MIN_PWM, uint8_t pwm_cap = PWM_CAP);

// Computes left and right motor PWM values for a spin command (PROTOCOL.md §7).
// r: direction: 1 = spin right, -1 = spin left, 0 = stop spinning
// s: speed PWM (80 to 255)
// pwm_cap: maximum allowable PWM (default PWM_CAP = 255)
MotorOutput mix_spin(int8_t r, uint8_t s, uint8_t pwm_cap = PWM_CAP);

