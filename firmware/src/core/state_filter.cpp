#include "state_filter.h"

StateFilter::StateFilter() {
    reset();
}

bool StateFilter::offer(const StateCommand& cmd) {
    if (cmd.q == 0) {
        return false;
    }

    // PROTOCOL.md §5:
    // "The robot ignores a state message with q less than or equal to the last state q it accepted."
    if (cmd.q <= last_accepted_q_) {
        return false;
    }

    // If an uncommitted candidate exists, it must also be newer than the candidate
    if (has_candidate_ && cmd.q <= candidate_.q) {
        return false;
    }

    // Newest candidate replaces older
    candidate_ = cmd;
    has_candidate_ = true;
    return true;
}

bool StateFilter::commit(StateCommand& out_cmd) {
    if (!has_candidate_) {
        return false;
    }

    out_cmd = candidate_;
    last_accepted_q_ = candidate_.q;
    has_candidate_ = false;
    return true;
}

void StateFilter::reset() {
    last_accepted_q_ = 0;
    candidate_ = StateCommand{};
    has_candidate_ = false;
}
