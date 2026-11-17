# FootBot: project architecture

Companion to `PROTOCOL.md` (v4). The protocol is the contract; this file says where everything lives, what to install, and in what order to build it.

---

## 1. What we are building

```
 Phone (browser)  ──Wi-Fi AP "FootBot"──▶  ESP32  ──▶  L298N  ──▶  2× TT motors
 controller page      WebSocket JSON        firmware     H-bridge     (differential drive)
 served BY the ESP32  ws://192.168.4.1/ws
```

Three deliverables, one contract:

| Part | Tech | Where |
|---|---|---|
| Firmware | PlatformIO, Arduino framework, C++ | `firmware/` |
| Controller page | Vite + TypeScript (no framework), built to static files | `controller/` |
| Dev tooling | Node mock robot, used to test the controller with no hardware | `tools/mock-robot/` |

Rule from the protocol: change `PROTOCOL.md` first, then firmware, mock and controller, then tests.

---

## 2. Repository layout

```
footbot/
├── DOC/
│   ├── PROTOCOL.md              # the contract (v4)
│   ├── ARCHITECTURE.md          # this file
│   ├── AGENTS.md                # working guide and project log
│   ├── TESTING.md               # test reports and verification checklists
│   └── EXECUTION.md             # end-to-end user manual
├── README.md                    # quick start, wiring summary, how to flash
├── AGENTS.md                    # root pointer to DOC/AGENTS.md
├── .gitignore
├── .editorconfig
│
├── docs/                        # hardware documentation
│   ├── wiring.md                # pin table, power diagram, photos
│   ├── power.md                 # battery, charger, buck setup, safety notes
│   ├── calibration.md           # turn calibration procedure and results log
│   └── hardware-checklist.md    # section 13.4 tests, tick-box form
│
├── shared/
│   └── test-vectors.json        # mixing + turn-duration vectors from PROTOCOL §7 and §6.4
│
├── firmware/
│   ├── platformio.ini
│   ├── partitions.csv           # optional, only if LittleFS needs more room
│   ├── data/                    # LittleFS image = built controller (generated, git-ignored)
│   ├── include/
│   │   └── config.h             # pins, PWM, TURN_* constants, SSID/password, timeouts
│   ├── src/
│   │   ├── main.cpp             # setup(), loop(): wires modules together only
│   │   ├── core/                # PURE C++: no Arduino.h, runs on the PC
│   │   │   ├── mixing.h/.cpp        # d,m,s → left/right PWM (§7), min-PWM rule, spin
│   │   │   ├── turn.h/.cpp          # turn duration, turn state machine (timed)
│   │   │   ├── event_queue.h/.cpp   # max 8, drop oldest non-stop, dedupe by q
│   │   │   ├── state_filter.h/.cpp  # "ignore q <= last accepted", last-wins
│   │   │   └── failsafe.h/.cpp      # 800 ms watchdog logic (takes time as input)
│   │   ├── protocol/
│   │   │   ├── messages.h           # structs for each message type
│   │   │   ├── parse.h/.cpp         # JSON → struct, range checks, clamping, bad_msg
│   │   │   └── encode.h/.cpp        # struct → JSON (hello, ack, done, err, pong, status)
│   │   ├── hal/                 # hardware, Arduino-only
│   │   │   ├── motors.h/.cpp        # L298N pins, LEDC PWM 1 kHz / 8-bit, direction table §8
│   │   │   └── status_led.h/.cpp    # fast blink / steady
│   │   └── net/
│   │       ├── wifi_ap.h/.cpp       # soft-AP, fixed IP 192.168.4.1
│   │       ├── web.h/.cpp           # LittleFS static files, gzip, caching headers
│   │       └── ws_link.h/.cpp       # /ws, one client only, hello/version check, rx queue
│   └── test/
│       ├── test_mixing/test_main.cpp
│       ├── test_turn/test_main.cpp
│       ├── test_event_queue/test_main.cpp
│       ├── test_state_filter/test_main.cpp
│       └── test_parse/test_main.cpp
│
├── controller/
│   ├── package.json
│   ├── tsconfig.json
│   ├── vite.config.ts           # outDir → ../firmware/data, gzip plugin
│   ├── index.html
│   ├── public/
│   │   ├── manifest.webmanifest # optional (see PWA note below)
│   │   └── icons/
│   ├── src/
│   │   ├── main.ts
│   │   ├── protocol/
│   │   │   ├── types.ts             # message types mirroring PROTOCOL.md
│   │   │   └── constants.ts         # 250 ms heartbeat, 150 ms resend, 5 tries, 15 % dead zone
│   │   ├── net/
│   │   │   ├── socket.ts            # connect, hello, auto-reconnect every 1 s
│   │   │   ├── sequencer.ts         # q counter, reset on connect
│   │   │   ├── state_sender.ts      # drive/spin: send on change + 4 Hz heartbeat
│   │   │   ├── event_sender.ts      # stop/turn: resend same q every 150 ms until ack, max 5
│   │   │   └── ping.ts              # 1 Hz ping, RTT, "no pong for 2 s"
│   │   ├── input/
│   │   │   ├── joystick.ts          # pointer events, dead zone, snap to 22.5°, m scaling
│   │   │   ├── spin_buttons.ts      # hold = r:±1, release = r:0
│   │   │   └── buttons.ts           # stop, turn ±90, ±180, speed slider (s 80..255)
│   │   ├── ui/
│   │   │   ├── gauge.ts             # connection states §10 + rssi
│   │   │   ├── layout.css
│   │   │   └── warnings.ts          # "command not acknowledged" etc.
│   │   └── state/store.ts           # tiny observable store, no framework
│   └── tests/                   # Vitest
│       ├── joystick.test.ts
│       ├── state_sender.test.ts     # fake timers: heartbeat + immediate send
│       ├── event_sender.test.ts     # resend until ack, gives up after 5
│       ├── gauge.test.ts
│       └── socket.test.ts           # reconnect behaviour
│
├── tools/
│   └── mock-robot/
│       ├── package.json
│       ├── src/
│       │   ├── server.ts            # ws://localhost:8080/ws (+ serves controller/dist)
│       │   ├── robot_model.ts       # failsafe, dup q, busy/cancelled, status 500 ms
│       │   └── mixing.ts            # same formula, checked against shared/test-vectors.json
│       └── tests/
│           └── protocol.test.ts     # drives the mock with scripted clients
│
└── scripts/
    ├── build-controller.mjs     # vite build → firmware/data (gzip)
    └── dev.mjs                  # mock server + vite dev together
```

