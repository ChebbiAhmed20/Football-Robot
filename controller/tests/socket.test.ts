import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { SocketClient } from '../src/net/socket.js';

class MockWebSocket {
  public static instances: MockWebSocket[] = [];
  public url: string;
  public readyState = 0; // CONNECTING
  public sent: string[] = [];

  public onopen: (() => void) | null = null;
  public onmessage: ((e: { data: string }) => void) | null = null;
  public onclose: (() => void) | null = null;
  public onerror: (() => void) | null = null;

  constructor(url: string) {
    this.url = url;
    MockWebSocket.instances.push(this);
  }

  public open(): void {
    this.readyState = 1; // OPEN
    this.onopen?.();
  }

  public send(data: string): void {
    this.sent.push(data);
  }

  public close(): void {
    this.readyState = 3; // CLOSED
    this.onclose?.();
  }

  public receive(data: any): void {
    this.onmessage?.({ data: JSON.stringify(data) });
  }
}

describe('SocketClient (Lifecycle, Sequencer Reset & Reconnect)', () => {
  let client: SocketClient;
  let statusList: any[] = [];
  let connectionStates: boolean[] = [];

  beforeEach(() => {
    vi.useFakeTimers();
    MockWebSocket.instances = [];
    statusList = [];
    connectionStates = [];

    client = new SocketClient(
      'ws://192.168.4.1/ws',
      {
        onConnectionChange: (c) => connectionStates.push(c),
        onStatus: (s) => statusList.push(s)
      },
      undefined,
      (url) => new MockWebSocket(url) as any
    );
  });

  afterEach(() => {
    client.disconnect();
    vi.useRealTimers();
  });

  it('performs hello handshake on open and resets sequence counter', () => {
    client.connect();
    expect(MockWebSocket.instances).toHaveLength(1);
    const ws = MockWebSocket.instances[0];

    ws.open();
    // Must immediately send hello v=4
    expect(ws.sent).toContain(JSON.stringify({ t: 'hello', v: 4 }));
    expect(client.getSequencer().current()).toBe(0);

    // Robot replies hello v=4
    ws.receive({ t: 'hello', v: 4, fw: '1.0.0' });
    expect(client.isConnected()).toBe(true);
    expect(connectionStates).toContain(true);
  });

  it('reconnects automatically every 1 s after socket drop', () => {
    client.connect();
    const ws1 = MockWebSocket.instances[0];
    ws1.open();
    ws1.receive({ t: 'hello', v: 4, fw: '1.0.0' });
    expect(client.isConnected()).toBe(true);

    // Socket drops
    ws1.close();
    expect(client.isConnected()).toBe(false);
    expect(MockWebSocket.instances).toHaveLength(1);

    // After 500 ms, not yet reconnected
    vi.advanceTimersByTime(500);
    expect(MockWebSocket.instances).toHaveLength(1);

    // At 1000 ms, new connection initiated
    vi.advanceTimersByTime(500);
    expect(MockWebSocket.instances).toHaveLength(2);

    const ws2 = MockWebSocket.instances[1];
    ws2.open();
    expect(ws2.sent).toContain(JSON.stringify({ t: 'hello', v: 4 }));
  });

  it('resets sequence counter to 0 on new connection', () => {
    client.connect();
    const ws1 = MockWebSocket.instances[0];
    ws1.open();
    ws1.receive({ t: 'hello', v: 4, fw: '1.0.0' });

    // Send some events to advance sequence
    client.getEventSender().sendStop();
    client.getEventSender().sendStop();
    expect(client.getSequencer().current()).toBe(2);

    // Drop and reconnect
    ws1.close();
    vi.advanceTimersByTime(1000);
    const ws2 = MockWebSocket.instances[1];
    ws2.open();

    // Sequence counter must be reset
    expect(client.getSequencer().current()).toBe(0);
  });
});
