# Football robot protocol, version 4

This file is the contract between the **robot firmware** (ESP32) and the **controller** (web page). Both sides are written to match it. If behaviour must change, change this file first, then update both sides and the tests.

## 1. Overview

- Controller: a web page opened on a phone.
- Robot: ESP32 DevKit driving an L298N with two DC motors (differential drive).
- Link: Wi-Fi, WebSocket, JSON text messages, one JSON object per message.
- One controller at a time. A second connection is rejected.

## 2. Transport

| Item | Value |
|---|---|
| Wi-Fi mode | ESP32 access point (no router) |
| SSID / password | `FootBot` / `footbot123` (change before competitions) |
| Robot IP | `192.168.4.1` |
| Controller page | served by the ESP32 at `http://192.168.4.1/` (files in LittleFS) |
| WebSocket | `ws://192.168.4.1/ws` (same host and port as the page) |
| Max message size | 128 bytes |

Why the robot serves the page: a page loaded from an `https://` site cannot open an insecure `ws://` connection (mixed content). Serving the page from the robot over `http://` avoids that.

## 3. Connection lifecycle

1. Controller connects, then sends `{"t":"hello","v":4}`.
2. Robot replies `{"t":"hello","v":4,"fw":"1.0.0"}`. If versions differ, the robot closes the socket.
3. Sequence counters reset on every new connection.
4. The controller reconnects automatically every 1 s after a drop.
5. On connect, disconnect or reconnect the robot clears all pending commands and stops the motors. It never resumes old commands.

## 4. Message envelope

Every controller message has `t` (type) and `q` (sequence number, integer, starts at 1, increases by 1 for each **new** message). Robot messages that answer a command echo its `q`.

Unknown `t`, malformed JSON or out-of-range fields: the robot ignores the message and may reply `{"t":"err","q":<q>,"c":"bad_msg"}`. Out-of-range numbers may instead be clamped, as noted per field.

## 5. Two kinds of commands

| Kind | Commands | Rule |
|---|---|---|
| **State** | `drive`, `spin` | The newest replaces the older. Never queued. Resent as a heartbeat. |
| **Event** | `stop`, `turn` | Must not be lost or run twice. Resend until acknowledged. |

**State rules**
- The controller sends the current `drive` or `spin` immediately when it changes, and repeats it every **250 ms** (4 Hz heartbeat).
- If several state messages are waiting when the robot reads the socket, it applies only the last one.
- The robot ignores a state message with `q` less than or equal to the last state `q` it accepted.

**Event rules**
- The controller sends the event with a new `q`, and resends the same message (same `q`) every **150 ms** until it receives `{"t":"ack","q":<q>}`, at most **5 tries**. After that it shows a warning.
- The robot executes an event once. If it receives the same `q` again, it re-sends the `ack` and does not execute it again.
- The robot keeps a queue of at most **8** pending events. If full, it drops the oldest event that is not `stop`.
- `stop` has priority: it clears the event queue, cancels any turn, stops the motors, and is acknowledged.

## 6. Controller → robot messages

### 6.1 `drive` (state)
```json
{"t":"drive","q":412,"d":2,"m":0.8,"s":200}
```
| Field | Type | Range | Meaning |
|---|---|---|---|
| d | int | -1 to 15 | direction index, or -1 = no movement |
| m | float | 0.0 to 1.0 | stick distance (speed factor) |
| s | int | 80 to 255 | maximum PWM from the speed slider |

Direction index `d`, clockwise from forward, 22.5° per step:

| d | Angle | Name | d | Angle | Name |
|---|---|---|---|---|---|
| 0 | 0° | forward | 8 | 180° | back |
| 1 | 22.5° | forward, slight right | 9 | 202.5° | back, slight left |
| 2 | 45° | forward-right | 10 | 225° | back-left |
| 3 | 67.5° | forward, mostly turning right | 11 | 247.5° | back, mostly turning left |
| 4 | 90° | right (spin on the spot) | 12 | 270° | left (spin on the spot) |
| 5 | 112.5° | back, mostly turning right | 13 | 292.5° | forward, mostly turning left |
| 6 | 135° | back-right | 14 | 315° | forward-left |
| 7 | 157.5° | back, slight right | 15 | 337.5° | forward, slight left |

