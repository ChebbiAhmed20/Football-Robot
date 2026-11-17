#include <unity.h>
#include "mixing.h"

void setUp(void) {}
void tearDown(void) {}

void test_section_7_vectors(void) {
    // d=0, m=1.0, s=200 -> 200, 200
    MotorOutput out = mix_drive(0, 1.0f, 200);
    TEST_ASSERT_EQUAL_INT16(200, out.left);
    TEST_ASSERT_EQUAL_INT16(200, out.right);

    // d=4, m=1.0, s=200 -> 200, -200
    out = mix_drive(4, 1.0f, 200);
    TEST_ASSERT_EQUAL_INT16(200, out.left);
    TEST_ASSERT_EQUAL_INT16(-200, out.right);

    // d=8, m=1.0, s=200 -> -200, -200
    out = mix_drive(8, 1.0f, 200);
    TEST_ASSERT_EQUAL_INT16(-200, out.left);
    TEST_ASSERT_EQUAL_INT16(-200, out.right);

    // d=12, m=1.0, s=200 -> -200, 200
    out = mix_drive(12, 1.0f, 200);
    TEST_ASSERT_EQUAL_INT16(-200, out.left);
    TEST_ASSERT_EQUAL_INT16(200, out.right);

    // d=2, m=1.0, s=200 -> 200, 0
    out = mix_drive(2, 1.0f, 200);
    TEST_ASSERT_EQUAL_INT16(200, out.left);
    TEST_ASSERT_EQUAL_INT16(0, out.right);

    // d=1, m=1.0, s=200 -> 200, 108
    out = mix_drive(1, 1.0f, 200);
    TEST_ASSERT_EQUAL_INT16(200, out.left);
    TEST_ASSERT_EQUAL_INT16(108, out.right);

    // d=3, m=1.0, s=200 -> 200, -108
    out = mix_drive(3, 1.0f, 200);
    TEST_ASSERT_EQUAL_INT16(200, out.left);
    TEST_ASSERT_EQUAL_INT16(-108, out.right);

    // d=0, m=0.5, s=200 -> 100, 100
    out = mix_drive(0, 0.5f, 200);
    TEST_ASSERT_EQUAL_INT16(100, out.left);
    TEST_ASSERT_EQUAL_INT16(100, out.right);

    // d=0, m=0.3, s=200 -> 70, 70 (60 raised to 70)
    out = mix_drive(0, 0.3f, 200);
    TEST_ASSERT_EQUAL_INT16(70, out.left);
    TEST_ASSERT_EQUAL_INT16(70, out.right);

    // d=-1, m=1.0, s=200 -> 0, 0
    out = mix_drive(-1, 1.0f, 200);
    TEST_ASSERT_EQUAL_INT16(0, out.left);
    TEST_ASSERT_EQUAL_INT16(0, out.right);
}

void test_minimum_pwm_rule(void) {
    // 0 throttle stays 0
    MotorOutput out = mix_drive(0, 0.0f, 200);
    TEST_ASSERT_EQUAL_INT16(0, out.left);
    TEST_ASSERT_EQUAL_INT16(0, out.right);

    // Negative direction threshold check
    out = mix_drive(8, 0.3f, 200);
    TEST_ASSERT_EQUAL_INT16(-70, out.left);
    TEST_ASSERT_EQUAL_INT16(-70, out.right);
}

void test_spin(void) {
    // Spin right
    MotorOutput out = mix_spin(1, 200);
    TEST_ASSERT_EQUAL_INT16(200, out.left);
    TEST_ASSERT_EQUAL_INT16(-200, out.right);

    // Spin left
    out = mix_spin(-1, 200);
    TEST_ASSERT_EQUAL_INT16(-200, out.left);
    TEST_ASSERT_EQUAL_INT16(200, out.right);

    // Stop spin
    out = mix_spin(0, 200);
    TEST_ASSERT_EQUAL_INT16(0, out.left);
    TEST_ASSERT_EQUAL_INT16(0, out.right);
}

void test_pwm_cap(void) {
    // Cap at 180 when s=250
    MotorOutput out = mix_drive(0, 1.0f, 250, 70, 180);
    TEST_ASSERT_EQUAL_INT16(180, out.left);
    TEST_ASSERT_EQUAL_INT16(180, out.right);
}

int main(int argc, char **argv) {
    UNITY_BEGIN();
    RUN_TEST(test_section_7_vectors);
    RUN_TEST(test_minimum_pwm_rule);
    RUN_TEST(test_spin);
    RUN_TEST(test_pwm_cap);
    return UNITY_END();
}
