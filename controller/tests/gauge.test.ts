import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { PingManager, GaugeState } from '../src/net/ping.js';
import { formatGaugeState } from '../src/ui/gauge.js';
import { OutMessage } from '../src/protocol/types.js';

describe('PingManager & Connection Gauge States', () => {
  let sent: OutMessage[] = [];
  let gaugeHistory: Array<{ state: GaugeState; rtt: number | null }> = [];
  let pingManager: PingManager;

  beforeEach(() => {
    vi.useFakeTimers();
    sent = [];
    gaugeHistory = [];
    pingManager = new PingManager(
      (msg) => sent.push(msg),
      (state, rtt) => gaugeHistory.push({ state, rtt })
    );
  });

  afterEach(() => {
    pingManager.stop();
    vi.useRealTimers();
  });

  it('sends ping at 1 Hz and marks good when RTT < 100 ms', () => {
    pingManager.start();
    expect(sent).toHaveLength(1);
    expect(sent[0]).toEqual({ t: 'ping', n: 1 });

    // Respond with pong after 50 ms
    vi.advanceTimersByTime(50);
    pingManager.handlePong(1);

    expect(gaugeHistory).toHaveLength(1);
    expect(gaugeHistory[0].state).toBe('good');
    expect(gaugeHistory[0].rtt).toBe(50);
  });

  it('marks slow when RTT is 100 to 300 ms', () => {
    pingManager.start();
    vi.advanceTimersByTime(150);
    pingManager.handlePong(1);

    expect(gaugeHistory).toHaveLength(1);
    expect(gaugeHistory[0].state).toBe('slow');
    expect(gaugeHistory[0].rtt).toBe(150);
  });

  it('marks poor when RTT > 300 ms', () => {
    pingManager.start();
    vi.advanceTimersByTime(350);
    pingManager.handlePong(1);

    expect(gaugeHistory).toHaveLength(1);
    expect(gaugeHistory[0].state).toBe('poor');
    expect(gaugeHistory[0].rtt).toBe(350);
  });

  it('transitions to disconnected when no pong arrives for 2 seconds', () => {
    pingManager.start();
    // No pong received for 2000 ms
    vi.advanceTimersByTime(2000);

    expect(gaugeHistory.some(g => g.state === 'disconnected')).toBe(true);
  });

  it('formats gauge states into UI pills and labels accurately', () => {
    const good = formatGaugeState('good', 45, -55);
    expect(good.text).toContain('Good');
    expect(good.cssClass).toBe('gauge-good');
    expect(good.detail).toContain('45 ms');
    expect(good.detail).toContain('-55 dBm');

    const disco = formatGaugeState('disconnected', null, null);
    expect(disco.text).toBe('Disconnected');
    expect(disco.cssClass).toBe('gauge-disconnected');
  });
});