Why the split in `firmware/src`:

- `core/` has zero hardware dependencies, so every rule in the protocol (mixing, min PWM 70, queue of 8, dedupe, failsafe, turn timing) is unit-tested on the PC with `pio test -e native`.
- `hal/` and `net/` are thin and only translate between the real world and `core/`.
- `main.cpp` only connects the pieces.

---

## 3. Firmware design

**Threading rule.** The async WebSocket callback runs in the network task. It must not touch motors. It only parses the message and pushes it into a small queue or "latest state" slot. A control loop in `loop()` runs every ~10 ms, and it alone:

1. pops incoming messages,
2. applies state filter (last `drive`/`spin` wins, `q` ordering),
3. runs the event queue (stop first, then turn),
4. runs the turn state machine (timed, non-blocking, `millis()` based, never `delay()`),
5. checks the failsafe (800 ms),
6. calls `motors.set(left, right)`,
7. sends `status` every 500 ms.

Use a FreeRTOS queue (or a short critical section) between the network task and the loop.

**Key behaviours to implement exactly (from the protocol):**

- New WebSocket client while one is connected → reject.
- Connect, disconnect or reconnect → clear queue, motors off, reset `q` counters.
- `stop` → clear queue, cancel turn (send `err cancelled` for that turn), motors off, `ack`.
- Duplicate event `q` → re-`ack`, never re-execute.
- During a turn: ignore `drive`/`spin`; a second `turn` gets `err busy`.
- Boot: all L298N inputs LOW before anything else.

**`config.h` contents:** pins (§12), `PWM_FREQ=1000`, `PWM_BITS=8`, `MIN_PWM=70`, `FAILSAFE_MS=800`, `TURN_PWM=200`, `TURN_MS_PER_DEG_RIGHT=4.5`, `TURN_MS_PER_DEG_LEFT=4.5`, `AP_SSID`, `AP_PASS`, `PROTOCOL_VERSION=4`, `FW_VERSION="1.0.0"`.

