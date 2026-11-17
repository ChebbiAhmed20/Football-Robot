#include <Arduino.h>
#include <WiFi.h>
#include <ESPAsyncWebServer.h>

#include "config.h"
#include "hal/motors.h"
#include "hal/status_led.h"
#include "net/wifi_ap.h"
#include "net/web.h"
#include "net/ws_link.h"

#include "core/mixing.h"
#include "core/turn.h"
#include "core/event_queue.h"
#include "core/state_filter.h"
#include "core/failsafe.h"

// Hardware and Network Modules
static MotorDriver motors;
static StatusLed status_led;
static AsyncWebServer server(HTTP_PORT);
static WebServerManager web_server(&server);
static WsLink ws_link(WS_PATH);

// Core Pure Logic Components
static TurnController turn_ctrl(TURN_MS_PER_DEG_RIGHT, TURN_MS_PER_DEG_LEFT, TURN_PWM);
static EventQueue event_queue;
static StateFilter state_filter;
static FailsafeWatchdog watchdog(FAILSAFE_MS);

// Control Loop Timing
static uint32_t last_loop_ms = 0;
static uint32_t last_status_ms = 0;
static bool client_connected = false;

static void handle_connection_reset() {
    client_connected = false;
    motors.stop();
    event_queue.clear();
    state_filter.reset();
    turn_ctrl.reset();
    watchdog.reset();
    status_led.set_mode(LedMode::FAST_BLINK);
}

void setup() {
    Serial.begin(115200);
    Serial.println("\n[FootBot] Booting...");

    // 1. Mandatory Safety: initialize motor driver first (all pins LOW, duty 0)
    motors.init();
    motors.stop();

    // 2. Initialize Status LED
    status_led.init();
    status_led.set_mode(LedMode::FAST_BLINK);

    // 3. Initialize Soft-AP (192.168.4.1)
    if (WifiAccessPoint::init(AP_SSID, AP_PASS)) {
        Serial.printf("[FootBot] Wi-Fi Soft-AP '%s' active at %s\n", AP_SSID, AP_IP_STR);
    } else {
        Serial.println("[FootBot] ERROR: Failed to start Wi-Fi Soft-AP!");
    }

    // 4. Mount LittleFS and configure static web server
    if (web_server.init()) {
        Serial.println("[FootBot] LittleFS mounted and web server initialized");
    } else {
        Serial.println("[FootBot] ERROR: Failed to mount LittleFS!");
    }

    // 5. Initialize WebSocket Link
    if (ws_link.init(&server)) {
        Serial.println("[FootBot] WebSocket server listening on /ws");
    }

    // 6. Start Web Server
    server.begin();
    Serial.println("[FootBot] Setup complete. Ready for controller connection.");
}

