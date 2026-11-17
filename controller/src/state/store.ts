export interface AppState {
  connected: boolean;
  gaugeState: 'good' | 'slow' | 'poor' | 'disconnected';
  rttMs: number | null;
  rssi: number | null;
  speed: number;
  lastError: string | null;
  activeDirection: number;
  activeThrottle: number;
}

export type Listener<T> = (state: T) => void;

export class Store<T> {
  private state: T;
  private listeners: Set<Listener<T>> = new Set();

  constructor(initialState: T) {
    this.state = initialState;
  }

  public getState(): T {
    return this.state;
  }

  public setState(partial: Partial<T>): void {
    this.state = { ...this.state, ...partial };
    this.notify();
  }

  public subscribe(listener: Listener<T>): () => void {
    this.listeners.add(listener);
    listener(this.state);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify(): void {
    for (const listener of this.listeners) {
      listener(this.state);
    }
  }
}
