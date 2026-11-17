# FootBot: Wiring & Connections Guide

This document describes the electrical wiring between the ESP32 DevKit, the L298N dual H-bridge motor driver, power regulators, and the two TT DC motors (differential drive).

---

## 1. ESP32 to L298N Signal Connections

| Function | ESP32 Pin | L298N Terminal / Pin | Wire Color (Suggested) | Notes |
|---|---|---|---|---|
| Left Motor PWM | **GPIO25** | **ENA** | Yellow | Remove L298N ENA jumper |
| Left Motor Dir 1 | **GPIO26** | **IN1** | Green | Forward when HIGH |
| Left Motor Dir 2 | **GPIO27** | **IN2** | Blue | Backward when HIGH |
| Right Motor Dir 1 | **GPIO32** | **IN3** | White | Forward when HIGH |
| Right Motor Dir 2 | **GPIO33** | **IN4** | Orange | Backward when HIGH |
| Right Motor PWM | **GPIO13** | **ENB** | Gray | Remove L298N ENB jumper |
| Status LED | **GPIO2** | Onboard | N/A | Fast blink = searching, Solid = connected |
| Common Ground | **GND** | **GND** | Black | Must tie to common ground rail |

---

## 2. Motor Terminal Connections

| Motor | L298N Terminals | Forward Truth Table | Reverse Truth Table |
|---|---|---|---|
| **Left TT Motor** | OUT1, OUT2 | IN1=HIGH, IN2=LOW | IN1=LOW, IN2=HIGH |
| **Right TT Motor** | OUT3, OUT4 | IN3=HIGH, IN4=LOW | IN3=LOW, IN4=HIGH |

> [!IMPORTANT]
> **Motor Direction Rule:** Positive PWM commands correspond to forward motion for each wheel. If either wheel spins in reverse when commanded forward during testing, **swap the two wires of that motor at the L298N screw terminals**. Do **NOT** modify firmware or controller logic.

---

## 3. L298N Jumper Configurations

1. **Remove the `5V-EN` (Logic Enable) Jumper:**
   - The L298N internal 78M05 linear regulator becomes unstable when battery voltage dips under motor load.
   - Removing this jumper isolates the internal regulator.
   - Power the L298N `5V` logic input terminal directly from the regulated 5.0 V line of the LM2596 buck converter.
2. **Remove ENA and ENB Jumpers:**
   - Both jumpers must be removed so that the ESP32 can feed 1 kHz 8-bit PWM signals directly into ENA and ENB.

---

## 4. Noise Suppression & Decoupling

Electrical noise from brushed TT motors and PWM switching can trigger Brownout Resets (BOR) on the ESP32:
- Solder a **100 nF (0.1 µF) ceramic capacitor** directly across the two terminals of each TT motor.
- Add an additional 100 nF ceramic capacitor from each terminal to the metal motor casing if severe interference persists.
- Place a **100 µF to 470 µF electrolytic capacitor** (rated 16V or higher) across the 12V and GND terminals of the L298N driver board.

---

## 5. Wiring Diagram Summary

```
                      +-------------------+
                      | LM2596 Buck Conv  |
                      | (Preset to 5.0 V) |
                      +---------+---------+
                                |
             +------------------+------------------+
             | +5.0V                               | +5.0V
             v                                     v
       +-----------+                         +-----------+
       |   ESP32   |                         |   L298N   |
       |  5V / VIN |                         |  5V Logic |
       +-----+-----+                         +-----+-----+
             | GPIO25 (PWM)  -----> ENA            |
             | GPIO26 (Dir)  -----> IN1            | OUT1, OUT2 ---> Left TT Motor
             | GPIO27 (Dir)  -----> IN2            |
             | GPIO32 (Dir)  -----> IN3            | OUT3, OUT4 ---> Right TT Motor
             | GPIO33 (Dir)  -----> IN4            |
             | GPIO13 (PWM)  -----> ENB            |
             |                                     | 12V Terminal <--- Battery + (via Switch)
             | GND                                 | GND
             +---+---------------------------------+---+
                 |                                     |
                 +-----------------+-------------------+
                                   | Common GND Rail
                                   v
                             Battery (-)
```
