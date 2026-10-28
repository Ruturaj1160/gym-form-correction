import { useSyncExternalStore } from "react";

/** Minimal observable value so non-React code (the pose loop) can publish to React. */
export class Store<T> {
  private readonly listeners = new Set<() => void>();

  constructor(private state: T) {}

  get = (): T => this.state;

  set(next: T): void {
    if (Object.is(next, this.state)) return;
    this.state = next;
    this.listeners.forEach((l) => l());
  }

  update(patch: Partial<T>): void {
    this.set({ ...this.state, ...patch });
  }

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };
}

export function useStore<T>(store: Store<T>): T {
  return useSyncExternalStore(store.subscribe, store.get);
}
