# FootBot: Hardware Bring-Up & Verification Checklist

This checklist corresponds to **PROTOCOL.md §13.4** and **ARCHITECTURE.md Phase 6 & 7**.
Perform these tests with the robot on a stand with **WHEELS OFF THE GROUND**.

> [!CAUTION]
> Never connect motors to the ground during initial tests. If a motor polarity is inverted, the robot could drive off the bench.

---

## 1. Pre-Power Safety Checks

- [ ] LM2596 buck converter output measured with multimeter at **5.00 V ± 0.05 V** with output disconnected.
- [ ] L298N `5V-EN` jumper **REMOVED**.
- [ ] L298N `ENA` and `ENB` jumpers **REMOVED**.
- [ ] Common ground rail confirmed between Battery (-), LM2596 GND, L298N GND, and ESP32 GND.
- [ ] 2S Li-ion battery voltage checked: between 7.4 V and 8.4 V.

---

## 2. Boot & Standby (Wheels Off Ground)

- [ ] Turn power switch **ON**.
- [ ] **Motors remain completely silent and motionless.**
- [ ] ESP32 onboard LED (GPIO2) starts **fast blinking** (~2 Hz), indicating access point active and waiting for controller.
- [ ] No smoke, no hot components, LM2596 LED is lit.

---

## 3. Wi-Fi & Web Controller Link

- [ ] Phone / PC Wi-Fi scan detects SSID **`FootBot`**.
- [ ] Connect with password **`footbot123`**. (Turn off mobile data on phones).
- [ ] Open browser to **`http://192.168.4.1/`**. Page loads cleanly.
- [ ] ESP32 onboard LED transitions to **solid ON**, indicating WebSocket client accepted.
- [ ] Connection gauge displays **Connected, good** (RTT < 100 ms) and valid RSSI (e.g., -40 to -60 dBm).

---

## 4. Direction & Motor Truth Table Tests (PROTOCOL.md §7 & §8)

Place finger gently against tires to confirm rotation direction:

| Command | Expected Left Wheel | Expected Right Wheel | Result Pass/Fail | If Fails, Check |
|---|---|---|---|---|
| **Forward (`d=0`)** | Forward (CW) | Forward (CW) | [ ] Pass | Swap motor wires if spinning reverse |
| **Backward (`d=8`)** | Reverse (CCW) | Reverse (CCW) | [ ] Pass | Swap motor wires |
| **Spin Right (`d=4` or Spin R)** | Forward (CW) | Reverse (CCW) | [ ] Pass | Check IN1/IN2 vs IN3/IN4 |
| **Spin Left (`d=12` or Spin L)** | Reverse (CCW) | Forward (CW) | [ ] Pass | Check IN1/IN2 vs IN3/IN4 |
| **Forward-Right (`d=2`)** | Forward (CW) | Stopped (0) | [ ] Pass | Check right channel PWM / IN3 / IN4 |
| **Forward-Left (`d=14`)** | Stopped (0) | Forward (CW) | [ ] Pass | Check left channel PWM / IN1 / IN2 |
| **Speed Slider** | PWM scales proportionally | PWM scales proportionally | [ ] Pass | Check ENA/ENB PWM pins |

---

## 5. Event & Timed Turn Tests

- [ ] **Turn +90°:** Left motor forward, right motor reverse for ~405 ms, then stops cleanly.
- [ ] **Turn -90°:** Left motor reverse, right motor forward for ~405 ms, then stops cleanly.
- [ ] **Turn +180°:** Left motor forward, right motor reverse for ~810 ms, then stops cleanly.
- [ ] **Turn -180°:** Left motor reverse, right motor forward for ~810 ms, then stops cleanly.
- [ ] **Emergency STOP:** Press STOP during a 180° turn; motors halt **immediately**, turn cancels.

---

## 6. Safety & Failsafe Tests (PROTOCOL.md §11)

- [ ] **800 ms Failsafe:** While commanding forward motion, turn off phone Wi-Fi. Both wheels must stop within **~1 second**.
- [ ] **Reconnection:** Turn phone Wi-Fi back on. Controller reconnects within 1-2 s; motors remain stopped until user touches joystick.
- [ ] **Single Client Enforcement:** Try opening `http://192.168.4.1/` from a second device while connected. Second connection is rejected; primary client remains in control.

---

## 7. Hardware Sign-Off

- **Inspector Name:** _____________________
- **Date Tested:** _________________________
- **Battery Voltage at Sign-Off:** _________ V
- **Status:** [ ] Ready for Floor Calibration / [ ] Needs Wiring Fix

