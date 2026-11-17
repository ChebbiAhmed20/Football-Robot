#include <unity.h>
#include "state_filter.h"
#include "failsafe.h"

void setUp(void) {}
void tearDown(void) {}

void test_state_filter_ordering(void) {
    StateFilter sf;
    TEST_ASSERT_EQUAL_UINT32(0, sf.get_last_accepted_q());

    // Offer q=10
    StateCommand c1{StateType::DRIVE, 10, 0, 1.0f, 200, 0};
    TEST_ASSERT_TRUE(sf.offer(c1));

    // Offer older q=8: must be rejected
    StateCommand c_old{StateType::DRIVE, 8, 4, 1.0f, 200, 0};
    TEST_ASSERT_FALSE(sf.offer(c_old));

    // Offer newer q=12: replaces uncommitted candidate
    StateCommand c_new{StateType::DRIVE, 12, 2, 0.8f, 200, 0};
    TEST_ASSERT_TRUE(sf.offer(c_new));

    // Commit state
    StateCommand committed;
    TEST_ASSERT_TRUE(sf.commit(committed));
    TEST_ASSERT_EQUAL_UINT32(12, committed.q);
    TEST_ASSERT_EQUAL_INT8(2, committed.d);
    TEST_ASSERT_EQUAL_UINT32(12, sf.get_last_accepted_q());

    // Offering q=12 again or smaller must now be rejected
    TEST_ASSERT_FALSE(sf.offer(c_new));
    TEST_ASSERT_FALSE(sf.offer(c1));
}

void test_state_filter_reset(void) {
    StateFilter sf;
    StateCommand c{StateType::DRIVE, 50, 0, 1.0f, 200, 0};
    sf.offer(c);
    StateCommand out;
    sf.commit(out);
    TEST_ASSERT_EQUAL_UINT32(50, sf.get_last_accepted_q());

    // Disconnect/reconnect resets counter
    sf.reset();
    TEST_ASSERT_EQUAL_UINT32(0, sf.get_last_accepted_q());

    // Now q=1 is accepted again
    StateCommand c_new{StateType::DRIVE, 1, 0, 0.5f, 200, 0};
    TEST_ASSERT_TRUE(sf.offer(c_new));
}

void test_failsafe_watchdog(void) {
    FailsafeWatchdog watchdog(800);
    // Uninitialized watchdog is expired for safety
    TEST_ASSERT_TRUE(watchdog.is_expired(1000));

    // Feed at t=1000
    watchdog.feed(1000);
    TEST_ASSERT_FALSE(watchdog.is_expired(1000));
    TEST_ASSERT_FALSE(watchdog.is_expired(1500)); // 500 ms elapsed < 800 ms
    TEST_ASSERT_FALSE(watchdog.is_expired(1799)); // 799 ms elapsed < 800 ms

    // At 800 ms or more, it must expire
    TEST_ASSERT_TRUE(watchdog.is_expired(1800));
    TEST_ASSERT_TRUE(watchdog.is_expired(2000));

    // Feeding at t=2000 resets expiration
    watchdog.feed(2000);
    TEST_ASSERT_FALSE(watchdog.is_expired(2000));
    TEST_ASSERT_FALSE(watchdog.is_expired(2500));
}

int main(int argc, char **argv) {
    UNITY_BEGIN();
    RUN_TEST(test_state_filter_ordering);
    RUN_TEST(test_state_filter_reset);
    RUN_TEST(test_failsafe_watchdog);
    return UNITY_END();
}