void loop() {
    const uint32_t now = millis();

    // Run control loop every ~10 ms (ARCHITECTURE.md §3)
    if (now - last_loop_ms < 10) {
        return;
    }
    last_loop_ms = now;

    // 1. Update Status LED
    status_led.update(now);

    // 2. Process incoming network events from FreeRTOS queue
    WsEvent evt;
    while (ws_link.pop_event(evt)) {
        if (evt.type == WsEvent::CONNECTED) {
            Serial.println("[FootBot] Controller connected");
            client_connected = true;
            handle_connection_reset();
            client_connected = true; // Mark connected after reset
            status_led.set_mode(LedMode::STEADY_ON);
            continue;
        }

        if (evt.type == WsEvent::DISCONNECTED) {
            Serial.println("[FootBot] Controller disconnected");
            handle_connection_reset();
            continue;
        }

        if (evt.type == WsEvent::MESSAGE) {
            // Any message feeds the failsafe watchdog
            watchdog.feed(now);

            const InMessage& msg = evt.msg;

            if (msg.error == ParseError::BAD_MSG || msg.error == ParseError::TOO_LONG) {
                ws_link.send_err(msg.q, "bad_msg");
                continue;
            }

            if (msg.type == InMessageType::HELLO) {
                if (msg.v != PROTOCOL_VERSION) {
                    Serial.printf("[FootBot] Version mismatch: expected %d, got %d\n", PROTOCOL_VERSION, msg.v);
                    handle_connection_reset();
                } else {
                    ws_link.send_hello(PROTOCOL_VERSION, FW_VERSION);
                }
                continue;
            }

            if (msg.type == InMessageType::PING) {
                ws_link.send_pong(msg.n);
                continue;
            }

            if (msg.type == InMessageType::DRIVE) {
                StateCommand cmd;
                cmd.type = StateType::DRIVE;
                cmd.q = msg.q;
                cmd.d = msg.d;
                cmd.m = msg.m;
                cmd.s = msg.s;
                state_filter.offer(cmd);
                continue;
            }

            if (msg.type == InMessageType::SPIN) {
                StateCommand cmd;
                cmd.type = StateType::SPIN;
                cmd.q = msg.q;
                cmd.r = msg.r;
                cmd.s = msg.s;
                state_filter.offer(cmd);
                continue;
            }

            if (msg.type == InMessageType::STOP) {
                EventCommand cmd;
                cmd.type = EventType::STOP;
                cmd.q = msg.q;

                EnqueueResult res = event_queue.push(cmd);
                if (res == EnqueueResult::DUPLICATE) {
                    ws_link.send_ack(msg.q);
                } else {
                    // STOP priority execution:
                    // 1. Cancel active turn if any
                    if (turn_ctrl.is_active()) {
                        uint32_t cancelled_q = turn_ctrl.get_active_q();
                        turn_ctrl.cancel();
                        ws_link.send_err(cancelled_q, "cancelled");
                    }
                    // 2. Halt motors immediately
                    motors.stop();
                    // 3. Clear state filter
                    state_filter.reset();
                    // 4. Acknowledge stop
                    ws_link.send_ack(msg.q);
                }
                continue;
            }

            if (msg.type == InMessageType::TURN) {
                // If a turn is currently executing, reject with err busy (PROTOCOL.md §6.4)
                if (turn_ctrl.is_active()) {
                    ws_link.send_ack(msg.q);
                    ws_link.send_err(msg.q, "busy");
                    continue;
                }

                EventCommand cmd;
                cmd.type = EventType::TURN;
                cmd.q = msg.q;
                cmd.angle = msg.a;

                EnqueueResult res = event_queue.push(cmd);
                if (res == EnqueueResult::DUPLICATE) {
                    ws_link.send_ack(msg.q);
                } else if (res == EnqueueResult::QUEUE_FULL) {
                    ws_link.send_err(msg.q, "queue_full");
                } else {
                    ws_link.send_ack(msg.q);
                }
                continue;
            }
        }
    }

    // 3. Process Pending Events if not turning
    if (!turn_ctrl.is_active() && !event_queue.is_empty()) {
        EventCommand ev;
        if (event_queue.pop(ev)) {
            if (ev.type == EventType::TURN) {
                turn_ctrl.start(ev.angle, now, ev.q);
            } else if (ev.type == EventType::STOP) {
                motors.stop();
                state_filter.reset();
            }
        }
    }

    // 4. Update Turn State Machine or Apply Drive/Spin State
    if (turn_ctrl.is_active()) {
        MotorOutput out = turn_ctrl.update(now);
        if (turn_ctrl.get_state() == TurnState::COMPLETED) {
            uint32_t completed_q = turn_ctrl.get_active_q();
            motors.stop();
            ws_link.send_done(completed_q);
            turn_ctrl.reset();
        } else {
            motors.set(out.left, out.right);
        }
    } else {
        // No turn active: apply newest state command
        StateCommand st;
        if (state_filter.commit(st)) {
            if (st.type == StateType::DRIVE) {
                MotorOutput out = mix_drive(st.d, st.m, st.s);
                motors.set(out.left, out.right);
            } else if (st.type == StateType::SPIN) {
                MotorOutput out = mix_spin(st.r, st.s);
                motors.set(out.left, out.right);
            }
        }
    }

    // 5. Check Failsafe Watchdog (PROTOCOL.md §11)
    if (client_connected && watchdog.is_expired(now)) {
        motors.stop();
    }

    // 6. Broadcast Robot Status every 500 ms (PROTOCOL.md §9)
    if (client_connected && (now - last_status_ms >= STATUS_INTERVAL_MS)) {
        last_status_ms = now;
        int32_t rssi = WiFi.softAPgetStationNum() > 0 ? -45 : -80;
        ws_link.send_status(rssi, now);
    }
}