Note: the names are descriptive only. The motor result is defined by the mixing formula in section 7, which is the single source of truth; direction names for d = 3, 5, 11, 13 are approximate.

**Dead zone (controller side):** if the stick is within 15% of the pad radius from the centre, the controller sends `d:-1,m:0`. Outside it, `m` is the distance scaled from 0.0 (edge of the dead zone) to 1.0 (rim), and `d` is the angle snapped to the nearest 22.5°.

### 6.2 `spin` (state)
```json
{"t":"spin","q":415,"r":1,"s":200}
```
`r` = 1 spin right, -1 spin left, 0 stop spinning. Held buttons send it every 250 ms; releasing sends `r:0`.

### 6.3 `stop` (event, priority)
```json
{"t":"stop","q":414}
```

### 6.4 `turn` (event)
```json
{"t":"turn","q":520,"a":90,"s":200}
```
`a` is one of `90`, `-90`, `180`, `-180` (degrees, positive = clockwise/right). The robot ignores `s` for turns and uses the fixed `TURN_PWM` (see below), so the turn is repeatable.

Rules:
- The robot replies `{"t":"ack","q":520}`, then `{"t":"done","q":520}` when the turn finishes.
- While a turn runs, `drive` and `spin` are ignored (not queued).
- A new `turn` while one is running gets `{"t":"err","q":..,"c":"busy"}`.
- `stop` cancels the turn: the robot sends `{"t":"err","q":<turn q>,"c":"cancelled"}` for the turn.
- **Turns are timed:** the robot spins in place for `|a| × TURN_MS_PER_DEG` milliseconds at the fixed PWM `TURN_PWM`, then stops and sends `done`.
- Firmware constants: `TURN_PWM = 200`, `TURN_MS_PER_DEG_RIGHT = 4.5`, `TURN_MS_PER_DEG_LEFT = 4.5` (separate values because the two motors differ). These are starting guesses and must be calibrated by hand.
- **Calibration:** put the robot on the floor at full battery, send `turn` 90 ten times, measure the real angle, and scale the constant (new = old × 90 / measured). Repeat for the other direction and for 180.
- Accuracy is limited: expect an error of several degrees that grows as the battery drains, and it depends on the floor. Recalibrate when the battery or the wheels change.
- A turn always ends by itself after `|a| × TURN_MS_PER_DEG` milliseconds, so it needs no timeout.

### 6.5 `ping`
```json
{"t":"ping","q":600,"n":123}
```
Sent by the controller about once per second. The robot answers `{"t":"pong","n":123}` immediately. Round-trip time measured by the controller drives the connection gauge. `ping` is not an event: it is not resent.

## 7. Motor mixing (robot side)

For `drive` with `d >= 0`:

```
angle = d * 22.5 degrees
x = sin(angle)        // turn component
y = cos(angle)        // throttle component
left_f  = clamp(y + x, -1, 1)
right_f = clamp(y - x, -1, 1)
left_pwm  = round(left_f  * s * m)
right_pwm = round(right_f * s * m)
```

Minimum PWM: if a result is not 0 and its absolute value is below **70**, raise it to 70 (keeping the sign), because the TT motors stall below that.

With `d = -1`, or `m = 0`, both outputs are 0.

For `spin`: `r = 1` gives `left_pwm = +s`, `right_pwm = -s`. `r = -1` gives the opposite. `r = 0` gives 0.

**Test vectors** (`s = 200` unless stated):

| d | m | left | right |
|---|---|---|---|
| 0 | 1.0 | 200 | 200 |
| 4 | 1.0 | 200 | -200 |
| 8 | 1.0 | -200 | -200 |
| 12 | 1.0 | -200 | 200 |
| 2 | 1.0 | 200 | 0 |
| 1 | 1.0 | 200 | 108 |
| 3 | 1.0 | 200 | -108 |
| 0 | 0.5 | 100 | 100 |
| 0 | 0.3 | 70 | 70 |
| -1 | 1.0 | 0 | 0 |

