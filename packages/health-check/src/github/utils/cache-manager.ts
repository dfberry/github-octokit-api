/**
 * Helper module for in-memory and persistent caching mechanisms
 * to further reduce GitHub API calls
 */
export default class CacheManager {
  private cache: Map<string, { data: any; timestamp: number }>;
  private etagStore: Map<string, string>;
  private persistentStorage: any;
  private cacheValidityMs: number;

  constructor(
    options: {
      cacheValidityMs?: number;
      persistentStorage?: any;
    } = {}
  ) {
    this.cache = new Map();
    this.etagStore = new Map();
    this.persistentStorage = options.persistentStorage;
    this.cacheValidityMs = options.cacheValidityMs || 1000 * 60 * 60; // Default: 1 hour
  }

  /**
   * Generate a cache key from various input formats
   */
  getCacheKey(
    input:
      | string
      | { owner: string; name: string }
      | { org: string; repo: string }
  ): string {
    if (typeof input === 'string') {
      return input;
    }

    if ('owner' in input && 'name' in input) {
      return `${input.owner}/${input.name}`;
    }

    if ('org' in input && 'repo' in input) {
      return `${input.org}/${input.repo}`;
    }

    throw new Error('Invalid input format for cache key generation');
  }

  /**
   * Store data in the cache
   */
  set<T>(key: string, data: T): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
    });

    // If persistent storage is available, store there too
    if (this.persistentStorage) {
      this.persistentStorage.save(key, data);
    }
  }

  /**
   * Get data from the cache if it exists and is not expired
   */
  get<T>(key: string): T | null {
    // First check in-memory cache
    const cached = this.cache.get(key);

    if (cached && Date.now() - cached.timestamp < this.cacheValidityMs) {
      return cached.data as T;
    }

    // If not in memory cache, try persistent storage
    if (this.persistentStorage) {
      try {
        const data = this.persistentStorage.load(key);
        const timestamp = this.persistentStorage.getTimestamp(key);

        if (
          data &&
          timestamp &&
          Date.now() - timestamp < this.cacheValidityMs
        ) {
          // Put it in memory cache for faster access next time
          this.cache.set(key, { data, timestamp });
          return data as T;
        }
      } catch (e) {
        // Ignore errors from persistent storage
      }
    }

    return null;
  }

  /**
   * Store an ETag for a resource
   */
  setETag(resource: string, etag: string): void {
    this.etagStore.set(resource, etag);
  }

  /**
   * Get an ETag for a resource if available
   */
  getETag(resource: string): string | undefined {
    return this.etagStore.get(resource);
  }

  /**
   * Check if a cache entry exists and is still fresh
   */
  isFresh(key: string): boolean {
    const cached = this.cache.get(key);

    if (cached && Date.now() - cached.timestamp < this.cacheValidityMs) {
      return true;
    }

    // Check persistent storage if available
    if (this.persistentStorage) {
      try {
        const timestamp = this.persistentStorage.getTimestamp(key);
        if (timestamp && Date.now() - timestamp < this.cacheValidityMs) {
          return true;
        }
      } catch (e) {
        // Ignore errors from persistent storage
      }
    }

    return false;
  }

  /**
   * Invalidate a cache entry
   */
  invalidate(key: string): void {
    this.cache.delete(key);

    if (this.persistentStorage) {
      this.persistentStorage.delete(key);
    }
  }

  /**
   * Get cache statistics
   */
  getStats(): {
    memorySize: number;
    persistentSize: number;
    averageAge: number;
    hitRate: number;
  } {
    const memorySize = this.cache.size;
    const timestamps = Array.from(this.cache.values()).map(
      item => item.timestamp
    );
    const now = Date.now();
    const ages = timestamps.map(ts => now - ts);
    const averageAge = ages.length
      ? ages.reduce((sum, age) => sum + age, 0) / ages.length
      : 0;

    // Persistent storage stats
    let persistentSize = 0;
    if (
      this.persistentStorage &&
      typeof this.persistentStorage.getSize === 'function'
    ) {
      persistentSize = this.persistentStorage.getSize();
    }

    return {
      memorySize,
      persistentSize,
      averageAge,
      hitRate: 0, // This would require tracking hits and misses
    };
  }
}
