# RAG Implementation Analysis & Plan

## Current State Analysis

### Mosaic-Next (Production RAG System) ✅

**Architecture:**
- **Storage:** PostgreSQL with `pgvector` extension
- **Database Table:** `user_knowledge_base` with vector column (1536 dimensions)
- **Search Strategy:** Hybrid search (semantic + keyword using PostgreSQL full-text search)
- **Reranking:** Cohere API for 30-48% better accuracy
- **Caching:** Semantic cache (memory + database) with 90% cost reduction
- **Query Processing:** Query rewriting → Hybrid search → Reranking → Context building

**Key Components:**
1. `lib/rag/hybrid-search.ts` - Hybrid search with semantic + keyword matching
2. `lib/rag/reranker.ts` - Cohere reranking for precision
3. `lib/rag/semantic-cache.ts` - Multi-layer caching system
4. `lib/rag/rag-pipeline.ts` - Orchestrates entire RAG flow
5. `lib/rag-minimal.ts` - Pinecone-based document storage (separate from conversations)

**Integration:**
- Retrieves context BEFORE generating response
- Injects RAG context into system prompt
- Stores user interactions in knowledge base
- Has timeout protection (10s) for RAG processing

### Frontend/Backend-TS (Current State) ⚠️

**What EXISTS:**
- ✅ Embedding queue system (`backend-ts/src/queues/embedding-queue.ts`)
- ✅ Pinecone service for storage (`backend-ts/src/services/pinecone.ts`)
- ✅ Embedding service (`backend-ts/src/services/embeddings.ts`)
- ✅ Schema has `MessageEmbeddings` table for tracking
- ✅ Messages are chunked and embedded asynchronously
- ✅ Embeddings stored in Pinecone with user namespaces

**What's MISSING:**
- ❌ No RAG retrieval in chat route
- ❌ No query embedding generation for search
- ❌ No hybrid search (only Pinecone semantic search available)
- ❌ No reranking
- ❌ No semantic caching
- ❌ No context injection into system prompts
- ❌ No query rewriting

**The Gap:**
The frontend has infrastructure to **STORE** embeddings but **NOT** to **RETRIEVE** and **USE** them in chat responses.

---

## Recommended Implementation Plan

### Phase 1: Basic RAG Retrieval (Essential)

**Goal:** Enable basic context retrieval from Pinecone

**Files to Create:**
1. `frontend/lib/rag/retrieval.ts` - Pinecone-based retrieval service
2. `frontend/lib/rag/embedding-utils.ts` - Query embedding generation

**Key Features:**
- Query embedding generation
- Pinecone vector search
- Basic relevance filtering (score > 0.7)
- Context formatting for system prompt

### Phase 2: Enhanced RAG Pipeline (Recommended)

**Goal:** Match mosaic-next's hybrid search capabilities

**Options:**
- **Option A:** Use PostgreSQL + pgvector (requires database migration)
  - Pros: Hybrid search, keyword matching, better performance
  - Cons: Migration needed, different from current Pinecone setup

- **Option B:** Enhance Pinecone with query rewriting + reranking
  - Pros: Keeps current infrastructure
  - Cons: No native keyword search (would need separate system)

**Recommendation:** Start with Option B, migrate to Option A later if needed

**Additional Components:**
1. `frontend/lib/rag/query-rewriter.ts` - Query expansion/rewriting
2. `frontend/lib/rag/reranker.ts` - Optional Cohere reranking
3. `frontend/lib/rag/rag-pipeline.ts` - Orchestrates retrieval

### Phase 3: Performance Optimization (Nice to Have)

**Components:**
1. `frontend/lib/rag/semantic-cache.ts` - Cache similar queries
2. Monitoring and performance tracking
3. Timeout protection

---

## Implementation Steps

### Step 1: Create RAG Retrieval Service

Create `frontend/lib/rag/retrieval.ts`:

