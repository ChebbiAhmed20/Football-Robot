#include "failsafe.h"

FailsafeWatchdog::FailsafeWatchdog(uint32_t timeout_ms)
    : timeout_ms_(timeout_ms), last_feed_time_ms_(0), is_active_(false) {}

void FailsafeWatchdog::feed(uint32_t current_time_ms) {
    last_feed_time_ms_ = current_time_ms;
    is_active_ = true;
}

bool FailsafeWatchdog::is_expired(uint32_t current_time_ms) const {
    if (!is_active_) {
        // If never fed or reset, it is considered expired for safety
        return true;
    }

    // Handles uint32_t rollover correctly
    return (current_time_ms - last_feed_time_ms_) >= timeout_ms_;
}

void FailsafeWatchdog::reset() {
    last_feed_time_ms_ = 0;
    is_active_ = false;
}

void FailsafeWatchdog::trip() {
    is_active_ = false;
}

