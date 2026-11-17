#pragma once

#include <stdint.h>
#include "config.h"
#include "mixing.h"

enum class TurnState {
    IDLE,
    RUNNING,
    COMPLETED,
    CANCELLED
};

class TurnController {
public:
    TurnController(float ms_per_deg_right = TURN_MS_PER_DEG_RIGHT,
                   float ms_per_deg_left = TURN_MS_PER_DEG_LEFT,
                   uint8_t turn_pwm = TURN_PWM);

    // Calculates turn duration in milliseconds
    static uint32_t calculate_duration_ms(int16_t angle, float ms_per_deg_right, float ms_per_deg_left);

    // Starts a timed turn. Returns false if already active or invalid angle.
    bool start(int16_t angle, uint32_t current_time_ms, uint32_t seq);

    // Updates turn state with current time. Returns current motor outputs.
    MotorOutput update(uint32_t current_time_ms);

    // Cancels active turn. Returns true if a turn was cancelled.
    bool cancel();

    // Reset to idle
    void reset();

    bool is_active() const { return state_ == TurnState::RUNNING; }
    TurnState get_state() const { return state_; }
    uint32_t get_active_q() const { return active_q_; }
    uint32_t get_duration_ms() const { return duration_ms_; }

private:
    float ms_per_deg_right_;
    float ms_per_deg_left_;
    uint8_t turn_pwm_;

    TurnState state_{TurnState::IDLE};
    int16_t angle_{0};
    uint32_t start_time_ms_{0};
    uint32_t duration_ms_{0};
    uint32_t active_q_{0};
    MotorOutput current_output_{0, 0};
};

