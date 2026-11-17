import { EVENT_MAX_RETRIES, EVENT_RESEND_INTERVAL_MS } from '../protocol/constants.js';
import { OutMessage } from '../protocol/types.js';
import { Sequencer } from './sequencer.js';
import { Clock, defaultClock } from './clock.js';

export type EventPayload =
  | { type: 'stop' }
  | { type: 'turn'; a: number; s?: number };

interface PendingEvent {
  q: number;
  message: OutMessage;
  tries: number;
  timer: any;
}

export class EventSender {
  private sender: (msg: OutMessage) => void;
  private sequencer: Sequencer;
  private clock: Clock;
  private onWarning: (msg: string) => void;
  private pending = new Map<number, PendingEvent>();

  constructor(
    sender: (msg: OutMessage) => void,
    sequencer: Sequencer,
    onWarning: (msg: string) => void = () => {},
    clock: Clock = defaultClock
  ) {
    this.sender = sender;
    this.sequencer = sequencer;
    this.onWarning = onWarning;
    this.clock = clock;
  }

  public sendStop(): number {
    const q = this.sequencer.next();
    const msg: OutMessage = { t: 'stop', q };
    this.dispatch(q, msg);
    return q;
  }

  public sendTurn(angle: number, speed?: number): number {
    const q = this.sequencer.next();
    const msg: OutMessage = { t: 'turn', q, a: angle, s: speed };
    this.dispatch(q, msg);
    return q;
  }

  private dispatch(q: number, message: OutMessage): void {
    // Immediate initial transmission (try 1)
    this.sender(message);

    const pendingItem: PendingEvent = {
      q,
      message,
      tries: 1,
      timer: null
    };

    pendingItem.timer = this.clock.setInterval(() => {
      if (!this.pending.has(q)) {
        this.clock.clearInterval(pendingItem.timer);
        return;
      }

      if (pendingItem.tries >= EVENT_MAX_RETRIES) {
        this.clock.clearInterval(pendingItem.timer);
        this.pending.delete(q);
        this.onWarning(`Event q=${q} not acknowledged after ${EVENT_MAX_RETRIES} attempts`);
        return;
      }

      pendingItem.tries += 1;
      this.sender(message);
    }, EVENT_RESEND_INTERVAL_MS);

    this.pending.set(q, pendingItem);
  }

  public handleAck(q: number): void {
    const pendingItem = this.pending.get(q);
    if (pendingItem) {
      this.clock.clearInterval(pendingItem.timer);
      this.pending.delete(q);
    }
  }

  public clear(): void {
    for (const item of this.pending.values()) {
      this.clock.clearInterval(item.timer);
    }
    this.pending.clear();
  }

  public getPendingCount(): number {
    return this.pending.size;
  }
}

