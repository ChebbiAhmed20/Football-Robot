export type InMessage =
  | { t: 'hello'; v: number; fw: string }
  | { t: 'ack'; q: number }
  | { t: 'done'; q: number }
  | { t: 'err'; q: number; c: 'bad_msg' | 'busy' | 'cancelled' | 'queue_full' | string }
  | { t: 'pong'; n: number }
  | { t: 'status'; rssi: number; ms: number };

export type OutMessage =
  | { t: 'hello'; v: number }
  | { t: 'drive'; q: number; d: number; m: number; s: number }
  | { t: 'spin'; q: number; r: number; s: number }
  | { t: 'stop'; q: number }
  | { t: 'turn'; q: number; a: number; s?: number }
  | { t: 'ping'; q?: number; n: number };

export interface RobotStatus {
  rssi: number;
  uptimeMs: number;
}