```typescript
import { EmbeddingService } from '@/backend-ts/src/services/embeddings';
import { PineconeService } from '@/backend-ts/src/services/pinecone';

export interface RAGResult {
  id: string;
  content: string;
  score: number;
  metadata: {
    chatId?: string;
    messageId?: string;
    role?: string;
    createdAt?: string;
  };
}

export class RAGRetrievalService {
  private embeddingService: EmbeddingService;
  private pineconeService: PineconeService;

  constructor() {
    this.embeddingService = new EmbeddingService(
      process.env.OPENAI_API_KEY!,
      'text-embedding-3-small'
    );
    this.pineconeService = new PineconeService({
      apiKey: process.env.PINECONE_API_KEY!,
      indexHost: process.env.PINECONE_INDEX_HOST,
      indexName: process.env.PINECONE_INDEX_NAME,
      projectId: process.env.PINECONE_PROJECT_ID,
      environment: process.env.PINECONE_ENVIRONMENT,
    });
  }

  async retrieveContext(
    userId: string,
    query: string,
    topK: number = 5,
    minScore: number = 0.7
  ): Promise<RAGResult[]> {
    // 1. Generate query embedding
    const { embedding } = await this.embeddingService.embed(query);
    
    // 2. Search Pinecone
    const results = await this.pineconeService.query({
      namespace: userId,
      vector: embedding,
      topK: topK * 2, // Get more candidates for filtering
      filter: {
        role: { $in: ['user', 'assistant'] } // Only conversation messages
      }
    });

    // 3. Filter by relevance and format
    const relevant = results
      .filter(r => r.score >= minScore)
      .slice(0, topK)
      .map(r => ({
        id: r.id,
        content: r.metadata?.text || '',
        score: r.score,
        metadata: {
          chatId: r.metadata?.chatId,
          messageId: r.metadata?.messageId,
          role: r.metadata?.role,
          createdAt: r.metadata?.createdAt,
        }
      }));

    return relevant;
  }

  buildContextString(results: RAGResult[]): string {
    if (results.length === 0) return '';
    
    return `\n\nRELEVANT CONVERSATION CONTEXT:\n${results
      .map((r, idx) => `[${idx + 1}] ${r.content}`)
      .join('\n\n')}`;
  }
}

export const ragRetrieval = new RAGRetrievalService();
```

### Step 2: RAG Integration (Already Implemented in Backend-TS)

**Note:** Chat processing is handled via WebSocket through `backend-ts/src/orchestrator/service.ts`, not through frontend HTTP routes.

RAG is already integrated in `OrchestratorService.processMessage()`:
- Conversation RAG: Retrieves relevant context from Pinecone (lines 140-314)
- Document RAG: Retrieves selected documents when provided (lines 247-295)
- Both are injected into the system prompt before generating responses

The frontend chat route has been removed to eliminate confusion and duplication. All chat processing now happens through the WebSocket server.

### Step 3: Add Query Rewriting (Optional Enhancement)

Create `frontend/lib/rag/query-rewriter.ts`:

```typescript
import { openaiFlashModel } from '@/ai';
import { generateObject } from 'ai';
import { z } from 'zod';

export async function rewriteQuery(originalQuery: string): Promise<string> {
  try {
    const { object } = await generateObject({
      model: openaiFlashModel,
      schema: z.object({
        expandedQuery: z.string().describe('Expanded query with synonyms and related terms'),
        keywords: z.array(z.string()).describe('Key terms to match')
      }),
      prompt: `Expand and rewrite this query for better semantic search:
Original: "${originalQuery}"

Return an expanded query that includes:
- Synonyms and related terms
- Context-appropriate variations
- Key concepts and entities`,
      temperature: 0.3,
    });

    return object.expandedQuery || originalQuery;
  } catch (error) {
    console.warn('Query rewriting failed:', error);
    return originalQuery;
  }
}
```

### Step 4: Add Semantic Caching (Performance)

Create `frontend/lib/rag/semantic-cache.ts` (simplified version):

