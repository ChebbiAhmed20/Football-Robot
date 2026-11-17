export interface ButtonActions {
  onStop: () => void;
  onTurn: (angle: number) => void;
  onSpeedChange: (speed: number) => void;
}

export class ButtonsController {
  private actions: ButtonActions;

  constructor(elements: {
    stopBtn: HTMLElement;
    turnRight90Btn: HTMLElement;
    turnLeft90Btn: HTMLElement;
    turnRight180Btn: HTMLElement;
    turnLeft180Btn: HTMLElement;
    speedSlider: HTMLInputElement;
    speedValueLabel?: HTMLElement;
  }, actions: ButtonActions) {
    this.actions = actions;

    elements.stopBtn.addEventListener('click', (e) => {
      e.preventDefault();
      this.actions.onStop();
    });

    elements.turnRight90Btn.addEventListener('click', () => this.actions.onTurn(90));
    elements.turnLeft90Btn.addEventListener('click', () => this.actions.onTurn(-90));
    elements.turnRight180Btn.addEventListener('click', () => this.actions.onTurn(180));
    elements.turnLeft180Btn.addEventListener('click', () => this.actions.onTurn(-180));

    elements.speedSlider.addEventListener('input', () => {
      const val = parseInt(elements.speedSlider.value, 10);
      if (elements.speedValueLabel) {
        elements.speedValueLabel.textContent = val.toString();
      }
      this.actions.onSpeedChange(val);
    });
  }
}

