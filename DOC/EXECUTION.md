# FootBot: End-to-End Execution & User Manual

This is a comprehensive, step-by-step operational guide for setting up, building, flashing, and driving the FootBot football robot from a clean machine.

---

## 1. Prerequisites & Tool Installation

Install these tools on your development computer:

1. **VS Code:** Download and install from [code.visualstudio.com](https://code.visualstudio.com/).
2. **PlatformIO IDE Extension:** Inside VS Code, open the Extensions tab (`Ctrl+Shift+X`), search for **PlatformIO IDE**, and click Install. (This installs Python and PlatformIO Core automatically).
3. **Node.js LTS (v20 or v22):** Download and install from [nodejs.org](https://nodejs.org/).
4. **Git:** Download and install from [git-scm.com](https://git-scm.com/).
5. **C/C++ Compiler (Windows only, for `pio test -e native`):** Install MinGW-w64 (via MSYS2 or WinLibs) and ensure `g++` is added to your system `PATH`.
6. **CP210x USB to UART Driver:** If your computer does not recognize the ESP32 when connected via USB, download and install the Silicon Labs CP210x driver from [silabs.com](https://www.silabs.com/developers/usb-to-uart-bridge-vcp-drivers).
7. **USB-C Data Cable:** Ensure you are using a 4-conductor USB-C cable capable of data transfer, not a charge-only cable.

---

## 2. Project Setup

Open a terminal in the project repository root:

```bash
# Install controller dependencies
cd controller
npm install

# Install mock robot dependencies
cd ../tools/mock-robot
npm install

# Return to repository root
cd ../..
```

---

## 3. Running Without Hardware (Mock Robot & Web Controller)

You can run and test the complete system on your laptop without any robot hardware:

```bash
node scripts/dev.mjs
```

1. This starts the **Mock Robot server** on port 8080 (`ws://localhost:8080/ws`) and the **Vite dev server** on port 5173.
2. Open your web browser to **`http://localhost:5173/`**.
3. **What you should see:**
   - Dark-themed dashboard with the title **FootBot**.
   - Top right connection gauge turns green with a pulsing dot: **"Connected (Good)"** and low latency (< 10 ms).
   - Interactive virtual joystick pad with dead zone circle and crosshairs.
   - Spin Left and Spin Right buttons.
   - Timed turn buttons (-90°, +90°, -180°, +180°).
   - Speed slider initialized to 200 (range 80–255).
   - Big red emergency **STOP** button.
4. Drag the joystick and watch live PWM logs print in the terminal window.

---

## 4. Hardware Assembly Order & Critical Precautions

Before turning on power or connecting wires, review [docs/wiring.md](file:///c:/Users/MSI/Desktop/FOOTBALLROBOT/docs/wiring.md) and [docs/power.md](file:///c:/Users/MSI/Desktop/FOOTBALLROBOT/docs/power.md):

> [!CAUTION]
> **CRITICAL VOLTAGE ADJUSTMENT:**
> Factory LM2596 buck converters are often set to unregulated voltages (>8 V).
> 1. Connect battery to LM2596 input with the output **completely disconnected**.
> 2. Measure output with a digital multimeter.
> 3. Turn the brass screw on the blue trimmer potentiometer until the output reads **exactly 5.00 V**.
> 4. Connecting >5.5 V to the ESP32 will permanently destroy it.

### Assembly Steps:
1. **Remove L298N Jumpers:**
   - **Remove the `5V-EN` jumper** (powers logic directly from the calibrated 5.0 V buck rail).
   - **Remove the `ENA` and `ENB` jumpers** (ESP32 drives them directly via PWM).
2. **Verify 2S Charger:** Inspect your USB-C charger board silkscreen to confirm it is rated for **2S (8.4 V)**. Never use a 1S charger.
3. **Common Ground:** Tie Battery (-), LM2596 GND, L298N GND, and ESP32 GND together to a common ground rail.
4. **Decoupling:** Solder a 100 nF ceramic capacitor across the terminals of each TT motor to prevent motor noise from resetting the ESP32.
5. **Signal Wiring:**
   - Left PWM: `GPIO25` → `ENA`
   - Left Dir: `GPIO26` → `IN1`, `GPIO27` → `IN2`
   - Right Dir: `GPIO32` → `IN3`, `GPIO33` → `IN4`
   - Right PWM: `GPIO13` → `ENB`

---

## 5. Building and Flashing

Connect the ESP32 to your PC using the USB-C data cable.

### Step 1: Compile the Controller Web App
```bash
node scripts/build-controller.mjs
```
This compiles TypeScript, bundles the app with Vite, and places gzipped static assets into `firmware/data/`.

### Step 2: Upload Filesystem to ESP32 (LittleFS)
```bash
cd firmware
pio run -t uploadfs
```
*(If upload hangs on "Connecting...", press and hold the BOOT button on the ESP32 until writing begins).*

### Step 3: Flash Firmware & Open Serial Monitor
```bash
pio run -t upload && pio device monitor
```

### Expected Boot Log:
```
[FootBot] Booting...
[FootBot] Wi-Fi Soft-AP 'FootBot' active at 192.168.4.1
[FootBot] LittleFS mounted and web server initialized
[FootBot] WebSocket server listening on /ws
[FootBot] Setup complete. Ready for controller connection.
```

---

## 6. Driving the Robot

1. **Connect Smartphone Wi-Fi:**
   - On your phone, scan for Wi-Fi networks and select **`FootBot`**.
   - Enter password: **`footbot123`**.
   - **Important:** Turn off Cellular / Mobile Data on your phone, and if prompted "This network has no internet, stay connected?", choose **Yes / Stay Connected**.
2. **Open Controller Page:**
   - In Safari or Chrome, navigate to **`http://192.168.4.1/`**.
   - The page loads instantly from LittleFS.
   - The ESP32 onboard LED (GPIO2) switches from fast blinking to **solid ON**.
3. **Drive:**
   - **Joystick:** Push forward to drive forward; deflect diagonally to curve; release to stop.
   - **Spin Buttons:** Hold "↺ Spin Left" or "↻ Spin Right" for rapid in-place rotation.
   - **Quick Turns:** Tap ±90° or ±180° for precision alignment.
   - **Emergency STOP:** Tap the red STOP button at any moment to immediately kill all motor power.

---

## 7. Calibration

Follow the procedure detailed in [DOC/TESTING.md §6](file:///c:/Users/MSI/Desktop/FOOTBALLROBOT/DOC/TESTING.md#L173-L208):
- Run timed 90° turns on your competition pitch.
- Use the formula `new = old × (90 / measured)`.
- Update `TURN_MS_PER_DEG_RIGHT` and `TURN_MS_PER_DEG_LEFT` in `firmware/include/config.h` and re-flash (`pio run -t upload`).

---

## 8. Changing SSID & Password Before Competitions

To prevent interference or unauthorized connection from competing teams:
1. Open `firmware/include/config.h`.
2. Modify lines 14–15:
   ```c
   #define AP_SSID "FootBot_TeamAlpha"
   #define AP_PASS "SecretPass987"
   ```
3. Re-flash the firmware:
   ```bash
   cd firmware
   pio run -t upload
   ```

---

## 9. Competition-Day Checklist

Before each match, perform this rapid 2-minute pre-flight check:

- [ ] **Battery Voltage:** Check with multimeter; must be $\ge 8.0\text{ V}$. Swap packs if $< 7.6\text{ V}$.
- [ ] **Tire Cleaning:** Wipe TT rubber tires with isopropyl alcohol to remove dust and maintain traction.
- [ ] **Hardware Sanity:** With wheels in hand, turn robot ON. Motors remain silent; LED blinks fast.
- [ ] **Phone Link:** Connect phone to robot AP; verify solid status LED and green gauge (< 50 ms).
- [ ] **Quick Function Test:** Test short forward nudge, spin left, spin right, and STOP.
- [ ] **Turn Check:** Command +90° turn on pitch surface; confirm near-exact right-angle alignment.

---

## 10. Troubleshooting Table

| Symptom | Probable Cause | Corrective Action |
|---|---|---|
| **PlatformIO upload stuck on "Connecting..."** | ESP32 bootloader waiting for sync pulse | Hold down the **BOOT** button on the ESP32 until the percentage counter starts uploading, then release. |
| **No COM serial port detected** | Missing CP210x driver or charge-only USB cable | Install CP210x VCP driver; verify your USB cable transfers data with another device. |
| **Phone drops `FootBot` Wi-Fi connection** | OS detects no internet access and switches to cellular | Disable Mobile / Cellular Data in phone settings; tap "Keep Wi-Fi connection" when prompted. |
| **Page `192.168.4.1` does not load** | LittleFS filesystem not uploaded | Run `pio run -t uploadfs` to flash the compiled controller web files to flash. |
| **ESP32 reboots as soon as motors start** | Motor surge causing brownout reset (BOR) | Check common ground; verify LM2596 is fed directly from battery; ensure 100 µF capacitor is across L298N 12V terminal. |
| **A wheel spins in reverse when driving forward** | Motor polarity inverted | **Swap the two motor wires** at the corresponding L298N screw terminal (OUT1/OUT2 or OUT3/OUT4). Never alter code. |
| **Robot stops automatically after ~0.8 seconds** | 800 ms failsafe timeout triggered | Check Wi-Fi signal; ensure controller page is open and active (joystick sends heartbeat every 250 ms while touched). |

---

## 11. Command Reference

For the complete list of daily PlatformIO, npm, and git commands, see [DOC/AGENTS.md §2](file:///c:/Users/MSI/Desktop/FOOTBALLROBOT/DOC/AGENTS.md#L28-L77).
