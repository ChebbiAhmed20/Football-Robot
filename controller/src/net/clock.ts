export interface Clock {
  now(): number;
  setTimeout(cb: () => void, ms: number): any;
  clearTimeout(id: any): void;
  setInterval(cb: () => void, ms: number): any;
  clearInterval(id: any): void;
}

export const defaultClock: Clock = {
  now: () => Date.now(),
  setTimeout: (cb, ms) => setTimeout(cb, ms),
  clearTimeout: (id) => clearTimeout(id),
  setInterval: (cb, ms) => setInterval(cb, ms),
  clearInterval: (id) => clearInterval(id),
};