## 8. Direction to motors

Positive PWM means forward for that wheel.

| Side | Forward | Backward |
|---|---|---|
| Left motor (OUT1/OUT2) | IN1 = HIGH, IN2 = LOW | IN1 = LOW, IN2 = HIGH |
| Right motor (OUT3/OUT4) | IN3 = HIGH, IN4 = LOW | IN3 = LOW, IN4 = HIGH |

PWM is applied to ENA (left) and ENB (right). If a wheel turns the wrong way, swap its two motor wires; do not change the code.

## 9. Robot → controller messages

| Message | When | Fields |
|---|---|---|
| `{"t":"hello",...}` | after the controller's hello | `v`, `fw` |
| `{"t":"ack","q":N}` | event received (and for duplicates) | `q` |
| `{"t":"done","q":N}` | turn finished | `q` |
| `{"t":"err","q":N,"c":"..."}` | error | `c` = `bad_msg`, `busy`, `cancelled`, `queue_full` |
| `{"t":"pong","n":N}` | answer to ping | `n` |
| `{"t":"status","rssi":-52,"ms":12345}` | every 500 ms | `rssi` Wi-Fi signal in dBm, `ms` uptime |

## 10. Connection gauge (controller)

| Round-trip time | State |
|---|---|
| under 100 ms | connected, good |
| 100 to 300 ms | connected, slow |
| over 300 ms | connected, poor |
| no pong for 2 s | disconnected |

The gauge also shows `rssi` from `status`.

## 11. Safety

1. **Failsafe:** if no message of any kind arrives for **800 ms**, stop both motors. (At 4 Hz the heartbeat is 250 ms, so one lost packet does not stop the robot.)
2. WebSocket disconnect: motors off, queue cleared.
3. Boot: motors off, all L298N inputs LOW.
4. `stop` always wins over every other command.
5. Never drive when the controller shows disconnected.

## 12. Hardware mapping

| Function | ESP32 pin | L298N pin |
|---|---|---|
| Left speed (PWM) | GPIO25 | ENA |
| Left direction | GPIO26 | IN1 |
| Left direction | GPIO27 | IN2 |
| Right direction | GPIO32 | IN3 |
| Right direction | GPIO33 | IN4 |
| Right speed (PWM) | GPIO13 | ENB |
| Status LED | GPIO2 (onboard) | |

PWM: 1 kHz, 8 bits (0 to 255). Status LED: fast blink = no controller, steady = connected.

## 13. Required tests (for the agent)

1. **Mixing unit tests** on a PC (`pio test -e native`) using the table in section 7. The mixing code is a pure function with no hardware access. Also test the turn duration function: `turn 90` right = 405 ms, `turn 180` = 810 ms with the default constants.
2. **Mock robot server** (Node or Python) that implements this protocol on `ws://localhost:8080/ws`: hello, ack, done, pong, status, failsafe, duplicate `q` handling, `busy` and `cancelled` errors. Run the controller page against it.
3. **Controller checks** against the mock: 4 Hz heartbeat while the stick is held; immediate send on change; event resend until ack; gauge states; reconnect after the server restarts.
4. **Hardware checks** (done by the human, wheels off the ground): each direction, spin, turns, stop, failsafe (turn off the phone Wi-Fi), reconnect.

## 14. Change log

- v1: Wi-Fi WebSocket, `drive` with x/y, 500 ms failsafe.
- v2: 16 directions, `spin`, `ping`/`pong`.
- v3: sequence numbers, event acknowledgements, state vs event commands, queue rules.
- v4: `turn` by 90° and 180° (timed turns), `done`/`err`, failsafe raised to 800 ms.
- v4 clarifications: removed `turn` from `hello` table (§9), updated PWA to web page (§1), clarified approximate names for d = 3, 5, 11, 13 (§6.1).
