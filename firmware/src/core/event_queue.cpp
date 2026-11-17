#include "event_queue.h"

EventQueue::EventQueue() {
    clear();
}

bool EventQueue::is_duplicate(uint32_t q) const {
    if (q == 0) return false;

    // Check history
    for (size_t i = 0; i < history_count_; ++i) {
        if (history_[i] == q) {
            return true;
        }
    }

    // Check pending in buffer
    for (size_t i = 0; i < count_; ++i) {
        size_t idx = (head_ + i) % CAPACITY;
        if (buffer_[idx].q == q) {
            return true;
        }
    }

    return false;
}

void EventQueue::record_history(uint32_t q) {
    if (q == 0) return;
    history_[history_idx_] = q;
    history_idx_ = (history_idx_ + 1) % HISTORY_CAPACITY;
    if (history_count_ < HISTORY_CAPACITY) {
        history_count_++;
    }
}

EnqueueResult EventQueue::push(const EventCommand& event) {
    if (is_duplicate(event.q)) {
        return EnqueueResult::DUPLICATE;
    }

    record_history(event.q);

    // Stop has absolute priority (PROTOCOL.md §5):
    // "stop clears the event queue, cancels any turn, stops the motors, and is acknowledged"
    if (event.type == EventType::STOP) {
        clear_pending();
        buffer_[0] = event;
        head_ = 0;
        tail_ = 1;
        count_ = 1;
        return EnqueueResult::OK;
    }

    // If queue is full, drop the oldest non-stop event
    if (count_ >= CAPACITY) {
        bool dropped = false;
        // Search from head for first non-stop event to drop
        for (size_t i = 0; i < count_; ++i) {
            size_t idx = (head_ + i) % CAPACITY;
            if (buffer_[idx].type != EventType::STOP) {
                // Shift subsequent elements forward
                for (size_t j = i; j < count_ - 1; ++j) {
                    size_t curr = (head_ + j) % CAPACITY;
                    size_t next = (head_ + j + 1) % CAPACITY;
                    buffer_[curr] = buffer_[next];
                }
                tail_ = (tail_ + CAPACITY - 1) % CAPACITY;
                count_--;
                dropped = true;
                break;
            }
        }

        if (!dropped) {
            return EnqueueResult::QUEUE_FULL;
        }
    }

    buffer_[tail_] = event;
    tail_ = (tail_ + 1) % CAPACITY;
    count_++;
    return EnqueueResult::OK;
}

bool EventQueue::pop(EventCommand& out_event) {
    if (count_ == 0) {
        return false;
    }
    out_event = buffer_[head_];
    head_ = (head_ + 1) % CAPACITY;
    count_--;
    return true;
}

bool EventQueue::peek(EventCommand& out_event) const {
    if (count_ == 0) {
        return false;
    }
    out_event = buffer_[head_];
    return true;
}

void EventQueue::clear() {
    clear_pending();
    history_idx_ = 0;
    history_count_ = 0;
    for (size_t i = 0; i < HISTORY_CAPACITY; ++i) {
        history_[i] = 0;
    }
}

void EventQueue::clear_pending() {
    head_ = 0;
    tail_ = 0;
    count_ = 0;
}

