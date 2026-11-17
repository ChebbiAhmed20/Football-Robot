# FootBot: Turn Calibration Procedure & Log

This guide explains how to calibrate the timed turn constants (`TURN_MS_PER_DEG_RIGHT` and `TURN_MS_PER_DEG_LEFT`) defined in `firmware/include/config.h` and `DOC/PROTOCOL.md` §6.4.

---

## 1. Principle of Timed Turns

Because FootBot uses open-loop TT DC motors without wheel encoders or an IMU, turns are executed by open-loop timing:
- Motors spin in opposite directions at fixed speed `TURN_PWM = 200`.
- Duration in milliseconds is computed as:
  $$\text{Duration (ms)} = |a| \times \text{TURN\_MS\_PER\_DEG}$$
- Defaults:
  - `TURN_PWM = 200`
  - `TURN_MS_PER_DEG_RIGHT = 4.5` (ms per degree clockwise)
  - `TURN_MS_PER_DEG_LEFT = 4.5` (ms per degree counter-clockwise)

---

## 2. Step-by-Step Calibration Procedure

1. **Battery State:** Fully charge the 2S battery pack (~8.4 V). Angular velocity decreases as battery voltage sags.
2. **Surface Selection:** Place the robot on the actual competition playing surface (e.g., smooth wood, vinyl, or low-pile felt).
3. **Reference Line:** Mark a clear starting reference line on the floor with masking tape, aligned with the robot's center axis.
4. **Clockwise (Right) Test:**
   - Command a **+90° Turn** via the controller web interface.
   - Using a protractor or angle template, measure the actual angle turned $\theta_{\text{measured}}$.
   - Repeat 5 to 10 times to compute the average angle.
5. **Calculate New Constant:**
   $$\text{Constant}_{\text{new}} = \text{Constant}_{\text{old}} \times \frac{90.0}{\theta_{\text{measured}}}$$
   *Example:* If default is 4.5 ms/deg and robot turns only 80°, new constant = $4.5 \times (90 / 80) = 5.06$ ms/deg.
6. **Counter-Clockwise (Left) Test:**
   - Repeat the procedure with **-90° Turn** to calibrate `TURN_MS_PER_DEG_LEFT`.
7. **Verification Test:**
   - Test **180° Turn** in both directions to verify proportionality.
8. **Update Firmware:**
   - Update `TURN_MS_PER_DEG_RIGHT` and `TURN_MS_PER_DEG_LEFT` in `firmware/include/config.h`.
   - Re-flash the ESP32: `pio run -t upload`.

---

## 3. Calibration Log Sheet

Record all field calibration runs in this table:

| Date & Time | Battery (V) | Surface | Direction | Old Constant | Target | Measured Avg | New Constant | Notes |
|---|---|---|---|---|---|---|---|---|
| Initial default | 8.4 V | Lab bench | Right (+90°) | 4.50 | 90° | _uncalibrated_ | 4.50 | Factory baseline |
| Initial default | 8.4 V | Lab bench | Left (-90°) | 4.50 | 90° | _uncalibrated_ | 4.50 | Factory baseline |
| | | | | | | | | |
| | | | | | | | | |
| | | | | | | | | |

---

## 4. Known Drift Factors & Mitigations

- **Battery Sag:** As battery drops from 8.4 V to 7.4 V, turns will undershoot by 5°–15°. Keep spare packs charged.
- **Tire Dust:** TT rubber tires collect dust and slip on slick floors. Wipe tires with isopropyl alcohol before matches.
- **Surface Friction:** Moving from wooden floor to foam tiles will change turn resistance significantly. Re-calibrate whenever venue surface changes.

