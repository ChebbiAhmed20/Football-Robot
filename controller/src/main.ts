import { SocketClient } from './net/socket.js';
import { Store, AppState } from './state/store.js';
import { ConnectionGaugeUI } from './ui/gauge.js';
import { WarningsUI } from './ui/warnings.js';
import { JoystickController } from './input/joystick.js';
import { SpinButtonsController } from './input/spin_buttons.js';
import { ButtonsController } from './input/buttons.js';
import { SPEED_DEFAULT } from './protocol/constants.js';

window.addEventListener('DOMContentLoaded', () => {
  const store = new Store<AppState>({
    connected: false,
    gaugeState: 'disconnected',
    rttMs: null,
    rssi: null,
    speed: SPEED_DEFAULT,
    lastError: null,
    activeDirection: -1,
    activeThrottle: 0
  });

  const gaugeContainer = document.getElementById('gauge-container')!;
  const warningContainer = document.getElementById('warning-container')!;

  const gaugeUI = new ConnectionGaugeUI(gaugeContainer);
  const warningsUI = new WarningsUI(warningContainer);

  store.subscribe((state) => {
    gaugeUI.update(state.gaugeState, state.rttMs, state.rssi);
  });

  const socketClient = new SocketClient(undefined, {
    onConnectionChange: (connected) => {
      store.setState({ connected });
    },
    onGaugeChange: (gaugeState, rttMs) => {
      store.setState({ gaugeState, rttMs });
    },
    onStatus: (status) => {
      store.setState({ rssi: status.rssi });
    },
    onWarning: (msg) => {
      warningsUI.show(msg, false);
    },
    onError: (q, code) => {
      if (code === 'busy') {
        warningsUI.show(`Turn busy (q=${q})`, false);
      } else if (code === 'cancelled') {
        warningsUI.show(`Turn cancelled by stop (q=${q})`, false);
      } else {
        warningsUI.show(`Error from robot: ${code} (q=${q})`, true);
      }
    },
    onDone: (q) => {
      console.log(`[FootBot] Event q=${q} completed`);
    }
  });

  // Joystick Input
  const joystickPad = document.getElementById('joystick-pad')!;
  const joystickKnob = document.getElementById('joystick-knob')!;

  new JoystickController(joystickPad, joystickKnob, (d, m) => {
    store.setState({ activeDirection: d, activeThrottle: m });
    socketClient.getStateSender().setDrive(d, m, store.getState().speed);
  });

  // Spin Buttons
  const btnSpinLeft = document.getElementById('btn-spin-left')!;
  const btnSpinRight = document.getElementById('btn-spin-right')!;

  new SpinButtonsController(btnSpinLeft, btnSpinRight, (r) => {
    socketClient.getStateSender().setSpin(r, store.getState().speed);
  });

  // Action Buttons & Speed Slider
  const stopBtn = document.getElementById('btn-stop')!;
  const turnRight90Btn = document.getElementById('btn-turn-right-90')!;
  const turnLeft90Btn = document.getElementById('btn-turn-left-90')!;
  const turnRight180Btn = document.getElementById('btn-turn-right-180')!;
  const turnLeft180Btn = document.getElementById('btn-turn-left-180')!;
  const speedSlider = document.getElementById('speed-slider') as HTMLInputElement;
  const speedValueLabel = document.getElementById('speed-value')!;

  new ButtonsController(
    {
      stopBtn,
      turnRight90Btn,
      turnLeft90Btn,
      turnRight180Btn,
      turnLeft180Btn,
      speedSlider,
      speedValueLabel
    },
    {
      onStop: () => {
        socketClient.getEventSender().sendStop();
      },
      onTurn: (angle) => {
        socketClient.getEventSender().sendTurn(angle, store.getState().speed);
      },
      onSpeedChange: (speed) => {
        store.setState({ speed });
        const { activeDirection, activeThrottle } = store.getState();
        if (activeDirection !== -1 && activeThrottle > 0) {
          socketClient.getStateSender().setDrive(activeDirection, activeThrottle, speed);
        }
      }
    }
  );

  // Connect WebSocket
  socketClient.connect();
});

