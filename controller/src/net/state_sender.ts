import { HEARTBEAT_INTERVAL_MS } from '../protocol/constants.js';
import { OutMessage } from '../protocol/types.js';
import { Sequencer } from './sequencer.js';
import { Clock, defaultClock } from './clock.js';

export type SendFunction = (msg: OutMessage) => void;

export type StatePayload =
  | { type: 'drive'; d: number; m: number; s: number }
  | { type: 'spin'; r: number; s: number };

export class StateSender {
  private sender: SendFunction;
  private sequencer: Sequencer;
  private clock: Clock;
  private currentState: StatePayload = { type: 'drive', d: -1, m: 0, s: 200 };
  private heartbeatTimer: any = null;
  private active = false;

  constructor(sender: SendFunction, sequencer: Sequencer, clock: Clock = defaultClock) {
    this.sender = sender;
    this.sequencer = sequencer;
    this.clock = clock;
  }

  public setDrive(d: number, m: number, s: number): void {
    const isNew =
      this.currentState.type !== 'drive' ||
      this.currentState.d !== d ||
      Math.abs(this.currentState.m - m) > 0.001 ||
      this.currentState.s !== s;

    this.currentState = { type: 'drive', d, m, s };

    // Stick is active if not idle
    this.active = d !== -1 && m > 0;

    if (isNew) {
      this.sendCurrentState();
      this.restartHeartbeat();
    }
  }

  public setSpin(r: number, s: number): void {
    const isNew =
      this.currentState.type !== 'spin' ||
      this.currentState.r !== r ||
      this.currentState.s !== s;

    this.currentState = { type: 'spin', r, s };
    this.active = r !== 0;

    if (isNew) {
      this.sendCurrentState();
      this.restartHeartbeat();
    }
  }

  private sendCurrentState(): void {
    const q = this.sequencer.next();
    if (this.currentState.type === 'drive') {
      this.sender({
        t: 'drive',
        q,
        d: this.currentState.d,
        m: this.currentState.m,
        s: this.currentState.s
      });
    } else {
      this.sender({
        t: 'spin',
        q,
        r: this.currentState.r,
        s: this.currentState.s
      });
    }
  }

  private restartHeartbeat(): void {
    if (this.heartbeatTimer) {
      this.clock.clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }

    if (this.active) {
      this.heartbeatTimer = this.clock.setInterval(() => {
        this.sendCurrentState();
      }, HEARTBEAT_INTERVAL_MS);
    }
  }

  public stop(): void {
    if (this.heartbeatTimer) {
      this.clock.clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
    this.active = false;
  }
}
