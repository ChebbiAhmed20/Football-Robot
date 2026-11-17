import { GaugeState } from '../net/ping.js';

export interface GaugeRenderData {
  text: string;
  cssClass: string;
  detail: string;
}

export function formatGaugeState(
  state: GaugeState,
  rttMs: number | null,
  rssi: number | null
): GaugeRenderData {
  const rssiStr = rssi !== null ? `${rssi} dBm` : '--';
  const rttStr = rttMs !== null ? `${rttMs} ms` : '--';

  switch (state) {
    case 'good':
      return {
        text: 'Connected (Good)',
        cssClass: 'gauge-good',
        detail: `RTT: ${rttStr} | Signal: ${rssiStr}`
      };
    case 'slow':
      return {
        text: 'Connected (Slow)',
        cssClass: 'gauge-slow',
        detail: `RTT: ${rttStr} | Signal: ${rssiStr}`
      };
    case 'poor':
      return {
        text: 'Connected (Poor)',
        cssClass: 'gauge-poor',
        detail: `RTT: ${rttStr} | Signal: ${rssiStr}`
      };
    case 'disconnected':
    default:
      return {
        text: 'Disconnected',
        cssClass: 'gauge-disconnected',
        detail: 'No connection to FootBot'
      };
  }
}

export class ConnectionGaugeUI {
  private element: HTMLElement;
  private statusLabel: HTMLElement;
  private detailLabel: HTMLElement;

  constructor(container: HTMLElement) {
    this.element = container;
    container.innerHTML = `
      <div class="gauge-pill gauge-disconnected">
        <span class="gauge-dot"></span>
        <span class="gauge-status">Disconnected</span>
      </div>
      <div class="gauge-detail">Connecting to robot...</div>
    `;
    this.statusLabel = container.querySelector('.gauge-status')!;
    this.detailLabel = container.querySelector('.gauge-detail')!;
  }

  public update(state: GaugeState, rttMs: number | null, rssi: number | null): void {
    const data = formatGaugeState(state, rttMs, rssi);
    const pill = this.element.querySelector('.gauge-pill')!;
    pill.className = `gauge-pill ${data.cssClass}`;
    this.statusLabel.textContent = data.text;
    this.detailLabel.textContent = data.detail;
  }
}

