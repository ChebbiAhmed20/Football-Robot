import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { EventSender } from '../src/net/event_sender.js';
import { Sequencer } from '../src/net/sequencer.js';
import { OutMessage } from '../src/protocol/types.js';

describe('EventSender (150 ms Resend & Max 5 Tries)', () => {
  let sent: OutMessage[] = [];
  let warnings: string[] = [];
  let sequencer: Sequencer;
  let eventSender: EventSender;

  beforeEach(() => {
    vi.useFakeTimers();
    sent = [];
    warnings = [];
    sequencer = new Sequencer();
    eventSender = new EventSender(
      (msg) => sent.push(msg),
      sequencer,
      (warn) => warnings.push(warn)
    );
  });

  afterEach(() => {
    eventSender.clear();
    vi.useRealTimers();
  });

  it('sends stop immediately and resends every 150 ms until acked', () => {
    const q = eventSender.sendStop();
    expect(q).toBe(1);
    expect(sent).toHaveLength(1);
    expect(sent[0]).toEqual({ t: 'stop', q: 1 });

    // After 150 ms: resend 1 (try 2)
    vi.advanceTimersByTime(150);
    expect(sent).toHaveLength(2);
    expect(sent[1]).toEqual({ t: 'stop', q: 1 });

    // After another 150 ms: resend 2 (try 3)
    vi.advanceTimersByTime(150);
    expect(sent).toHaveLength(3);

    // Ack arrives
    eventSender.handleAck(q);

    // Advance 500 ms - no more resends
    vi.advanceTimersByTime(500);
    expect(sent).toHaveLength(3);
    expect(warnings).toHaveLength(0);
  });

  it('gives up after 5 tries and shows warning', () => {
    const q = eventSender.sendTurn(90, 200);
    expect(q).toBe(1);
    expect(sent).toHaveLength(1); // Try 1

    // Try 2 (t=150)
    vi.advanceTimersByTime(150);
    expect(sent).toHaveLength(2);

    // Try 3 (t=300)
    vi.advanceTimersByTime(150);
    expect(sent).toHaveLength(3);

    // Try 4 (t=450)
    vi.advanceTimersByTime(150);
    expect(sent).toHaveLength(4);

    // Try 5 (t=600)
    vi.advanceTimersByTime(150);
    expect(sent).toHaveLength(5);

    // Try 6 timer ticks (t=750): reaches limit 5, stops and warns
    vi.advanceTimersByTime(150);
    expect(sent).toHaveLength(5);
    expect(warnings).toHaveLength(1);
    expect(warnings[0]).toContain('not acknowledged after 5 attempts');
  });
});

