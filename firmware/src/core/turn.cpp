#include "turn.h"
#include <cmath>

TurnController::TurnController(float ms_per_deg_right, float ms_per_deg_left, uint8_t turn_pwm)
    : ms_per_deg_right_(ms_per_deg_right),
      ms_per_deg_left_(ms_per_deg_left),
      turn_pwm_(turn_pwm) {}

uint32_t TurnController::calculate_duration_ms(int16_t angle, float ms_per_deg_right, float ms_per_deg_left) {
    float rate = (angle >= 0) ? ms_per_deg_right : ms_per_deg_left;
    float ms = std::abs(angle) * rate;
    return static_cast<uint32_t>(std::round(ms));
}

bool TurnController::start(int16_t angle, uint32_t current_time_ms, uint32_t seq) {
    if (state_ == TurnState::RUNNING) {
        return false;
    }

    if (angle != 90 && angle != -90 && angle != 180 && angle != -180) {
        return false;
    }

    angle_ = angle;
    start_time_ms_ = current_time_ms;
    active_q_ = seq;
    duration_ms_ = calculate_duration_ms(angle_, ms_per_deg_right_, ms_per_deg_left_);
    state_ = TurnState::RUNNING;

    if (angle_ > 0) {
        // Clockwise / Right: Left motor forward (+), Right motor backward (-)
        current_output_ = {static_cast<int16_t>(turn_pwm_), static_cast<int16_t>(-turn_pwm_)};
    } else {
        // Counter-clockwise / Left: Left motor backward (-), Right motor forward (+)
        current_output_ = {static_cast<int16_t>(-turn_pwm_), static_cast<int16_t>(turn_pwm_)};
    }

    return true;
}

MotorOutput TurnController::update(uint32_t current_time_ms) {
    if (state_ != TurnState::RUNNING) {
        return {0, 0};
    }

    uint32_t elapsed = current_time_ms - start_time_ms_;
    if (elapsed >= duration_ms_) {
        state_ = TurnState::COMPLETED;
        current_output_ = {0, 0};
    }

    return current_output_;
}

bool TurnController::cancel() {
    if (state_ == TurnState::RUNNING) {
        state_ = TurnState::CANCELLED;
        current_output_ = {0, 0};
        return true;
    }
    return false;
}

void TurnController::reset() {
    state_ = TurnState::IDLE;
    angle_ = 0;
    start_time_ms_ = 0;
    duration_ms_ = 0;
    active_q_ = 0;
    current_output_ = {0, 0};
}

