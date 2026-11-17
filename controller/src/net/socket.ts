import { PROTOCOL_VERSION, RECONNECT_INTERVAL_MS } from '../protocol/constants.js';
import { InMessage, OutMessage, RobotStatus } from '../protocol/types.js';
import { Sequencer } from './sequencer.js';
import { StateSender } from './state_sender.js';
import { EventSender } from './event_sender.js';
import { PingManager, GaugeState } from './ping.js';
import { Clock, defaultClock } from './clock.js';

export interface SocketCallbacks {
  onStatus?: (status: RobotStatus) => void;
  onGaugeChange?: (state: GaugeState, rttMs: number | null) => void;
  onDone?: (q: number) => void;
  onError?: (q: number, code: string) => void;
  onWarning?: (msg: string) => void;
  onConnectionChange?: (connected: boolean) => void;
}

export type WebSocketFactory = (url: string) => WebSocket;

export class SocketClient {
  private url: string;
  private ws: WebSocket | null = null;
  private sequencer: Sequencer;
  private stateSender: StateSender;
  private eventSender: EventSender;
  private pingManager: PingManager;
  private clock: Clock;
  private wsFactory: WebSocketFactory;
  private callbacks: SocketCallbacks;

  private reconnectTimer: any = null;
  private shouldReconnect = true;
  private isHandshakeComplete = false;

  constructor(
    url?: string,
    callbacks: SocketCallbacks = {},
    clock: Clock = defaultClock,
    wsFactory?: WebSocketFactory
  ) {
    this.url = url || this.determineDefaultUrl();
    this.callbacks = callbacks;
    this.clock = clock;
    this.wsFactory = wsFactory || ((u: string) => new WebSocket(u));

    this.sequencer = new Sequencer();

    const rawSender = (msg: OutMessage) => this.send(msg);

    this.stateSender = new StateSender(rawSender, this.sequencer, this.clock);
    this.eventSender = new EventSender(
      rawSender,
      this.sequencer,
      (warn) => this.callbacks.onWarning?.(warn),
      this.clock
    );
    this.pingManager = new PingManager(
      rawSender,
      (state, rtt) => this.callbacks.onGaugeChange?.(state, rtt),
      this.clock
    );
  }

  private determineDefaultUrl(): string {
    if (typeof window !== 'undefined' && window.location) {
      const host = window.location.host;
      if (window.location.port === '5173') {
        // Vite dev server running on 5173 -> connect to mock robot on 8080
        return `ws://${window.location.hostname}:8080/ws`;
      }
      return `ws://${host}/ws`;
    }
    return 'ws://localhost:8080/ws';
  }

  public connect(): void {
    this.shouldReconnect = true;
    if (this.reconnectTimer) {
      this.clock.clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    try {
      this.ws = this.wsFactory(this.url);
    } catch {
      this.scheduleReconnect();
      return;
    }

    this.ws.onopen = () => {
      // Step 1: reset sequence counters (PROTOCOL.md §3)
      this.sequencer.reset();
      this.isHandshakeComplete = false;

      // Step 2: send hello handshake
      this.send({ t: 'hello', v: PROTOCOL_VERSION });
    };

    this.ws.onmessage = (event) => {
      let data: InMessage;
      try {
        data = JSON.parse(event.data.toString());
      } catch {
        return;
      }

      this.handleIncoming(data);
    };

    this.ws.onclose = () => {
      this.cleanupConnection();
      if (this.shouldReconnect) {
        this.scheduleReconnect();
      }
    };

    this.ws.onerror = () => {
      // onclose handles reconnect
    };
  }

  private handleIncoming(msg: InMessage): void {
    switch (msg.t) {
      case 'hello':
        if (msg.v === PROTOCOL_VERSION) {
          this.isHandshakeComplete = true;
          this.callbacks.onConnectionChange?.(true);
          this.pingManager.start();
        }
        break;

      case 'ack':
        this.eventSender.handleAck(msg.q);
        break;

      case 'done':
        this.callbacks.onDone?.(msg.q);
        break;

      case 'err':
        this.callbacks.onError?.(msg.q, msg.c);
        break;

      case 'pong':
        this.pingManager.handlePong(msg.n);
        break;

      case 'status':
        this.callbacks.onStatus?.({ rssi: msg.rssi, uptimeMs: msg.ms });
        break;
    }
  }

  private cleanupConnection(): void {
    this.isHandshakeComplete = false;
    this.stateSender.stop();
    this.eventSender.clear();
    this.pingManager.stop();
    this.callbacks.onConnectionChange?.(false);
    this.callbacks.onGaugeChange?.('disconnected', null);
  }

  private scheduleReconnect(): void {
    if (this.reconnectTimer) return;
    this.reconnectTimer = this.clock.setTimeout(() => {
      this.reconnectTimer = null;
      if (this.shouldReconnect) {
        this.connect();
      }
    }, RECONNECT_INTERVAL_MS);
  }

  public send(msg: OutMessage): void {
    if (this.ws && this.ws.readyState === 1 /* OPEN */) {
      this.ws.send(JSON.stringify(msg));
    }
  }

  public disconnect(): void {
    this.shouldReconnect = false;
    if (this.reconnectTimer) {
      this.clock.clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.cleanupConnection();
  }

  public getStateSender(): StateSender { return this.stateSender; }
  public getEventSender(): EventSender { return this.eventSender; }
  public getSequencer(): Sequencer { return this.sequencer; }
  public isConnected(): boolean { return this.isHandshakeComplete; }
}
