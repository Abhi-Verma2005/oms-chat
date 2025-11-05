// Uses native fetch (no axios dependency)

export interface RAGResult {
  id: string;
  content: string;
  score: number;
  metadata: {
    chatId?: string;
    messageId?: string;
    role?: string;
    createdAt?: string;
    isProfile?: boolean;
    isPreference?: boolean;
  };
}

export interface RAGRetrievalConfig {
  topK?: number;
  minScore?: number;
  includeRoles?: Array<'user' | 'assistant' | 'system' | 'function'>;
  timeout?: number;
}

/**
 * RAG Retrieval Service
 * Retrieves relevant conversation context from Pinecone for chat responses
 * Uses direct API calls to avoid dependency on backend-ts package
 */
export class RAGRetrievalService {
  private openaiKey: string;
  private pineconeApiKey: string;
  private pineconeHost: string;

  constructor() {
    this.openaiKey = process.env.OPENAI_API_KEY || process.env.OPEN_AI_KEY || '';
    if (!this.openaiKey) {
      console.warn('[RAG] OpenAI API key not configured - RAG will be disabled');
    }

    this.pineconeApiKey = process.env.PINECONE_API_KEY || '';
    this.pineconeHost =
      process.env.PINECONE_INDEX_HOST ||
      (process.env.PINECONE_INDEX_NAME && process.env.PINECONE_PROJECT_ID && process.env.PINECONE_ENVIRONMENT
        ? `https://${process.env.PINECONE_INDEX_NAME}-${process.env.PINECONE_PROJECT_ID}.svc.${process.env.PINECONE_ENVIRONMENT}.pinecone.io`
        : '');

    if (!this.pineconeApiKey || !this.pineconeHost) {
      console.warn('[RAG] Pinecone not configured - RAG will be disabled');
    }
  }