**`platformio.ini` (sketch):**

```ini
[env:esp32dev]
platform = espressif32
board = esp32dev
framework = arduino
board_build.filesystem = littlefs
monitor_speed = 115200
lib_deps =
    bblanchon/ArduinoJson@^7
    mathieucarbou/AsyncTCP
    mathieucarbou/ESPAsyncWebServer
build_flags = -DCORE_DEBUG_LEVEL=1

[env:native]
platform = native
test_framework = unity
build_src_filter = +<core/>
build_flags = -std=gnu++17 -Iinclude
```

Pin the exact library and platform versions after your first successful build (copy them from `pio pkg list`) so the project stays reproducible. If you stay on the standard `espressif32` platform (Arduino core 2.x), PWM uses `ledcSetup` + `ledcAttachPin`. Arduino core 3.x renamed this to `ledcAttach`, so keep that call inside `hal/motors.cpp` only.

---

## 4. Controller design

- **Stack:** Vite + TypeScript, no UI framework. The page is small, loads fast from the ESP32, and fits in flash. (React would work, but adds ~45 KB gzipped for little gain here.)
- **Build output** goes to `firmware/data/` as gzipped files, then `pio run -t uploadfs` writes it to LittleFS. The firmware serves it with `Content-Encoding: gzip`.
- **WebSocket URL** is built from `location.host` so the same build works from the robot and from the mock server.
- **Modules map 1:1 to protocol sections:** `state_sender` is §5 state rules, `event_sender` is §5 event rules, `joystick` is §6.1 dead zone and snapping, `ping`/`gauge` are §6.5 and §10.
- **Time handling:** every timer goes through an injectable clock so the Vitest tests can use fake timers.

**PWA caveat (important):** the page is served over plain `http://192.168.4.1`, which is not a secure context. Browsers will not register a service worker there, so "offline PWA" and the install prompt will not work. You do not need offline caching because the robot serves the page itself. A manifest plus "Add to Home Screen" may still give you a fullscreen shortcut on Android. Treat it as a bonus, not a requirement, and update §1 of the protocol wording from "PWA" to "web page".

**Phone gotcha:** Android and iOS may drop the `FootBot` network because it has no internet. Turn off mobile data while driving, and choose "stay connected" when prompted.

---

## 5. Mock robot

Node + TypeScript + `ws`. It implements the whole protocol on `ws://localhost:8080/ws`: hello/version check, ack, done, pong, status every 500 ms, 800 ms failsafe, duplicate-`q` handling, `busy`, `cancelled`, `queue_full`, single-client rejection. It also logs the computed left/right PWM for each `drive`, using the same vectors as the firmware. Add debug endpoints or flags to simulate packet loss, delayed acks and a server restart, which are needed for the controller checks in §13.3.

---

## 6. What to install on your PC

| Tool | Why | Notes |
|---|---|---|
| **VS Code** | editor | |
| **PlatformIO IDE** extension (installs PlatformIO Core and Python) | build, flash, tests, serial monitor | |
| **Node.js LTS** (22 or newer) + npm | controller, mock | `pnpm` optional |
| **Git** | version control | |
| **C/C++ compiler for `pio test -e native`** | PC-side unit tests | Windows: MinGW-w64 (`gcc`/`g++` on PATH, e.g. via MSYS2). Linux/macOS: already available |
| **CP210x USB driver** | flashing the ESP32 (CP2102 chip) | Windows may need it, macOS/Linux usually not |
| **Data-capable USB-C cable** | flashing | many cables are charge-only |
| **Serial monitor** | built into PlatformIO | 115200 baud |

Project dependencies (installed by the tools, not by hand):

- Firmware (PlatformIO): `ArduinoJson` 7, `AsyncTCP` and `ESPAsyncWebServer` (mathieucarbou forks), Unity (bundled with PlatformIO).
- Controller (npm): `vite`, `typescript`, `vitest`, `vite-plugin-compression` (gzip).
- Mock (npm): `ws`, `tsx`, `vitest`.

---

## 7. Hardware: how your parts connect

Your component list, plus what to add.

