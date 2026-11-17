#pragma once

#include <stdint.h>
#include "config.h"

class FailsafeWatchdog {
public:
    explicit FailsafeWatchdog(uint32_t timeout_ms = FAILSAFE_MS);

    // Feeds the watchdog when any valid message arrives from the controller.
    void feed(uint32_t current_time_ms);

    // Checks if the watchdog has timed out.
    // Returns true if expired (i.e. motors must be stopped).
    bool is_expired(uint32_t current_time_ms) const;

    // Resets watchdog state (e.g. on new connection or disconnect).
    void reset();

    // Forces watchdog into tripped state (motors off).
    void trip();

    uint32_t get_last_feed_time() const { return last_feed_time_ms_; }
    uint32_t get_timeout_ms() const { return timeout_ms_; }

private:
    uint32_t timeout_ms_;
    uint32_t last_feed_time_ms_{0};
    bool is_active_{false};
};