  /**
   * Generate embedding for query text
   */
  private async generateEmbedding(text: string): Promise<number[]> {
    if (!this.openaiKey) {
      throw new Error('OpenAI API key not configured');
    }

    const res = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.openaiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'text-embedding-3-small',
        input: text.trim(),
        dimensions: 1536,
      }),
    });
    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      throw new Error(`OpenAI embeddings failed: ${res.status} ${errText}`);
    }
    const data = await res.json();
    const embedding = data?.data?.[0]?.embedding;
    if (!embedding || !Array.isArray(embedding)) {
      throw new Error('Invalid embedding response');
    }

    return embedding;
  }

  /**
   * Query Pinecone for similar vectors
   */
  private async queryPinecone(
    namespace: string,
    vector: number[],
    topK: number,
    filter?: any
  ): Promise<Array<{ id: string; score: number; metadata?: any }>> {
    if (!this.pineconeApiKey || !this.pineconeHost) {
      throw new Error('Pinecone not configured');
    }

    const res = await fetch(`${this.pineconeHost}/query`, {
      method: 'POST',
      headers: {
        'Api-Key': this.pineconeApiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        vector,
        topK,
        namespace,
        filter,
        includeMetadata: true,
      }),
    });
    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      throw new Error(`Pinecone query failed: ${res.status} ${errText}`);
    }
    const data = await res.json();
    const matches = data?.matches || [];
    return matches.map((m: any) => ({
      id: m.id,
      score: m.score || 0,
      metadata: m.metadata,
    }));
  }

  /**
   * Retrieve relevant context from user's conversation history
   * Uses dual-query strategy (general + profile-focused) for better recall
   */
  async retrieveContext(
    userId: string,
    query: string,
    config: RAGRetrievalConfig = {}
  ): Promise<RAGResult[]> {
    const {
      topK = 5,
      minScore = 0.3, // Lower threshold like backend (was 0.7 - too strict!)
      includeRoles = ['user', 'assistant'],
      timeout = 5000,
    } = config;

    try {
      // Check if services are configured
      if (!this.openaiKey || !this.pineconeApiKey || !this.pineconeHost) {
        console.warn('[RAG] RAG services not fully configured, skipping retrieval');
        return [];
      }

      // Generate query embedding with timeout
      const embeddingPromise = this.generateEmbedding(query);
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Embedding generation timeout')), timeout);
      });

      const embedding = await Promise.race([embeddingPromise, timeoutPromise]);

      if (!embedding || embedding.length === 0) {
        console.warn('[RAG] Empty embedding generated');
        return [];
      }

      // Profile-hinted embedding for better recall of personal facts (like backend)
      let profileEmbedding: number[] | null = null;
      try {
        const profileHintText = `${query}\n\nuser profile preference favorite company ownership identity`;
        profileEmbedding = await this.generateEmbedding(profileHintText);
      } catch (error) {
        console.warn('[RAG] Profile embedding generation failed, using general only:', error);
      }

      // Build filter for roles
      const roleFilter: any = {};
      if (includeRoles.length > 0) {
        roleFilter.role = { $in: includeRoles };
      }

      // Dual query strategy: general + profile-focused (like backend)
      const generalQueryPromise = this.queryPinecone(
        userId,
        embedding,
        topK * 3, // Get more candidates (was topK * 2)
        Object.keys(roleFilter).length > 0 ? roleFilter : undefined
      );

      const profileQueryPromise = profileEmbedding
        ? this.queryPinecone(
            userId,
            profileEmbedding,
            Math.min(10, topK * 2),
            { isProfile: true, ...roleFilter } // Focus on profile facts
          )
        : Promise.resolve([]);

      const [generalResults, profileResults] = await Promise.race([
        Promise.all([generalQueryPromise, profileQueryPromise]),
        new Promise<never>((_, reject) => {
          setTimeout(() => reject(new Error('Pinecone query timeout')), timeout);
        }),
      ]);

      // Merge and deduplicate results (like backend)
      const merged = [...(generalResults || []), ...(profileResults || [])];
      const bestById = new Map<string, { id: string; score: number; metadata?: any }>();
      
      for (const m of merged) {
        const prev = bestById.get(m.id);
        if (!prev || (typeof m.score === 'number' && m.score > prev.score)) {
          bestById.set(m.id, m);
        }
      }

      const deduped = Array.from(bestById.values());

      // Apply threshold with fallback: keep at least top 3 (like backend)
      let filtered = deduped.filter(r => 
        typeof r.score === 'number' ? r.score >= minScore : true
      );
      
      if (filtered.length < 3) {
        filtered = deduped
          .sort((a, b) => (b.score || 0) - (a.score || 0))
          .slice(0, Math.min(3, deduped.length));
      }

      // Ensure top 3 profile facts are included regardless of score (like backend)
      const profileTop = deduped
        .filter(r => r.metadata?.isProfile === true)
        .sort((a, b) => (b.score || 0) - (a.score || 0))
        .slice(0, 3);

      // Merge and deduplicate again
      const finalMap = new Map<string, typeof filtered[number]>();
      [...filtered, ...profileTop].forEach(m => finalMap.set(m.id, m));
      const finalList = Array.from(finalMap.values())
        .sort((a, b) => (b.score || 0) - (a.score || 0))
        .slice(0, topK);

      // Format results
      const relevant = finalList
        .map(r => ({
          id: r.id,
          content: r.metadata?.text || r.metadata?.content || '', // Use 'text' field (backend uses this)
          score: r.score,
          metadata: {
            chatId: r.metadata?.chatId || r.metadata?.userId,
            messageId: r.metadata?.messageId,
            role: r.metadata?.role as 'user' | 'assistant' | undefined,
            createdAt: r.metadata?.createdAt,
            isProfile: r.metadata?.isProfile === true,
            isPreference: r.metadata?.isPreference === true,
          },
        }))
        .filter(r => r.content.length > 0); // Remove empty results

      console.log(`[RAG] Retrieved ${relevant.length} relevant contexts (${filtered.length} above threshold, ${profileTop.length} profile facts) for user ${userId}`);
      return relevant;
    } catch (error) {
      console.error('[RAG] Retrieval failed:', error);
      // Return empty array on error (fail gracefully)
      return [];
    }
  }

  /**
   * Build context string for system prompt
   * Improved formatting like backend (includes scores and tags)
   */
  buildContextString(results: RAGResult[]): string {
    if (results.length === 0) return '';

    // Prioritize profile/preference information
    const profileResults = results.filter(r => r.metadata.isProfile || r.metadata.isPreference);
    const conversationResults = results.filter(r => !r.metadata.isProfile && !r.metadata.isPreference);

    const sections: string[] = [];

    if (profileResults.length > 0) {
      const profileBullets = profileResults
        .map((r, idx) => {
          const content = r.content.slice(0, 500); // Truncate long content
          const scoreStr = r.score ? ` (score=${r.score.toFixed(2)})` : '';
          return `- ${content}${scoreStr}`;
        })
        .join('\n');
      
      sections.push(`## User Preferences and Profile (retrieved for this user)\n${profileBullets}`);
    }

    if (conversationResults.length > 0) {
      const historyBullets = conversationResults
        .map((r, idx) => {
          const content = r.content.slice(0, 500); // Truncate long content
          const scoreStr = r.score ? ` (score=${r.score.toFixed(2)})` : '';
          return `- ${content}${scoreStr}`;
        })
        .join('\n');
      
      sections.push(`## Relevant Conversation History (retrieved for this user)\n${historyBullets}`);
    }

    return sections.length > 0 ? `\n\n${sections.join('\n\n')}\n` : '';
  }

  /**
   * Retrieve context with query rewriting (optional enhancement)
   */
  async retrieveContextWithRewrite(
    userId: string,
    originalQuery: string,
    rewriteQueryFn?: (query: string) => Promise<string>,
    config: RAGRetrievalConfig = {}
  ): Promise<RAGResult[]> {
    let query = originalQuery;

    // Rewrite query if function provided
    if (rewriteQueryFn) {
      try {
        query = await rewriteQueryFn(originalQuery);
        console.log(`[RAG] Query rewritten: "${originalQuery}" -> "${query}"`);
      } catch (error) {
        console.warn('[RAG] Query rewriting failed, using original:', error);
      }
    }

    return this.retrieveContext(userId, query, config);
  }
}

/**
 * Singleton instance
 */
let ragRetrievalInstance: RAGRetrievalService | null = null;

export function getRAGRetrievalService(): RAGRetrievalService {
  if (!ragRetrievalInstance) {
    ragRetrievalInstance = new RAGRetrievalService();
  }
  return ragRetrievalInstance;
}

// Export default instance for convenience
export const ragRetrieval = getRAGRetrievalService();

