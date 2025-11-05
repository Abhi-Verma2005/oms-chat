// Lightweight embedding function for cache (avoids importing backend-ts)
async function generateEmbedding(text: string, apiKey: string): Promise<number[]> {
  const res = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'text-embedding-3-small',
      input: text.trim(),
      dimensions: 1536,
    }),
  });
  if (!res.ok) return [];
  const data = await res.json();
  return data?.data?.[0]?.embedding || [];
}

interface CacheEntry {
  queryEmbedding: number[];
  result: string;
  timestamp: number;
  hitCount: number;
}

/**
 * Simple in-memory semantic cache for RAG queries
 * Reduces redundant embedding generation and retrieval
 */
export class SimpleSemanticCache {
  private cache = new Map<string, CacheEntry>();
  private readonly TTL = 30 * 60 * 1000; // 30 minutes
  private readonly SIMILARITY_THRESHOLD = 0.95;
  private readonly MAX_SIZE = 1000;

  /**
   * Get cached result for similar query
   */
  async get(userId: string, query: string, openaiKey: string): Promise<string | null> {
    try {
      const embedding = await generateEmbedding(query, openaiKey);

      // Check cache for similar queries
      for (const [key, entry] of this.cache.entries()) {
        if (!key.startsWith(userId)) continue;

        // Check if expired
        if (Date.now() - entry.timestamp > this.TTL) {
          this.cache.delete(key);
          continue;
        }

        // Calculate similarity
        const similarity = this.cosineSimilarity(embedding, entry.queryEmbedding);
        if (similarity >= this.SIMILARITY_THRESHOLD) {
          entry.hitCount++;
          console.log(`[RAG Cache] HIT - Similarity: ${similarity.toFixed(3)}`);
          return entry.result;
        }
      }

      console.log('[RAG Cache] MISS');
      return null;
    } catch (error) {
      console.warn('[RAG Cache] Error during lookup:', error);
      return null;
    }
  }

  /**
   * Store result in cache
   */
  async set(userId: string, query: string, result: string, openaiKey: string): Promise<void> {
    try {
      // Clean up old entries if cache is full
      if (this.cache.size >= this.MAX_SIZE) {
        this.evictLRU();
      }

      // Generate embedding and store (async, non-blocking)
      const embedding = await generateEmbedding(query, openaiKey);
      const key = `${userId}:${Date.now()}`;

      this.cache.set(key, {
        queryEmbedding: embedding,
        result,
        timestamp: Date.now(),
        hitCount: 0,
      });

      console.log(`[RAG Cache] SET - Cache size: ${this.cache.size}`);
    } catch (error) {
      console.warn('[RAG Cache] Error storing:', error);
      // Don't throw - caching is best-effort
    }
  }

  /**
   * Clear cache for specific user
   */
  clearUserCache(userId: string): void {
    let cleared = 0;
    for (const key of this.cache.keys()) {
      if (key.startsWith(userId)) {
        this.cache.delete(key);
        cleared++;
      }
    }
    console.log(`[RAG Cache] Cleared ${cleared} entries for user ${userId}`);
  }

  /**
   * Clear all cache
   */
  clearAll(): void {
    const size = this.cache.size;
    this.cache.clear();
    console.log(`[RAG Cache] Cleared all ${size} entries`);
  }

  /**
   * Get cache statistics
   */
  getStats(): {
    size: number;
    totalHits: number;
    avgHitCount: number;
  } {
    const entries = Array.from(this.cache.values());
    const totalHits = entries.reduce((sum, e) => sum + e.hitCount, 0);
    const avgHitCount =
      entries.length > 0 ? totalHits / entries.length : 0;

    return {
      size: this.cache.size,
      totalHits,
      avgHitCount,
    };
  }

  /**
   * Evict least recently used entries
   */
  private evictLRU(): void {
    const entries = Array.from(this.cache.entries());
    entries.sort((a, b) => a[1].timestamp - b[1].timestamp);

    // Remove oldest 10%
    const toRemove = Math.floor(entries.length * 0.1);
    for (let i = 0; i < toRemove; i++) {
      this.cache.delete(entries[i][0]);
    }
  }

  /**
   * Calculate cosine similarity between two vectors
   */
  private cosineSimilarity(vec1: number[], vec2: number[]): number {
    if (vec1.length !== vec2.length) return 0;

    let dotProduct = 0;
    let mag1 = 0;
    let mag2 = 0;

    for (let i = 0; i < vec1.length; i++) {
      dotProduct += vec1[i] * vec2[i];
      mag1 += vec1[i] * vec1[i];
      mag2 += vec2[i] * vec2[i];
    }

    const denominator = Math.sqrt(mag1) * Math.sqrt(mag2);
    return denominator === 0 ? 0 : dotProduct / denominator;
  }
}

/**
 * Singleton cache instance
 */
export const semanticCache = new SimpleSemanticCache();

