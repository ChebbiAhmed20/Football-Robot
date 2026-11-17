import { mixDrive, mixSpin, MotorOutput, PWM_CAP } from './mixing.js';

export interface RobotState {
  connected: boolean;
  leftPwm: number;
  rightPwm: number;
  lastStateQ: number;
  turnActive: boolean;
  activeTurnQ: number;
  failsafeTripped: boolean;
}

export type SendCallback = (msg: string) => void;
export type CloseCallback = (code: number, reason: string) => void;

export class RobotModel {
  public static PROTOCOL_VERSION = 4;
  public static FW_VERSION = '1.0.0';
  public static FAILSAFE_MS = 800;
  public static STATUS_INTERVAL_MS = 500;
  public static TURN_MS_PER_DEG_RIGHT = 4.5;
  public static TURN_MS_PER_DEG_LEFT = 4.5;
  public static TURN_PWM = 200;
  public static MAX_EVENT_QUEUE = 8;

  private connected = false;
  private leftPwm = 0;
  private rightPwm = 0;
  private lastStateQ = 0;
  private lastMsgTime = 0;

  private activeTurnQ = 0;
  private turnTimeout: NodeJS.Timeout | null = null;

  private failsafeInterval: NodeJS.Timeout | null = null;
  private statusInterval: NodeJS.Timeout | null = null;
  private failsafeTripped = false;

  private executedEvents = new Set<number>();
  private eventQueue: Array<{ q: number; type: string; a?: number }> = [];

  private send: SendCallback = () => {};
  private close: CloseCallback = () => {};
  private startTime = Date.now();

  constructor() {}

  public onClientConnected(sendCb: SendCallback, closeCb: CloseCallback): boolean {
    if (this.connected) {
      // Single client enforcement (PROTOCOL.md §1 & §10)
      closeCb(4001, 'Already connected to a controller');
      return false;
    }

    this.connected = true;
    this.send = sendCb;
    this.close = closeCb;
    this.resetState();
    this.lastMsgTime = Date.now();

    // Start failsafe checker
    this.failsafeInterval = setInterval(() => {
      this.checkFailsafe();
    }, 50);

    // Start status broadcast every 500 ms (PROTOCOL.md §9)
    this.statusInterval = setInterval(() => {
      this.sendStatus();
    }, RobotModel.STATUS_INTERVAL_MS);

    return true;
  }

  public onClientDisconnected(): void {
    this.connected = false;
    this.resetState();
    if (this.failsafeInterval) clearInterval(this.failsafeInterval);
    if (this.statusInterval) clearInterval(this.statusInterval);
    if (this.turnTimeout) clearTimeout(this.turnTimeout);
    this.failsafeInterval = null;
    this.statusInterval = null;
    this.turnTimeout = null;
  }

  private resetState(): void {
    this.leftPwm = 0;
    this.rightPwm = 0;
    this.lastStateQ = 0;
    this.activeTurnQ = 0;
    this.failsafeTripped = false;
    this.executedEvents.clear();
    this.eventQueue = [];
    if (this.turnTimeout) {
      clearTimeout(this.turnTimeout);
      this.turnTimeout = null;
    }
  }

  public handleMessage(rawMessage: string): void {
    if (!this.connected) return;

    if (rawMessage.length > 128) {
      this.sendError(0, 'bad_msg');
      return;
    }

    let msg: any;
    try {
      msg = JSON.parse(rawMessage);
    } catch {
      this.sendError(0, 'bad_msg');
      return;
    }

    if (!msg || typeof msg !== 'object' || typeof msg.t !== 'string') {
      this.sendError(0, 'bad_msg');
      return;
    }

    // Ping
    if (msg.t === 'ping') {
      if (typeof msg.n !== 'number') {
        this.sendError(0, 'bad_msg');
        return;
      }
      this.lastMsgTime = Date.now();
      this.failsafeTripped = false;
      this.send(JSON.stringify({ t: 'pong', n: msg.n }));
      return;
    }

    // Hello
    if (msg.t === 'hello') {
      if (typeof msg.v !== 'number') {
        this.sendError(0, 'bad_msg');
        return;
      }
      this.lastMsgTime = Date.now();
      this.failsafeTripped = false;
      if (msg.v !== RobotModel.PROTOCOL_VERSION) {
        this.close(4002, 'Protocol version mismatch');
        return;
      }
      this.send(JSON.stringify({
        t: 'hello',
        v: RobotModel.PROTOCOL_VERSION,
        fw: RobotModel.FW_VERSION
      }));
      return;
    }

    // All other commands require a positive integer q
    if (typeof msg.q !== 'number' || msg.q <= 0 || !Number.isInteger(msg.q)) {
      this.sendError(0, 'bad_msg');
      return;
    }

    const q = msg.q;
    this.lastMsgTime = Date.now();
    this.failsafeTripped = false;

    switch (msg.t) {
      case 'drive':
        this.handleDrive(msg, q);
        break;
      case 'spin':
        this.handleSpin(msg, q);
        break;
      case 'turn':
        this.handleTurn(msg, q);
        break;
      case 'stop':
        this.handleStop(q);
        break;
      default:
        this.sendError(q, 'bad_msg');
        break;
    }
  }

