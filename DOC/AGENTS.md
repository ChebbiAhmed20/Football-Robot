# AGENTS.md: FootBot working guide

Read this file first, every session. It holds the commands you run all the time, the rules you must follow, and the project log.
(If your tool expects `CLAUDE.md`, copy or symlink this file to that name.)

Companion files: `PROTOCOL.md` (the contract), `ARCHITECTURE.md` (folders and design).

---

## 0. THE GOLDEN RULE: keep the documentation in sync

**Every time you change anything (code, config, wiring, protocol, constants, commands, folders), you must in the same task:**

1. Update every document the change affects (see the table in section 4).
2. Add an entry to the **Project log** (section 7) with **when, where, what, why, and how it was verified**.
3. If a command, folder, file name or install step changed, update this file's sections 2, 3 and 5.

A task is **not finished** until the docs and the log match the code. If you are unsure whether a doc is affected, update it anyway or say so in the log entry.

---

## 1. Project in one paragraph

ESP32 football robot (L298N + 2 TT motors, differential drive). A phone opens a web page served by the ESP32 over its own Wi-Fi access point (`http://192.168.4.1/`) and talks to it through a JSON WebSocket (`ws://192.168.4.1/ws`). Three parts: `firmware/` (PlatformIO, C++), `controller/` (Vite + TypeScript page), `tools/mock-robot/` (Node mock for hardware-free testing). Shared test numbers are in `shared/test-vectors.json`.

---

## 2. Commands I use all the time

