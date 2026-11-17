export type SpinCallback = (r: number) => void;

export class SpinButtonsController {
  private leftBtn: HTMLElement;
  private rightBtn: HTMLElement;
  private onSpin: SpinCallback;

  constructor(leftBtn: HTMLElement, rightBtn: HTMLElement, onSpin: SpinCallback) {
    this.leftBtn = leftBtn;
    this.rightBtn = rightBtn;
    this.onSpin = onSpin;

    this.bindEvents(this.leftBtn, -1);
    this.bindEvents(this.rightBtn, 1);
  }

  private bindEvents(btn: HTMLElement, rValue: number): void {
    const start = (e: Event) => {
      e.preventDefault();
      this.onSpin(rValue);
    };

    const stop = (e: Event) => {
      e.preventDefault();
      this.onSpin(0);
    };

    btn.addEventListener('pointerdown', start);
    btn.addEventListener('pointerup', stop);
    btn.addEventListener('pointerleave', stop);
    btn.addEventListener('pointercancel', stop);
  }
}
