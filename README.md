# FootBot: Differential-Drive Football Robot

FootBot is an ESP32-based competitive football robot featuring dual DC motors (differential drive) powered by an L298N H-bridge driver. The robot hosts its own Wi-Fi Access Point (`FootBot`), serves a high-performance web controller to smartphones at `http://192.168.4.1/`, and receives control commands over an 800 ms failsafe WebSocket (`ws://192.168.4.1/ws`).

---

## 1. System Architecture

```
Phone (Mobile Browser)  ──Wi-Fi AP "FootBot"──▶  ESP32 DevKit  ──▶  L298N Driver  ──▶  2× TT Motors
Controller Web Page         WebSocket JSON        Firmware          H-Bridge        (Differential Drive)
Served from LittleFS      ws://192.168.4.1/ws    PlatformIO C++
```

- **Protocol:** Version 4 text-based JSON WebSocket contract (see [DOC/PROTOCOL.md](DOC/PROTOCOL.md)).
- **Firmware:** PlatformIO C++ project with hardware-independent pure logic in `core/` and modular HAL/Net layers (see [DOC/ARCHITECTURE.md](DOC/ARCHITECTURE.md)).
- **Controller:** Zero-framework vanilla TypeScript application built with Vite and gzipped for LittleFS flash storage.
- **Mock Robot:** Node.js + TypeScript simulation server for full browser and unit testing without hardware.

---

## 2. Repository Layout

```
footbot/
├── DOC/
│   ├── PROTOCOL.md              # Single source of truth: protocol contract (v4)
│   ├── ARCHITECTURE.md          # Architecture, directory layout, and design
│   ├── AGENTS.md                # Agent guide, doc-sync golden rule, project log
│   ├── TESTING.md               # Automated and manual verification reports
│   └── EXECUTION.md             # End-to-end setup and operation guide
├── docs/                        # Hardware documentation
│   ├── wiring.md                # Electrical pinout, motor connections, decoupling
│   ├── power.md                 # 2S battery, LM2596 buck converter setup, safety
│   ├── calibration.md           # Turn calibration procedure and test log
│   └── hardware-checklist.md    # Wheels-off bench verification checklist
├── shared/
│   └── test-vectors.json        # Shared mixing and turn duration test vectors
├── firmware/                    # PlatformIO ESP32 firmware
│   ├── platformio.ini           # Build environments (esp32dev and native)
│   ├── include/config.h         # Single source of truth for pins and constants
│   ├── src/core/                # Pure logic: mixing, turns, queue, failsafe
│   ├── src/protocol/            # JSON parse and encode
│   ├── src/hal/                 # Hardware abstraction: motors and status LED
│   └── src/net/                 # Soft-AP, LittleFS web server, WebSocket server
├── controller/                  # Web controller (Vite + TypeScript)
│   ├── src/                     # Joystick, buttons, state/event senders, UI
│   └── tests/                   # Vitest unit test suite
├── tools/mock-robot/            # Mock robot server (Node.js + TypeScript)
│   ├── src/                     # Mock server, model, mixing logic
│   └── tests/                   # Protocol verification tests
├── scripts/
│   ├── build-controller.mjs     # Compiles and gzips controller into firmware/data/
│   └── dev.mjs                  # Concurrent mock robot + controller dev server
└── AGENTS.md                    # Root pointer to DOC/AGENTS.md
```

---

## 3. Quick Start (No Hardware Required)

You can run and test the complete web controller against the simulated robot on any computer:

```bash
# 1. Install dependencies
cd controller && npm install
cd ../tools/mock-robot && npm install
cd ..

# 2. Start mock robot and controller concurrently
node scripts/dev.mjs
```

Open your browser to `http://localhost:5173/`. The controller automatically connects to the mock robot at `ws://localhost:8080/ws`.

---

## 4. Hardware Assembly & Wiring Summary

1. **Power Configuration:**
   - 2S Li-ion battery (7.4 V nominal, 8.4 V peak) feeds through a main power switch.
   - Buck converter (LM2596) **must be calibrated to 5.00 V with a multimeter** before connecting to the ESP32 `5V/VIN` pin and L298N `5V` pin.
   - L298N `5V-EN` jumper **must be removed**.
   - L298N `ENA` and `ENB` jumpers **must be removed** (driven by ESP32 PWM).
   - Detailed guide: [docs/power.md](docs/power.md).
2. **Signal Pinout:**
   - Left PWM: `GPIO25` (ENA)
   - Left Direction: `GPIO26` (IN1), `GPIO27` (IN2)
   - Right Direction: `GPIO32` (IN3), `GPIO33` (IN4)
   - Right PWM: `GPIO13` (ENB)
   - Status LED: `GPIO2` (onboard)
   - Detailed pinout: [docs/wiring.md](docs/wiring.md).

---

## 5. Building & Flashing Firmware

```bash
# 1. Build controller and export gzipped files to firmware/data/
node scripts/build-controller.mjs

# 2. Flash LittleFS filesystem containing the web controller
cd firmware
pio run -t uploadfs

# 3. Flash ESP32 firmware
pio run -t upload

# 4. Open serial monitor (115200 baud)
pio device monitor
```

---

## 6. Testing & Calibration

- Comprehensive testing procedures and run logs: [DOC/TESTING.md](DOC/TESTING.md).
- Bench hardware checklist (wheels off the ground): [docs/hardware-checklist.md](docs/hardware-checklist.md).
- Timed turn calibration protocol: [docs/calibration.md](docs/calibration.md).
- End-to-end execution guide: [DOC/EXECUTION.md](DOC/EXECUTION.md).