```typescript
import { EmbeddingService } from '@/backend-ts/src/services/embeddings';

interface CacheEntry {
  queryEmbedding: number[];
  result: string;
  timestamp: number;
}

export class SimpleSemanticCache {
  private cache = new Map<string, CacheEntry>();
  private readonly TTL = 30 * 60 * 1000; // 30 minutes
  private readonly SIMILARITY_THRESHOLD = 0.95;

  async get(userId: string, query: string, embeddingService: EmbeddingService): Promise<string | null> {
    const queryEmbedding = await embeddingService.embed(query);
    
    // Check cache for similar queries
    for (const [key, entry] of this.cache.entries()) {
      if (!key.startsWith(userId)) continue;
      
      if (Date.now() - entry.timestamp > this.TTL) {
        this.cache.delete(key);
        continue;
      }

      const similarity = this.cosineSimilarity(queryEmbedding.embedding, entry.queryEmbedding);
      if (similarity >= this.SIMILARITY_THRESHOLD) {
        return entry.result;
      }
    }

    return null;
  }

  set(userId: string, query: string, result: string, embeddingService: EmbeddingService): void {
    // Clean up old entries
    if (this.cache.size > 1000) {
      const entries = Array.from(this.cache.entries());
      entries.sort((a, b) => a[1].timestamp - b[1].timestamp);
      entries.slice(0, 100).forEach(([key]) => this.cache.delete(key));
    }

    embeddingService.embed(query).then(({ embedding }) => {
      const key = `${userId}:${Date.now()}`;
      this.cache.set(key, {
        queryEmbedding: embedding,
        result,
        timestamp: Date.now(),
      });
    });
  }

  private cosineSimilarity(vec1: number[], vec2: number[]): number {
    const dotProduct = vec1.reduce((sum, a, i) => sum + a * vec2[i], 0);
    const mag1 = Math.sqrt(vec1.reduce((sum, a) => sum + a * a, 0));
    const mag2 = Math.sqrt(vec2.reduce((sum, a) => sum + a * a, 0));
    return dotProduct / (mag1 * mag2);
  }
}

export const semanticCache = new SimpleSemanticCache();
```

---

## Migration Path

### Immediate (Phase 1)
1. ✅ Create basic retrieval service
2. ✅ Integrate into chat route
3. ✅ Test with existing Pinecone data

### Short-term (Phase 2)
1. Add query rewriting
2. Add timeout protection
3. Add error handling and fallbacks

### Long-term (Phase 3)
1. Consider migrating to PostgreSQL + pgvector for hybrid search
2. Add Cohere reranking
3. Implement full semantic caching
4. Add monitoring and metrics

---

## Key Differences Summary

| Feature | Mosaic-Next | Frontend (Current) | Frontend (Recommended) |
|---------|-------------|-------------------|------------------------|
| Storage | PostgreSQL + pgvector | Pinecone | Pinecone (initially) |
| Search | Hybrid (semantic + keyword) | None | Semantic only |
| Reranking | Cohere API | None | Optional |
| Caching | Semantic cache | None | Simple cache |
| Query Rewriting | Yes | No | Yes |
| Context Injection | Yes | No | Yes |

---

## Testing Checklist

- [ ] Test retrieval with existing embeddings
- [ ] Verify context is injected correctly
- [ ] Test with empty/no results
- [ ] Test with low-relevance results
- [ ] Test timeout handling
- [ ] Test error handling
- [ ] Verify performance (should be <100ms for retrieval)
- [ ] Test with multiple users (namespace isolation)

---

## Notes

1. **Namespace Isolation:** Pinecone uses user IDs as namespaces, ensuring data isolation
2. **Chunking:** Existing embedding queue already handles chunking
3. **Metadata:** Existing system stores metadata (chatId, messageId, role) - use for filtering
4. **Performance:** Start simple, optimize later if needed
5. **Fallback:** Always continue without context if RAG fails (don't block chat)

