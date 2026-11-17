#pragma once

#include <stdint.h>
#include <stddef.h>
#include "config.h"

enum class EventType {
    NONE,
    STOP,
    TURN
};

struct EventCommand {
    EventType type{EventType::NONE};
    uint32_t q{0};
    int16_t angle{0}; // For turn: 90, -90, 180, -180
};

enum class EnqueueResult {
    OK,
    DUPLICATE,
    QUEUE_FULL
};

class EventQueue {
public:
    static constexpr size_t CAPACITY = MAX_EVENT_QUEUE;
    static constexpr size_t HISTORY_CAPACITY = 32;

    EventQueue();

    // Pushes an event into the queue according to PROTOCOL.md §5.
    // Handles stop priority, queue capacity dropping oldest non-stop, and duplicate detection.
    EnqueueResult push(const EventCommand& event);

    // Pops the next event from the queue. Returns false if queue is empty.
    bool pop(EventCommand& out_event);

    // Peeks at the next event without removing it.
    bool peek(EventCommand& out_event) const;

    // Checks if sequence number q was already received or processed recently.
    bool is_duplicate(uint32_t q) const;

    // Clears the queue and recent history (used on connect/disconnect/stop).
    void clear();

    // Clears pending queue without wiping deduplication history.
    void clear_pending();

    size_t size() const { return count_; }
    bool is_empty() const { return count_ == 0; }
    bool is_full() const { return count_ >= CAPACITY; }

private:
    void record_history(uint32_t q);

    EventCommand buffer_[CAPACITY];
    size_t head_{0};
    size_t tail_{0};
    size_t count_{0};

    uint32_t history_[HISTORY_CAPACITY]{0};
    size_t history_idx_{0};
    size_t history_count_{0};
};
