#include <unity.h>
#include "event_queue.h"

void setUp(void) {}
void tearDown(void) {}

void test_basic_push_pop(void) {
    EventQueue q;
    TEST_ASSERT_TRUE(q.is_empty());

    EventCommand e1{EventType::TURN, 10, 90};
    EnqueueResult res = q.push(e1);
    TEST_ASSERT_EQUAL(EnqueueResult::OK, res);
    TEST_ASSERT_EQUAL_UINT32(1, q.size());

    EventCommand out;
    TEST_ASSERT_TRUE(q.pop(out));
    TEST_ASSERT_EQUAL_UINT32(10, out.q);
    TEST_ASSERT_EQUAL(EventType::TURN, out.type);
    TEST_ASSERT_EQUAL_INT16(90, out.angle);
    TEST_ASSERT_TRUE(q.is_empty());
}

void test_duplicate_q_rejected(void) {
    EventQueue q;
    EventCommand e1{EventType::TURN, 25, 90};
    TEST_ASSERT_EQUAL(EnqueueResult::OK, q.push(e1));

    // Same q pushed again must return DUPLICATE
    EventCommand e_dup{EventType::TURN, 25, 180};
    TEST_ASSERT_EQUAL(EnqueueResult::DUPLICATE, q.push(e_dup));

    // Even after popped, history remembers q
    EventCommand out;
    q.pop(out);
    TEST_ASSERT_TRUE(q.is_empty());
    TEST_ASSERT_EQUAL(EnqueueResult::DUPLICATE, q.push(e_dup));
}

void test_queue_full_drops_oldest_non_stop(void) {
    EventQueue q;
    // Fill queue with 8 turns (q = 1..8)
    for (uint32_t i = 1; i <= 8; ++i) {
        EventCommand cmd{EventType::TURN, i, 90};
        TEST_ASSERT_EQUAL(EnqueueResult::OK, q.push(cmd));
    }
    TEST_ASSERT_TRUE(q.is_full());
    TEST_ASSERT_EQUAL_UINT32(8, q.size());

    // Pushing 9th turn should drop oldest non-stop (q = 1)
    EventCommand cmd9{EventType::TURN, 9, 180};
    TEST_ASSERT_EQUAL(EnqueueResult::OK, q.push(cmd9));
    TEST_ASSERT_EQUAL_UINT32(8, q.size());

    // First popped element should now be q = 2
    EventCommand out;
    TEST_ASSERT_TRUE(q.pop(out));
    TEST_ASSERT_EQUAL_UINT32(2, out.q);
}

void test_stop_priority_clears_queue(void) {
    EventQueue q;
    // Push several turns
    for (uint32_t i = 1; i <= 5; ++i) {
        q.push(EventCommand{EventType::TURN, i, 90});
    }
    TEST_ASSERT_EQUAL_UINT32(5, q.size());

    // Stop has absolute priority: clears queue and becomes only element
    EventCommand stopCmd{EventType::STOP, 99, 0};
    TEST_ASSERT_EQUAL(EnqueueResult::OK, q.push(stopCmd));
    TEST_ASSERT_EQUAL_UINT32(1, q.size());

    EventCommand out;
    TEST_ASSERT_TRUE(q.pop(out));
    TEST_ASSERT_EQUAL(EventType::STOP, out.type);
    TEST_ASSERT_EQUAL_UINT32(99, out.q);
    TEST_ASSERT_TRUE(q.is_empty());
}

int main(int argc, char **argv) {
    UNITY_BEGIN();
    RUN_TEST(test_basic_push_pop);
    RUN_TEST(test_duplicate_q_rejected);
    RUN_TEST(test_queue_full_drops_oldest_non_stop);
    RUN_TEST(test_stop_priority_clears_queue);
    return UNITY_END();
}