  private handleDrive(msg: any, q: number): void {
    // If turn is active, drive commands are ignored (PROTOCOL.md §6.4)
    if (this.turnTimeout !== null) {
      return;
    }

    if (q <= this.lastStateQ) {
      // Ignored out of order / stale state command
      return;
    }

    if (typeof msg.d !== 'number' || typeof msg.m !== 'number' || typeof msg.s !== 'number') {
      this.sendError(q, 'bad_msg');
      return;
    }

    if (msg.d < -1 || msg.d > 15) {
      this.sendError(q, 'bad_msg');
      return;
    }

    this.lastStateQ = q;
    const motor = mixDrive(msg.d, msg.m, msg.s);
    this.leftPwm = motor.left;
    this.rightPwm = motor.right;
  }

  private handleSpin(msg: any, q: number): void {
    if (this.turnTimeout !== null) {
      return;
    }

    if (q <= this.lastStateQ) {
      return;
    }

    if (msg.r !== -1 && msg.r !== 0 && msg.r !== 1) {
      this.sendError(q, 'bad_msg');
      return;
    }

    this.lastStateQ = q;
    const s = typeof msg.s === 'number' ? msg.s : 200;
    const motor = mixSpin(msg.r, s);
    this.leftPwm = motor.left;
    this.rightPwm = motor.right;
  }

  private handleTurn(msg: any, q: number): void {
    // Check if duplicate event
    if (this.executedEvents.has(q)) {
      this.send(JSON.stringify({ t: 'ack', q }));
      return;
    }

    if (msg.a !== 90 && msg.a !== -90 && msg.a !== 180 && msg.a !== -180) {
      this.sendError(q, 'bad_msg');
      return;
    }

    // A new turn while one is running gets err busy (PROTOCOL.md §6.4)
    if (this.turnTimeout !== null) {
      this.send(JSON.stringify({ t: 'ack', q }));
      this.send(JSON.stringify({ t: 'err', q, c: 'busy' }));
      return;
    }

    // Check queue limit
    if (this.eventQueue.length >= RobotModel.MAX_EVENT_QUEUE) {
      // Drop oldest non-stop
      const dropIdx = this.eventQueue.findIndex(e => e.type !== 'stop');
      if (dropIdx !== -1) {
        this.eventQueue.splice(dropIdx, 1);
      } else {
        this.send(JSON.stringify({ t: 'err', q, c: 'queue_full' }));
        return;
      }
    }

    this.executedEvents.add(q);
    this.send(JSON.stringify({ t: 'ack', q }));

    // Execute turn immediately
    this.activeTurnQ = q;
    const rate = msg.a >= 0 ? RobotModel.TURN_MS_PER_DEG_RIGHT : RobotModel.TURN_MS_PER_DEG_LEFT;
    const durationMs = Math.round(Math.abs(msg.a) * rate);

    if (msg.a > 0) {
      this.leftPwm = RobotModel.TURN_PWM;
      this.rightPwm = -RobotModel.TURN_PWM;
    } else {
      this.leftPwm = -RobotModel.TURN_PWM;
      this.rightPwm = RobotModel.TURN_PWM;
    }

    this.turnTimeout = setTimeout(() => {
      this.leftPwm = 0;
      this.rightPwm = 0;
      this.turnTimeout = null;
      this.send(JSON.stringify({ t: 'done', q }));
    }, durationMs);
  }

  private handleStop(q: number): void {
    if (this.executedEvents.has(q)) {
      this.send(JSON.stringify({ t: 'ack', q }));
      return;
    }

    this.executedEvents.add(q);
    this.eventQueue = [];

    // Stop has priority: cancels active turn
    if (this.turnTimeout !== null) {
      clearTimeout(this.turnTimeout);
      this.turnTimeout = null;
      const cancelledTurnQ = this.activeTurnQ;
      this.activeTurnQ = 0;
      this.send(JSON.stringify({ t: 'err', q: cancelledTurnQ, c: 'cancelled' }));
    }

    this.leftPwm = 0;
    this.rightPwm = 0;
    this.send(JSON.stringify({ t: 'ack', q }));
  }

  private checkFailsafe(): void {
    if (!this.connected) return;
    const elapsed = Date.now() - this.lastMsgTime;
    if (elapsed >= RobotModel.FAILSAFE_MS && !this.failsafeTripped) {
      this.failsafeTripped = true;
      this.leftPwm = 0;
      this.rightPwm = 0;
    }
  }

  private sendStatus(): void {
    if (!this.connected) return;
    const uptimeMs = Date.now() - this.startTime;
    this.send(JSON.stringify({
      t: 'status',
      rssi: -50,
      ms: uptimeMs
    }));
  }

  private sendError(q: number, code: string): void {
    this.send(JSON.stringify({ t: 'err', q, c: code }));
  }

  public getState(): RobotState {
    return {
      connected: this.connected,
      leftPwm: this.leftPwm,
      rightPwm: this.rightPwm,
      lastStateQ: this.lastStateQ,
      turnActive: this.turnTimeout !== null,
      activeTurnQ: this.activeTurnQ,
      failsafeTripped: this.failsafeTripped
    };
  }
}

