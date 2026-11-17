import { PING_INTERVAL_MS, PONG_TIMEOUT_MS } from '../protocol/constants.js';
import { OutMessage } from '../protocol/types.js';
import { Clock, defaultClock } from './clock.js';

export type GaugeState = 'good' | 'slow' | 'poor' | 'disconnected';

export class PingManager {
  private sender: (msg: OutMessage) => void;
  private onStateChange: (state: GaugeState, rttMs: number | null) => void;
  private clock: Clock;

  private pingTimer: any = null;
  private pongCheckTimer: any = null;
  private currentN = 0;
  private pingSentTimes = new Map<number, number>();
  private lastPongTime = 0;
  private running = false;

  constructor(
    sender: (msg: OutMessage) => void,
    onStateChange: (state: GaugeState, rttMs: number | null) => void,
    clock: Clock = defaultClock
  ) {
    this.sender = sender;
    this.onStateChange = onStateChange;
    this.clock = clock;
  }

  public start(): void {
    this.stop();
    this.running = true;
    this.lastPongTime = this.clock.now();

    // Initial ping
    this.sendPing();

    this.pingTimer = this.clock.setInterval(() => {
      this.sendPing();
    }, PING_INTERVAL_MS);

    this.pongCheckTimer = this.clock.setInterval(() => {
      this.checkTimeout();
    }, 200);
  }

  private sendPing(): void {
    this.currentN += 1;
    const n = this.currentN;
    this.pingSentTimes.set(n, this.clock.now());
    this.sender({ t: 'ping', n });
  }

  public handlePong(n: number): void {
    const sentTime = this.pingSentTimes.get(n);
    if (sentTime !== undefined) {
      const now = this.clock.now();
      const rtt = now - sentTime;
      this.lastPongTime = now;
      this.pingSentTimes.delete(n);

      let state: GaugeState = 'good';
      if (rtt < 100) {
        state = 'good';
      } else if (rtt <= 300) {
        state = 'slow';
      } else {
        state = 'poor';
      }

      this.onStateChange(state, rtt);
    }
  }

  private checkTimeout(): void {
    if (!this.running) return;
    const elapsedSincePong = this.clock.now() - this.lastPongTime;
    if (elapsedSincePong >= PONG_TIMEOUT_MS) {
      this.onStateChange('disconnected', null);
    }
  }

  public stop(): void {
    this.running = false;
    if (this.pingTimer) {
      this.clock.clearInterval(this.pingTimer);
      this.pingTimer = null;
    }
    if (this.pongCheckTimer) {
      this.clock.clearInterval(this.pongCheckTimer);
      this.pongCheckTimer = null;
    }
    this.pingSentTimes.clear();
  }
}

