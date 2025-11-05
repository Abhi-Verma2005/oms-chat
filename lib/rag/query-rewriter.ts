import { generateObject } from 'ai';
import { z } from 'zod';

import { openaiFlashModel } from '../../ai';

/**
 * Rewrite and expand user query for better semantic search
 * Helps find more relevant context by expanding synonyms and related terms
 */
export async function rewriteQuery(originalQuery: string): Promise<string> {
  try {
    const { object } = await generateObject({
      model: openaiFlashModel,
      schema: z.object({
        expandedQuery: z
          .string()
          .describe('Expanded query with synonyms, related terms, and context variations'),
        keywords: z
          .array(z.string())
          .describe('Key terms extracted from the query'),
      }),
      prompt: `Expand and rewrite this query for better semantic search and retrieval:
Original: "${originalQuery}"

Return an expanded query that includes:
- Synonyms and related terms
- Context-appropriate variations
- Key concepts and entities
- Broader and narrower related terms

Keep the expanded query concise (1-2 sentences max) while maintaining the core intent.`,
      temperature: 0.3,
      maxTokens: 150,
    });

    const expanded = object.expandedQuery?.trim();
    if (expanded && expanded.length > 0) {
      return expanded;
    }

    return originalQuery;
  } catch (error) {
    console.warn('[RAG Query Rewriter] Failed:', error);
    return originalQuery;
  }
}

/**
 * Extract key topics/themes from query for metadata filtering
 */
export async function extractTopics(query: string): Promise<string[]> {
  try {
    const { object } = await generateObject({
      model: openaiFlashModel,
      schema: z.object({
        topics: z
          .array(z.string())
          .describe('Key topics, themes, or categories from the query'),
      }),
      prompt: `Extract key topics and themes from this query:
"${query}"

Return 2-5 concise topic labels (single words or short phrases).`,
      temperature: 0.2,
      maxTokens: 100,
    });

    return object.topics || [];
  } catch (error) {
    console.warn('[RAG Topic Extraction] Failed:', error);
    return [];
  }
}

