#include <unity.h>
#include "turn.h"

void setUp(void) {}
void tearDown(void) {}

void test_turn_durations(void) {
    // 90 deg right = 4.5 * 90 = 405 ms
    uint32_t ms_90_r = TurnController::calculate_duration_ms(90, 4.5f, 4.5f);
    TEST_ASSERT_EQUAL_UINT32(405, ms_90_r);

    // 90 deg left = 4.5 * 90 = 405 ms
    uint32_t ms_90_l = TurnController::calculate_duration_ms(-90, 4.5f, 4.5f);
    TEST_ASSERT_EQUAL_UINT32(405, ms_90_l);

    // 180 deg right = 4.5 * 180 = 810 ms
    uint32_t ms_180_r = TurnController::calculate_duration_ms(180, 4.5f, 4.5f);
    TEST_ASSERT_EQUAL_UINT32(810, ms_180_r);

    // 180 deg left = 4.5 * 180 = 810 ms
    uint32_t ms_180_l = TurnController::calculate_duration_ms(-180, 4.5f, 4.5f);
    TEST_ASSERT_EQUAL_UINT32(810, ms_180_l);
}

void test_turn_state_machine_lifecycle(void) {
    TurnController tc(4.5f, 4.5f, 200);
    TEST_ASSERT_FALSE(tc.is_active());
    TEST_ASSERT_EQUAL(TurnState::IDLE, tc.get_state());

    // Start 90 deg right turn at t=1000
    bool started = tc.start(90, 1000, 42);
    TEST_ASSERT_TRUE(started);
    TEST_ASSERT_TRUE(tc.is_active());
    TEST_ASSERT_EQUAL_UINT32(42, tc.get_active_q());
    TEST_ASSERT_EQUAL_UINT32(405, tc.get_duration_ms());

    // Second turn while running must be rejected (err busy)
    TEST_ASSERT_FALSE(tc.start(-90, 1050, 43));

    // Mid-turn check at t=1200
    MotorOutput out = tc.update(1200);
    TEST_ASSERT_TRUE(tc.is_active());
    TEST_ASSERT_EQUAL_INT16(200, out.left);
    TEST_ASSERT_EQUAL_INT16(-200, out.right);

    // Turn completes at t=1405
    out = tc.update(1405);
    TEST_ASSERT_FALSE(tc.is_active());
    TEST_ASSERT_EQUAL(TurnState::COMPLETED, tc.get_state());
    TEST_ASSERT_EQUAL_INT16(0, out.left);
    TEST_ASSERT_EQUAL_INT16(0, out.right);
}

void test_turn_cancellation(void) {
    TurnController tc(4.5f, 4.5f, 200);
    tc.start(180, 5000, 101);
    TEST_ASSERT_TRUE(tc.is_active());

    // Stop cancels the turn
    bool cancelled = tc.cancel();
    TEST_ASSERT_TRUE(cancelled);
    TEST_ASSERT_FALSE(tc.is_active());
    TEST_ASSERT_EQUAL(TurnState::CANCELLED, tc.get_state());

    MotorOutput out = tc.update(5200);
    TEST_ASSERT_EQUAL_INT16(0, out.left);
    TEST_ASSERT_EQUAL_INT16(0, out.right);
}

int main(int argc, char **argv) {
    UNITY_BEGIN();
    RUN_TEST(test_turn_durations);
    RUN_TEST(test_turn_state_machine_lifecycle);
    RUN_TEST(test_turn_cancellation);
    return UNITY_END();
}
