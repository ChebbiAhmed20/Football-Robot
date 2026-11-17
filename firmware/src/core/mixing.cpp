#include "mixing.h"
#include <cmath>
#include <algorithm>

#ifndef M_PI
#define M_PI 3.14159265358979323846
#endif

MotorOutput mix_drive(int8_t d, float m, uint8_t s, uint8_t min_pwm, uint8_t pwm_cap) {
    if (d < 0 || d > 15 || m <= 0.0f) {
        return {0, 0};
    }

    if (m > 1.0f) {
        m = 1.0f;
    }

    if (s > pwm_cap) {
        s = pwm_cap;
    }

    const double angle = d * 22.5 * (M_PI / 180.0);
    const double x = std::sin(angle);
    const double y = std::cos(angle);

    double left_f = y + x;
    double right_f = y - x;

    left_f = std::max(-1.0, std::min(1.0, left_f));
    right_f = std::max(-1.0, std::min(1.0, right_f));

    int16_t left_pwm = static_cast<int16_t>(std::round(left_f * s * m));
    int16_t right_pwm = static_cast<int16_t>(std::round(right_f * s * m));

    // Minimum PWM stall threshold
    if (left_pwm != 0 && std::abs(left_pwm) < min_pwm) {
        left_pwm = (left_pwm > 0) ? min_pwm : -min_pwm;
    }
    if (right_pwm != 0 && std::abs(right_pwm) < min_pwm) {
        right_pwm = (right_pwm > 0) ? min_pwm : -min_pwm;
    }

    return {left_pwm, right_pwm};
}

MotorOutput mix_spin(int8_t r, uint8_t s, uint8_t pwm_cap) {
    if (s > pwm_cap) {
        s = pwm_cap;
    }

    if (r == 1) {
        return {static_cast<int16_t>(s), static_cast<int16_t>(-s)};
    } else if (r == -1) {
        return {static_cast<int16_t>(-s), static_cast<int16_t>(s)};
    } else {
        return {0, 0};
    }
}
