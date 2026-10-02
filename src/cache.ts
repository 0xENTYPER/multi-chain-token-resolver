interface CacheEntry<T> {
  expiresAt: number;
  value: T;
}

export class MemoryCache<T> {
  private readonly entries = new Map<string, CacheEntry<T>>();

  constructor(private readonly ttlMs: number) {}

  get(key: string, now: number): T | undefined {
    const entry = this.entries.get(key);
    if (!entry) return undefined;
    if (entry.expiresAt <= now) {
      this.entries.delete(key);
      return undefined;
    }
    return entry.value;
  }

  set(key: string, value: T, now: number): void {
    this.entries.set(key, { value, expiresAt: now + this.ttlMs });
  }
}
