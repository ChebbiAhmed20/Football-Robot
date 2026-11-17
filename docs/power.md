# FootBot: Power System & Battery Guide

This document describes the power distribution, buck converter setup, battery specifications, and safety precautions for the FootBot robot.

---

## 1. Power Distribution Schematic

```
2S 18650 Li-Ion Battery Pack (7.4 V nominal, 8.4 V peak)
   │
   ├──[ Power Switch (DPST / SPST) ]──┬──▶ L298N "12V" Terminal (Motor Power)
   │                                   └──▶ LM2596 IN+ (Buck Converter Input)
   │
   └──▶ USB-C 2S Charger Module BAT+ / BAT- (Charging input with switch OFF)

Regulated Rails:
LM2596 OUT+ (Precisely 5.0 V) ───────┬──▶ ESP32 5V / VIN Pin
                                      └──▶ L298N 5V Logic Pin (5V-EN jumper removed!)

Common Ground Rail:
Battery (-) ─── LM2596 IN- / OUT- ─── L298N GND ─── ESP32 GND
```

---

## 2. Voltage Levels & Motor Operating Ratings

| Component | Supply Voltage | Source | Rating & Behaviour |
|---|---|---|---|
| **ESP32 DevKit** | 5.0 V DC | LM2596 Buck OUT | Draws ~180 mA average, up to 350 mA Wi-Fi bursts. |
| **L298N Logic** | 5.0 V DC | LM2596 Buck OUT | Logic supply (< 35 mA). Jumper `5V-EN` must be OFF. |
| **L298N Motor Bridge** | 7.4 V – 8.4 V DC | Switched Battery (+) | Feeds the internal bipolar H-bridge. |
| **TT Gearbox Motors** | ~5.5 V – 6.5 V DC | L298N OUT1–OUT4 | Rated for 3.0 V to 6.0 V. |

### L298N Voltage Drop & `PWM_CAP`
The L298N bipolar junction transistors incur an internal saturation voltage drop of approximately **1.5 V to 2.0 V** under motor load.
- At full 8.4 V battery charge: Motors receive $8.4 - 1.8 \approx 6.6\text{ V}$.
- At nominal 7.4 V: Motors receive $7.4 - 1.8 \approx 5.6\text{ V}$.
- TT motors can operate up to 6 V continuously, but running continuously at 6.6 V causes heat buildup. `PWM_CAP` in `firmware/include/config.h` (default 255) can be reduced (e.g. to 220) if motors run too warm.

---

## 3. Mandatory Buck Converter Calibration Procedure

> [!CAUTION]
> **DO NOT connect the ESP32 or L298N logic pin until this procedure is complete!**
> Factory-delivered LM2596 modules often have their trimmers set to maximum input voltage (or floating). Feeding >5.5 V into the ESP32 5V pin will permanently destroy the microcontroller.

1. Connect the 2S battery pack (via switch) to the LM2596 `IN+` and `IN-` terminals. Leave `OUT+` and `OUT-` disconnected from all other circuits.
2. Turn the power switch **ON**.
3. Set your digital multimeter to **DC Volts (20V scale)**.
4. Place the multimeter probes on LM2596 `OUT+` (red) and `OUT-` (black).
5. Using a small flathead screwdriver, rotate the brass screw on the blue multi-turn trimmer potentiometer (labeled `W103`):
   - Rotate counter-clockwise (typically 10 to 20 full turns) until the multimeter reading drops.
   - Fine-tune until the output voltage reads exactly **`5.00 V`** (allowable range: `4.95 V` to `5.05 V`).
6. Turn the power switch **OFF** before wiring the `OUT+` terminal to the ESP32 and L298N.

---

## 4. Charging & Battery Safety

1. **2S Verification:** Ensure the USB-C charger board is explicitly rated for **2S (8.4 V cut-off)**. Connecting a 1S charger (4.2 V) will not charge the pack; connecting an incorrect voltage will create a severe fire hazard.
2. **Cell Balancing & Protection (BMS):** Use matched 18650 cells of the same capacity and discharge rating. It is strongly recommended to incorporate a 2S BMS protection circuit (over-charge, over-discharge, short-circuit protection).
3. **Switch State During Charging:** Always set the main power switch to **OFF** when plugging in the USB-C charger to prevent back-powering motors and regulators while charging.
4. **Never Charge Unattended:** Charge on a fire-resistant surface and monitor battery temperature. Disconnect immediately if cells become uncomfortably hot to the touch.
