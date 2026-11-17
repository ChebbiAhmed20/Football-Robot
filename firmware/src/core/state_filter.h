#pragma once

#include <stdint.h>

enum class StateType {
    NONE,
    DRIVE,
    SPIN
};

struct StateCommand {
    StateType type{StateType::NONE};
    uint32_t q{0};
    int8_t d{-1};     // For drive: -1 to 15
    float m{0.0f};    // For drive: 0.0 to 1.0
    uint8_t s{200};   // For drive/spin: 80 to 255
    int8_t r{0};      // For spin: -1, 0, 1
};

class StateFilter {
public:
    StateFilter();

    // Offers a candidate state command.
    // Replaces older candidate if candidate.q > last_accepted_q.
    // Returns true if candidate was accepted as valid and newer, false if ignored.
    bool offer(const StateCommand& cmd);

    // Checks if a newer uncommitted candidate is available.
    bool has_new_state() const { return has_candidate_; }

    // Commits and retrieves the newest state command, updating last_accepted_q.
    bool commit(StateCommand& out_cmd);

    // Resets sequence counters on connect / disconnect (PROTOCOL.md §3).
    void reset();

    uint32_t get_last_accepted_q() const { return last_accepted_q_; }

private:
    uint32_t last_accepted_q_{0};
    StateCommand candidate_{};
    bool has_candidate_{false};
};