Run from the repo root unless stated. Commands marked (after P#) only exist once that build phase from `ARCHITECTURE.md` section 8 is done.

### Firmware (`cd firmware`)

| Goal | Command |
|---|---|
| Build | `pio run` |
| Flash firmware | `pio run -t upload` |
| Build and flash the web page (LittleFS) | `pio run -t uploadfs` |
| Serial monitor (115200) | `pio device monitor` |
| Flash + monitor | `pio run -t upload && pio device monitor` |
| List serial ports | `pio device list` |
| PC unit tests (no hardware) | `pio test -e native` |
| One test suite | `pio test -e native -f test_mixing` |
| Clean build | `pio run -t clean` |
| Show installed libraries and versions | `pio pkg list` |
| Update libraries | `pio pkg update` (then log the new versions) |

Specific port: add `--upload-port COM5` (Windows) or `--upload-port /dev/ttyUSB0` (Linux).
If upload hangs on "Connecting...": hold the BOOT button on the ESP32 until it starts writing.

### Controller (`cd controller`)

| Goal | Command |
|---|---|
| Install dependencies | `npm install` |
| Dev server with hot reload | `npm run dev` |
| Unit tests | `npm test` |
| Type check | `npx tsc --noEmit` |
| Production build into `firmware/data/` (gzipped) | `npm run build` |

### Mock robot (`cd tools/mock-robot`)

| Goal | Command |
|---|---|
| Install | `npm install` |
| Start mock on `ws://localhost:8080/ws` | `npm start` |
| Mock protocol tests | `npm test` |

### Whole project (after P5)

| Goal | Command |
|---|---|
| Mock + controller dev together | `node scripts/dev.mjs` |
| Build controller, then flash page to robot | `node scripts/build-controller.mjs && (cd firmware && pio run -t uploadfs)` |
| Run every automated test | `(cd firmware && pio test -e native) && (cd controller && npm test) && (cd tools/mock-robot && npm test)` |

### Git

```
git status
git add -A && git commit -m "type(scope): short why"     # types: feat fix docs test chore refactor
git log --oneline -15
```

### First-time setup checklist

1. Install VS Code + PlatformIO extension, Node.js LTS, Git.
2. Windows only: MinGW-w64 (`g++` on PATH) for `pio test -e native`; CP210x driver if the ESP32 is not detected.
3. `cd controller && npm install`, `cd ../tools/mock-robot && npm install`.
4. Use a USB-C cable that carries data, not charge-only.

---

## 3. Where things live

```
PROTOCOL.md  ARCHITECTURE.md  AGENTS.md  README.md
docs/        wiring.md power.md calibration.md hardware-checklist.md
shared/      test-vectors.json
firmware/    platformio.ini  include/config.h  src/{core,protocol,hal,net}  test/  data/(generated)
controller/  src/{protocol,net,input,ui,state}  tests/
tools/mock-robot/  src/  tests/
scripts/     build-controller.mjs  dev.mjs
```

Full tree and reasons: `ARCHITECTURE.md` section 2.

---

## 4. Which doc to update for which change

| If you change... | Update these |
|---|---|
| A message, field, range, timing or behaviour | `PROTOCOL.md` (first!), its change log and version if breaking, firmware, mock, controller, tests, `shared/test-vectors.json` |
| A pin, wiring, jumper or power part | `include/config.h`, `PROTOCOL.md` section 12, `docs/wiring.md`, `docs/power.md` |
| `TURN_*` constants or calibration | `include/config.h`, `docs/calibration.md` (add the measurement), `PROTOCOL.md` section 6.4 if defaults change |
| A command, script, install step or tool version | `AGENTS.md` sections 2 and 5, `README.md` |
| Folder or file added, moved or removed | `ARCHITECTURE.md` section 2, `AGENTS.md` section 3 |
| A library or platform version | `firmware/platformio.ini` or `package.json`, `AGENTS.md` section 5, log entry with old to new version |
| Any hardware test result | `docs/hardware-checklist.md` |
| Anything at all | the **Project log** (section 7) |

---

## 5. Pinned versions (keep current)

Fill these in after the first successful build, and update on every change.

| Item | Version |
|---|---|
| PlatformIO platform `espressif32` | _not pinned yet_ |
| Arduino core | _not pinned yet_ |
| ArduinoJson | _not pinned yet (^7)_ |
| AsyncTCP / ESPAsyncWebServer (mathieucarbou) | _not pinned yet_ |
| Node.js | _not pinned yet (LTS)_ |
| Vite / TypeScript / Vitest | _not pinned yet_ |

---

## 6. Rules for the agent

**Process**
1. Read `PROTOCOL.md` and the newest entries of the Project log before changing anything.
2. Protocol first: when behaviour changes, edit `PROTOCOL.md`, then firmware, mock and controller, then the tests. Never leave the three sides disagreeing.
3. Work in small steps. After each step run the relevant tests (section 2) and fix failures before moving on.
4. Do not say something works unless you ran it. Write what you ran and the result in the log.
5. Do not delete or weaken a test to make it pass. If a test is wrong, explain why in the log.
6. Ask the human when a decision is theirs (SSID/password, speed limits, hardware changes, protocol version bumps).

**Firmware**
7. All pins, timings and constants live only in `include/config.h`. No magic numbers elsewhere.
8. Never use `delay()` in the control path. Use `millis()` state machines.
9. `src/core/` must stay pure C++ with no `Arduino.h`, so it runs under `pio test -e native`.
10. The network callback only parses and enqueues. Only the control loop touches the motors.
11. Safety is non-negotiable: boot with all L298N inputs LOW, failsafe 800 ms, motors off on disconnect, `stop` always wins (`PROTOCOL.md` section 11).
12. Keep messages at or under 128 bytes.
13. Wheels-off-the-ground hardware tests are done by the human. Never mark one as passed yourself, only prepare the checklist.

**Controller**
14. Use the injectable clock for every timer so tests can fake time.
15. Constants (250 ms, 150 ms, 5 tries, 15 % dead zone, 22.5 degrees) come from `controller/src/protocol/constants.ts` and must match `PROTOCOL.md`.
16. The WebSocket URL is built from `location.host`, never hard-coded.

**Repository**
17. Never commit secrets or real competition Wi-Fi passwords. `firmware/data/` is generated and git-ignored.
18. Make one commit per logical change, with a message that says why.
19. Do not rename or move files without updating the docs (section 4).

---

## 7. Project log

Newest entries first. **One entry per change**, written when you make the change, not later.

### Entry template (copy this)

```
### YYYY-MM-DD HH:MM (Africa/Tunis): short title
- **Where:** files / folders / hardware touched
- **What:** what changed (old → new for values)
- **Why:** the reason or the problem it solves
- **Verified:** exact commands run and results (or "not verified" and why)
- **Docs updated:** list of docs changed (or "none needed" and why)
- **Follow-ups:** open items, if any
```

### Entries

### 2026-11-17 03:02 (Africa/Tunis): Applied pre-decided protocol clarifications
- **Where:** `DOC/PROTOCOL.md` (§1, §6.1, §9, §14), `AGENTS.md` (root pointer)
- **What:** Removed `turn` field from robot `hello` table in §9; updated "PWA" to "web page" in §1; added note in §6.1 that names for d = 3, 5, 11, 13 are approximate; logged clarifications in §14 change log; created root `AGENTS.md` pointing to `DOC/AGENTS.md`.
- **Why:** Protocol consistency as mandated by pre-decisions in project brief.
- **Verified:** Inspected `DOC/PROTOCOL.md` and verified sections match specifications.
- **Docs updated:** `DOC/PROTOCOL.md`, `DOC/AGENTS.md`, `AGENTS.md`.
- **Follow-ups:** Proceed with repository skeleton and build phases.

### 2026-11-17 02:54 (Africa/Tunis): Added AGENTS.md
- **Where:** `AGENTS.md` (new, repo root)
- **What:** Created the working guide: repeated commands, doc-sync rule, agent rules, project log.
- **Why:** Avoid retyping commands every session and make sure every change is documented with when, where and why, and that any agent follows the same rules.
- **Verified:** Not verified. Commands are written from the planned layout and several exist only after the build phases in `ARCHITECTURE.md` section 8.
- **Docs updated:** `AGENTS.md` only.
- **Follow-ups:** Pin versions in section 5 after the first successful build. Resolve the open protocol points in `ARCHITECTURE.md` section 9.

### 2026-11-17 02:42 (Africa/Tunis): Initial architecture
- **Where:** `ARCHITECTURE.md` (new)
- **What:** Defined the folder layout, firmware and controller design, install list, power and wiring plan, and the build order.
- **Why:** Needed a single plan before writing code.
- **Verified:** Not applicable (documentation only).
- **Docs updated:** `ARCHITECTURE.md`.
- **Follow-ups:** Decide the `hello` `turn` field, replace "PWA" with "web page" in `PROTOCOL.md`, choose the maximum `s` for a fresh battery.