**Also buy or find:** an on-off switch, a ball caster (or skid) for the third contact point, chassis, jumper wires, a 2S 18650 protection board if your charger module has none, 100 µF + 100 nF capacitors, and a multimeter (needed to set the buck converter).

### Power

```
2×18650 (series, 7.4 V nominal / 8.4 V full)
   │
   ├──[switch]──┬──▶ L298N 12V input (motor supply)
   │            └──▶ LM2596 IN+  → set OUT to 5.0 V → ESP32 5V/VIN pin
   │                                              └──▶ L298N 5V pin
   └──▶ USB-C charger module BAT+/BAT− (charging, ideally with the switch OFF)

All grounds common: battery −, L298N GND, LM2596 −, ESP32 GND.
```

Steps and cautions:

1. **Set the LM2596 to 5.0 V with a multimeter before connecting the ESP32.** Turn the W103 trimmer with nothing attached to OUT.
2. **Remove the L298N `5V-EN` jumper** and feed its `5V` pin from the LM2596. The onboard 78M05 gets weak near 7 V input, and this keeps the logic supply stable when motors load the battery.
3. **Remove the ENA and ENB jumpers**, since the ESP32 drives those pins with PWM.
4. The L298N drops roughly 1.5 to 2 V, so the TT motors see about 5.5 to 6.5 V at a full battery. That is inside their 3 to 6 V rating, but the top end is warm, which is another reason to cap `s` in firmware if needed.
5. **Confirm the charger module is 2S** (8.4 V output) from the seller listing or silkscreen before connecting it to the pack. A 1S charger on a 2S pack is wrong and unsafe. Most simple chargers do not balance the two cells, so use matched cells charged to the same level, and prefer a 2S protection/balance board.
6. Add 100 nF across each motor's terminals and a 100 µF capacitor near the L298N supply to reduce noise that can reset the ESP32.
7. Never charge the pack unattended, and never short or reverse the cells.

### Signals (from PROTOCOL §12)

| Function | ESP32 | L298N |
|---|---|---|
| Left PWM | GPIO25 | ENA |
| Left dir | GPIO26 / GPIO27 | IN1 / IN2 |
| Right dir | GPIO32 / GPIO33 | IN3 / IN4 |
| Right PWM | GPIO13 | ENB |
| Status LED | GPIO2 | onboard |

If a wheel spins the wrong way, swap that motor's two wires (protocol rule), not the code.

---

## 8. Build order

Each phase ends with something that passes tests before moving on.

1. **Repo skeleton**: folders, `README`, `shared/test-vectors.json`, PlatformIO and Vite projects that build empty.
2. **Firmware `core/`** with native tests: mixing (all vectors in §7), turn duration (90° → 405 ms, 180° → 810 ms), event queue, state filter, failsafe. Nothing touches hardware yet.
3. **Protocol parse/encode** with tests for malformed JSON, out-of-range fields and the 128-byte limit.
4. **Mock robot** passing its own protocol tests.
5. **Controller** against the mock: joystick, heartbeat, event resend, gauge, reconnect.
6. **Firmware hardware layer**: wiring checks with wheels off the ground, flash, then bring up Wi-Fi AP, LittleFS page, WebSocket, then motors.
7. **Integration on hardware** (human, wheels up): each of the 16 directions, spin, turns, stop, failsafe (turn off phone Wi-Fi), reconnect.
8. **Calibration** of `TURN_MS_PER_DEG_*` following `docs/calibration.md`, then a floor test with the robot driving.
9. **Polish**: change the SSID and password, battery voltage display (optional, would need a voltage divider on an ADC pin and a protocol change), competition checklist.

---

## 9. Open points in the protocol to settle first

- §9 lists a `turn` field in the robot `hello`, but §3 shows `hello` with only `v` and `fw`. Decide whether it exists (and what it carries) or remove it.
- §1 says PWA; see the secure-context note in §4 above.
- The direction names for `d = 3, 5, 11, 13` ("mostly turning") do not match what the §7 formula does (for example `d = 5` drives the left wheel forward and the right wheel back, which is a forward-biased spin). The protocol says the formula wins, so just keep the formula and tests authoritative and fix the names if they confuse you.
- Decide the maximum `s` for a fresh battery (a 6 V motor on a 6.5 V supply at 255 is hot and short-lived).
