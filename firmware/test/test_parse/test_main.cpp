#include <unity.h>
#include "protocol/parse.h"
#include <cstring>

void setUp(void) {}
void tearDown(void) {}

void test_parse_valid_messages(void) {
    InMessage msg;

    // Hello
    const char* hello_json = "{\"t\":\"hello\",\"v\":4}";
    TEST_ASSERT_TRUE(parse_incoming_message(hello_json, std::strlen(hello_json), msg));
    TEST_ASSERT_EQUAL(InMessageType::HELLO, msg.type);
    TEST_ASSERT_EQUAL_INT32(4, msg.v);

    // Drive
    const char* drive_json = "{\"t\":\"drive\",\"q\":412,\"d\":2,\"m\":0.8,\"s\":200}";
    TEST_ASSERT_TRUE(parse_incoming_message(drive_json, std::strlen(drive_json), msg));
    TEST_ASSERT_EQUAL(InMessageType::DRIVE, msg.type);
    TEST_ASSERT_EQUAL_UINT32(412, msg.q);
    TEST_ASSERT_EQUAL_INT8(2, msg.d);
    TEST_ASSERT_FLOAT_WITHIN(0.01f, 0.8f, msg.m);
    TEST_ASSERT_EQUAL_UINT8(200, msg.s);

    // Spin
    const char* spin_json = "{\"t\":\"spin\",\"q\":415,\"r\":1,\"s\":200}";
    TEST_ASSERT_TRUE(parse_incoming_message(spin_json, std::strlen(spin_json), msg));
    TEST_ASSERT_EQUAL(InMessageType::SPIN, msg.type);
    TEST_ASSERT_EQUAL_UINT32(415, msg.q);
    TEST_ASSERT_EQUAL_INT8(1, msg.r);
    TEST_ASSERT_EQUAL_UINT8(200, msg.s);

    // Stop
    const char* stop_json = "{\"t\":\"stop\",\"q\":414}";
    TEST_ASSERT_TRUE(parse_incoming_message(stop_json, std::strlen(stop_json), msg));
    TEST_ASSERT_EQUAL(InMessageType::STOP, msg.type);
    TEST_ASSERT_EQUAL_UINT32(414, msg.q);

    // Turn
    const char* turn_json = "{\"t\":\"turn\",\"q\":520,\"a\":90,\"s\":200}";
    TEST_ASSERT_TRUE(parse_incoming_message(turn_json, std::strlen(turn_json), msg));
    TEST_ASSERT_EQUAL(InMessageType::TURN, msg.type);
    TEST_ASSERT_EQUAL_UINT32(520, msg.q);
    TEST_ASSERT_EQUAL_INT16(90, msg.a);

    // Ping
    const char* ping_json = "{\"t\":\"ping\",\"q\":600,\"n\":123}";
    TEST_ASSERT_TRUE(parse_incoming_message(ping_json, std::strlen(ping_json), msg));
    TEST_ASSERT_EQUAL(InMessageType::PING, msg.type);
    TEST_ASSERT_EQUAL_INT32(123, msg.n);
}

void test_parse_malformed_and_oversized(void) {
    InMessage msg;

    // Malformed JSON
    const char* bad_json = "{\"t\":\"drive\", malformed";
    TEST_ASSERT_FALSE(parse_incoming_message(bad_json, std::strlen(bad_json), msg));
    TEST_ASSERT_EQUAL(ParseError::BAD_MSG, msg.error);

    // Oversized message (> 128 bytes)
    char huge_json[200];
    std::memset(huge_json, 'a', sizeof(huge_json));
    huge_json[sizeof(huge_json) - 1] = '\0';
    TEST_ASSERT_FALSE(parse_incoming_message(huge_json, sizeof(huge_json) - 1, msg));
    TEST_ASSERT_EQUAL(ParseError::TOO_LONG, msg.error);

    // Missing sequence number on drive command
    const char* no_q = "{\"t\":\"drive\",\"d\":0,\"m\":1.0,\"s\":200}";
    TEST_ASSERT_FALSE(parse_incoming_message(no_q, std::strlen(no_q), msg));
    TEST_ASSERT_EQUAL(ParseError::BAD_MSG, msg.error);

    // Unknown command type
    const char* unknown_t = "{\"t\":\"unknown\",\"q\":1}";
    TEST_ASSERT_FALSE(parse_incoming_message(unknown_t, std::strlen(unknown_t), msg));
    TEST_ASSERT_EQUAL(ParseError::BAD_MSG, msg.error);
}

void test_parse_out_of_range_handling(void) {
    InMessage msg;

    // Invalid d (-5)
    const char* bad_d = "{\"t\":\"drive\",\"q\":1,\"d\":-5,\"m\":1.0,\"s\":200}";
    TEST_ASSERT_FALSE(parse_incoming_message(bad_d, std::strlen(bad_d), msg));
    TEST_ASSERT_EQUAL(ParseError::BAD_MSG, msg.error);

    // Invalid r (3)
    const char* bad_r = "{\"t\":\"spin\",\"q\":2,\"r\":3,\"s\":200}";
    TEST_ASSERT_FALSE(parse_incoming_message(bad_r, std::strlen(bad_r), msg));
    TEST_ASSERT_EQUAL(ParseError::BAD_MSG, msg.error);

    // Invalid turn angle (45)
    const char* bad_a = "{\"t\":\"turn\",\"q\":3,\"a\":45,\"s\":200}";
    TEST_ASSERT_FALSE(parse_incoming_message(bad_a, std::strlen(bad_a), msg));
    TEST_ASSERT_EQUAL(ParseError::BAD_MSG, msg.error);

    // Out of range s (> 255) gets clamped
    const char* high_s = "{\"t\":\"drive\",\"q\":4,\"d\":0,\"m\":1.0,\"s\":300}";
    TEST_ASSERT_TRUE(parse_incoming_message(high_s, std::strlen(high_s), msg));
    TEST_ASSERT_EQUAL_UINT8(255, msg.s);
}

int main(int argc, char **argv) {
    UNITY_BEGIN();
    RUN_TEST(test_parse_valid_messages);
    RUN_TEST(test_parse_malformed_and_oversized);
    RUN_TEST(test_parse_out_of_range_handling);
    return UNITY_END();
}
