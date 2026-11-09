export interface CacheEntry<T> {
  value: T;
  expiresAt: number;
  createdAt: number;
}

export interface CacheStats {
  size: number;
  hits: number;
  misses: number;
  hitRatePercentage: number;
  evictions: number;
}

export class MemoryCache {
  private cache: Map<string, CacheEntry<unknown>> = new Map();
  private inFlightPromises: Map<string, Promise<unknown>> = new Map();
  private maxItems: number;
  private defaultTtlMs: number;
  private hits = 0;
  private misses = 0;
  private evictions = 0;

  constructor(maxItems = 1000, defaultTtlMs = 300000) {
    this.maxItems = maxItems;
    this.defaultTtlMs = defaultTtlMs;
  }

  public get<T>(key: string): T | undefined {
    const entry = this.cache.get(key);
    if (!entry) {
      this.misses++;
      return undefined;
    }

    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      this.misses++;
      return undefined;
    }

    this.hits++;
    return entry.value as T;
  }

  public set<T>(key: string, value: T, ttlMs?: number): void {
    if (this.cache.size >= this.maxItems) {
      // Evict oldest entry (first key in map)
      const oldestKey = this.cache.keys().next().value;
      if (oldestKey) {
        this.cache.delete(oldestKey);
        this.evictions++;
      }
    }

    const expiresAt = Date.now() + (ttlMs ?? this.defaultTtlMs);
    this.cache.set(key, {
      value,
      expiresAt,
      createdAt: Date.now()
    });
  }

  /**
   * Request Deduplication (Promise Coalescing):
   * If an identical asynchronous computation is already in flight, reuse the promise.
   */
  public async getOrCompute<T>(
    key: string,
    computeFn: () => Promise<T>,
    ttlMs?: number
  ): Promise<T> {
    const cached = this.get<T>(key);
    if (cached !== undefined) {
      return cached;
    }

    const inFlight = this.inFlightPromises.get(key);
    if (inFlight) {
      return inFlight as Promise<T>;
    }

    const promise = computeFn()
      .then(result => {
        this.set(key, result, ttlMs);
        this.inFlightPromises.delete(key);
        return result;
      })
      .catch(err => {
        this.inFlightPromises.delete(key);
        throw err;
      });

    this.inFlightPromises.set(key, promise);
    return promise;
  }

  public delete(key: string): boolean {
    return this.cache.delete(key);
  }

  public clear(): void {
    this.cache.clear();
    this.inFlightPromises.clear();
  }

  public getStats(): CacheStats {
    const total = this.hits + this.misses;
    return {
      size: this.cache.size,
      hits: this.hits,
      misses: this.misses,
      hitRatePercentage: total > 0 ? parseFloat(((this.hits / total) * 100).toFixed(1)) : 0,
      evictions: this.evictions
    };
  }
}

export const appCache = new MemoryCache();
