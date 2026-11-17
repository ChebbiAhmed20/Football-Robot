import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { StateSender } from '../src/net/state_sender.js';
import { Sequencer } from '../src/net/sequencer.js';
import { OutMessage } from '../src/protocol/types.js';

describe('StateSender (Heartbeat & Immediate Dispatch)', () => {
  let sent: OutMessage[] = [];
  let sequencer: Sequencer;
  let stateSender: StateSender;

  beforeEach(() => {
    vi.useFakeTimers();
    sent = [];
    sequencer = new Sequencer();
    stateSender = new StateSender(
      (msg) => sent.push(msg),
      sequencer
    );
  });

  afterEach(() => {
    stateSender.stop();
    vi.useRealTimers();
  });

  it('sends drive immediately when direction changes', () => {
    stateSender.setDrive(0, 1.0, 200);
    expect(sent).toHaveLength(1);
    expect(sent[0]).toEqual({ t: 'drive', q: 1, d: 0, m: 1.0, s: 200 });

    // Change direction immediately
    stateSender.setDrive(2, 0.8, 200);
    expect(sent).toHaveLength(2);
    expect(sent[1]).toEqual({ t: 'drive', q: 2, d: 2, m: 0.8, s: 200 });
  });

  it('repeats drive every 250 ms (4 Hz heartbeat) while held', () => {
    stateSender.setDrive(0, 1.0, 200);
    expect(sent).toHaveLength(1);

    // After 250 ms
    vi.advanceTimersByTime(250);
    expect(sent).toHaveLength(2);
    expect(sent[1]).toEqual({ t: 'drive', q: 2, d: 0, m: 1.0, s: 200 });

    // After another 250 ms
    vi.advanceTimersByTime(250);
    expect(sent).toHaveLength(3);
    expect(sent[2]).toEqual({ t: 'drive', q: 3, d: 0, m: 1.0, s: 200 });
  });

  it('stops heartbeat when stick returns to center (d=-1, m=0)', () => {
    stateSender.setDrive(0, 1.0, 200);
    expect(sent).toHaveLength(1);

    // Release stick
    stateSender.setDrive(-1, 0, 200);
    expect(sent).toHaveLength(2);
    expect(sent[1]).toEqual({ t: 'drive', q: 2, d: -1, m: 0, s: 200 });

    // Advance 1000 ms - no new messages sent
    vi.advanceTimersByTime(1000);
    expect(sent).toHaveLength(2);
  });

  it('sends spin immediately and repeats every 250 ms while held', () => {
    stateSender.setSpin(1, 200);
    expect(sent).toHaveLength(1);
    expect(sent[0]).toEqual({ t: 'spin', q: 1, r: 1, s: 200 });

    vi.advanceTimersByTime(250);
    expect(sent).toHaveLength(2);
    expect(sent[1]).toEqual({ t: 'spin', q: 2, r: 1, s: 200 });

    // Release spin button
    stateSender.setSpin(0, 200);
    expect(sent).toHaveLength(3);
    expect(sent[2]).toEqual({ t: 'spin', q: 3, r: 0, s: 200 });

    vi.advanceTimersByTime(500);
    expect(sent).toHaveLength(3);
  });
});
