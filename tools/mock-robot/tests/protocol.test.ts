import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { RobotModel } from '../src/robot_model.js';
import { mixDrive, mixSpin } from '../src/mixing.js';
import fs from 'fs';
import path from 'path';

describe('Motor Mixing & Test Vectors', () => {
  it('matches all test vectors in shared/test-vectors.json', () => {
    const vectorsPath = path.resolve(__dirname, '../../../shared/test-vectors.json');
    const vectorsData = JSON.parse(fs.readFileSync(vectorsPath, 'utf8'));

    for (const vec of vectorsData.mixing) {
      const out = mixDrive(vec.d, vec.m, vec.s);
      expect(out.left).toBe(vec.left);
      expect(out.right).toBe(vec.right);
    }

    for (const vec of vectorsData.spin) {
      const out = mixSpin(vec.r, vec.s);
      expect(out.left).toBe(vec.left);
      expect(out.right).toBe(vec.right);
    }
  });
});

describe('Mock Robot Protocol & State Machine', () => {
  let model: RobotModel;
  let sentMessages: any[] = [];
  let closedWith: { code: number; reason: string } | null = null;

  beforeEach(() => {
    vi.useFakeTimers();
    model = new RobotModel();
    sentMessages = [];
    closedWith = null;

    model.onClientConnected(
      (msg: string) => {
        sentMessages.push(JSON.parse(msg));
      },
      (code: number, reason: string) => {
        closedWith = { code, reason };
      }
    );
  });

  afterEach(() => {
    model.onClientDisconnected();
    vi.useRealTimers();
  });

  it('handles hello handshake with version matching', () => {
    model.handleMessage(JSON.stringify({ t: 'hello', v: 4 }));
    expect(sentMessages).toContainEqual({ t: 'hello', v: 4, fw: '1.0.0' });
  });

  it('rejects hello with mismatched version and closes socket', () => {
    model.handleMessage(JSON.stringify({ t: 'hello', v: 3 }));
    expect(closedWith).not.toBeNull();
    expect(closedWith?.code).toBe(4002);
  });

  it('enforces single-client connection', () => {
    let secondClosed: { code: number; reason: string } | null = null;
    const accepted = model.onClientConnected(
      () => {},
      (code, reason) => {
        secondClosed = { code, reason };
      }
    );
    expect(accepted).toBe(false);
    expect(secondClosed?.code).toBe(4001);
  });

  it('replies to ping immediately with pong and echoes n', () => {
    model.handleMessage(JSON.stringify({ t: 'ping', q: 100, n: 42 }));
    expect(sentMessages).toContainEqual({ t: 'pong', n: 42 });
  });

  it('broadcasts status message every 500 ms', () => {
    sentMessages = [];
    vi.advanceTimersByTime(500);
    expect(sentMessages.some(m => m.t === 'status')).toBe(true);

    vi.advanceTimersByTime(500);
    const statusCount = sentMessages.filter(m => m.t === 'status').length;
    expect(statusCount).toBe(2);
  });

  it('executes drive and trips failsafe after 800 ms of silence', () => {
    model.handleMessage(JSON.stringify({ t: 'drive', q: 1, d: 0, m: 1.0, s: 200 }));
    let state = model.getState();
    expect(state.leftPwm).toBe(200);
    expect(state.rightPwm).toBe(200);
    expect(state.failsafeTripped).toBe(false);

    // After 750 ms, motors still running
    vi.advanceTimersByTime(750);
    state = model.getState();
    expect(state.leftPwm).toBe(200);

    // At 800 ms+, failsafe trips, motors stop
    vi.advanceTimersByTime(100);
    state = model.getState();
    expect(state.leftPwm).toBe(0);
    expect(state.rightPwm).toBe(0);
    expect(state.failsafeTripped).toBe(true);
  });

  it('ignores drive/spin with stale or duplicate sequence numbers (q ordering)', () => {
    model.handleMessage(JSON.stringify({ t: 'drive', q: 10, d: 0, m: 1.0, s: 200 }));
    expect(model.getState().leftPwm).toBe(200);

    // Older sequence q=8 should be ignored
    model.handleMessage(JSON.stringify({ t: 'drive', q: 8, d: 4, m: 1.0, s: 200 }));
    expect(model.getState().leftPwm).toBe(200); // Unchanged

    // Same sequence q=10 should be ignored
    model.handleMessage(JSON.stringify({ t: 'drive', q: 10, d: 8, m: 1.0, s: 200 }));
    expect(model.getState().leftPwm).toBe(200); // Unchanged
  });

  it('executes timed turn, returns ack, then done after duration', () => {
    sentMessages = [];
    // 90 deg right -> 405 ms
    model.handleMessage(JSON.stringify({ t: 'turn', q: 50, a: 90, s: 200 }));
    expect(sentMessages).toContainEqual({ t: 'ack', q: 50 });

    let state = model.getState();
    expect(state.turnActive).toBe(true);
    expect(state.leftPwm).toBe(200);
    expect(state.rightPwm).toBe(-200);

    // Advance 400 ms (still active)
    vi.advanceTimersByTime(400);
    expect(model.getState().turnActive).toBe(true);

    // Advance 10 ms (completes at 405 ms)
    vi.advanceTimersByTime(10);
    expect(model.getState().turnActive).toBe(false);
    expect(model.getState().leftPwm).toBe(0);
    expect(model.getState().rightPwm).toBe(0);
    expect(sentMessages).toContainEqual({ t: 'done', q: 50 });
  });

  it('re-acks duplicate event q without re-executing', () => {
    sentMessages = [];
    model.handleMessage(JSON.stringify({ t: 'turn', q: 75, a: 90, s: 200 }));
    expect(sentMessages).toContainEqual({ t: 'ack', q: 75 });

    // Send same turn event q=75 again
    sentMessages = [];
    model.handleMessage(JSON.stringify({ t: 'turn', q: 75, a: 90, s: 200 }));
    // Should re-ack without crashing or resetting turn
    expect(sentMessages).toContainEqual({ t: 'ack', q: 75 });
  });

  it('rejects a second turn command while one is running with err busy', () => {
    sentMessages = [];
    model.handleMessage(JSON.stringify({ t: 'turn', q: 80, a: 90, s: 200 }));
    expect(sentMessages).toContainEqual({ t: 'ack', q: 80 });

    // New turn while first is running
    sentMessages = [];
    model.handleMessage(JSON.stringify({ t: 'turn', q: 81, a: -90, s: 200 }));
    expect(sentMessages).toContainEqual({ t: 'ack', q: 81 });
    expect(sentMessages).toContainEqual({ t: 'err', q: 81, c: 'busy' });
  });

  it('cancels active turn when stop event is received', () => {
    sentMessages = [];
    model.handleMessage(JSON.stringify({ t: 'turn', q: 90, a: 180, s: 200 }));
    expect(sentMessages).toContainEqual({ t: 'ack', q: 90 });
    expect(model.getState().turnActive).toBe(true);

    // Stop received mid-turn
    model.handleMessage(JSON.stringify({ t: 'stop', q: 91 }));
    expect(sentMessages).toContainEqual({ t: 'ack', q: 91 });
    expect(sentMessages).toContainEqual({ t: 'err', q: 90, c: 'cancelled' });
    expect(model.getState().turnActive).toBe(false);
    expect(model.getState().leftPwm).toBe(0);
    expect(model.getState().rightPwm).toBe(0);
  });

  it('rejects malformed json and oversized messages (> 128 bytes)', () => {
    sentMessages = [];
    model.handleMessage('bad json');
    expect(sentMessages).toContainEqual({ t: 'err', q: 0, c: 'bad_msg' });

    sentMessages = [];
    const huge = JSON.stringify({ t: 'drive', q: 1, text: 'a'.repeat(150) });
    model.handleMessage(huge);
    expect(sentMessages).toContainEqual({ t: 'err', q: 0, c: 'bad_msg' });
  });
});
