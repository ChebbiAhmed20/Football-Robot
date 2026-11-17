export class WarningsUI {
  private container: HTMLElement;
  private timer: any = null;

  constructor(container: HTMLElement) {
    this.container = container;
  }

  public show(message: string, isError = false): void {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }

    this.container.textContent = message;
    this.container.className = `warning-banner ${isError ? 'banner-error' : 'banner-warning'} active`;

    this.timer = setTimeout(() => {
      this.hide();
    }, 4000);
  }

  public hide(): void {
    this.container.className = 'warning-banner';
    this.container.textContent = '';
  }
}

