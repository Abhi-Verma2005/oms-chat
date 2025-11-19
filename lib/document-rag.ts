import { documentChunking, type DocumentChunk } from './document-chunking'

import type { CSVMetadata, XLSXMetadata, DOCXMetadata, PDFMetadata } from './file-processor'

// Namespace function matching mosaic-next
function getNamespace(type: 'publishers' | 'documents', userId?: string): string {
  if (type === 'publishers') {
    return 'publishers'
  }
  if (type === 'documents' && userId) {
    return `user_${userId}_docs`
  }
  throw new Error('Invalid namespace configuration')
}

export interface DocumentRAGMetadata {
  documentId: string
  filename: string
  type: string
  size: number
  csvMetadata?: CSVMetadata
  xlsxMetadata?: XLSXMetadata
  docxMetadata?: DOCXMetadata
  pdfMetadata?: PDFMetadata
}

export interface DocumentRAGResult {
  success: boolean
  chunks: DocumentChunk[]
  error?: string
}

export class DocumentRAGService {
  private openaiKey: string
  private pineconeApiKey: string
  private pineconeHost: string

  constructor() {
    this.openaiKey = process.env.OPENAI_API_KEY || process.env.OPEN_AI_KEY || ''
    this.pineconeApiKey = process.env.PINECONE_API_KEY || ''
    this.pineconeHost =
      process.env.PINECONE_INDEX_HOST ||
      (process.env.PINECONE_INDEX_NAME && process.env.PINECONE_PROJECT_ID && process.env.PINECONE_ENVIRONMENT
        ? `https://${process.env.PINECONE_INDEX_NAME}-${process.env.PINECONE_PROJECT_ID}.svc.${process.env.PINECONE_ENVIRONMENT}.pinecone.io`
        : '')

    if (!this.openaiKey) {
      console.warn('[DocumentRAG] OpenAI API key not configured')
    }
    if (!this.pineconeApiKey || !this.pineconeHost) {
      console.warn('[DocumentRAG] Pinecone not configured')
    }
  }

  /**
   * Add document with chunking, embedding, and Pinecone storage
   */
  async addDocumentWithChunking(
    content: string,
    metadata: DocumentRAGMetadata,
    userId: string
  ): Promise<DocumentRAGResult> {
    try {
      if (!this.openaiKey || !this.pineconeApiKey || !this.pineconeHost) {
        throw new Error('Document RAG services not configured')
      }

      console.log(`📄 Processing document: ${metadata.filename} for user ${userId}`)

      // 1. Chunk the document
      const chunks = documentChunking.chunkDocument(
        content,
        metadata.documentId,
        metadata.filename,
        userId,
        1000, // chunkSize
        200,  // overlap
        metadata.csvMetadata,
        metadata.xlsxMetadata,
        metadata.docxMetadata,
        metadata.pdfMetadata
      )

      if (chunks.length === 0) {
        throw new Error('No chunks created from document')
      }

      console.log(`✂️ Created ${chunks.length} chunks`)

      // 2. Generate embeddings for all chunks
      const chunkTexts = chunks.map(c => c.text)
      const embeddings = await this.generateEmbeddings(chunkTexts)

      // 3. Prepare vectors with rich metadata
      const vectors = chunks.map((chunk, i) => ({
        id: `${metadata.documentId}_chunk_${chunk.index}`,
        values: embeddings[i],
        metadata: {
          ...chunk.metadata,
          type: 'document_chunk',
          text: chunk.text, // Store full text in Pinecone metadata
          timestamp: new Date().toISOString(),
          fileType: metadata.type,
          fileSize: metadata.size,
          isCSV: !!metadata.csvMetadata,
          isXLSX: !!metadata.xlsxMetadata,
          isDOCX: !!metadata.docxMetadata,
          isPDF: !!metadata.pdfMetadata
        }
      }))

      // 4. Upsert to user's namespace
      const namespace = getNamespace('documents', userId)
      console.log(`📤 Uploading ${chunks.length} chunks to Pinecone namespace: ${namespace}`)

      await this.upsertToPinecone(namespace, vectors)

      console.log(`✅ Successfully uploaded ${chunks.length} chunks to namespace: ${namespace}`)

      return { success: true, chunks }

    } catch (error) {
      console.error('❌ Failed to add document:', error)
      return {
        success: false,
        chunks: [],
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  /**
   * Generate embeddings for multiple texts using OpenAI
   */
  private async generateEmbeddings(texts: string[]): Promise<number[][]> {
    try {
      const response = await fetch('https://api.openai.com/v1/embeddings', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.openaiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'text-embedding-3-small',
          input: texts,
          dimensions: 1536
        }),
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`OpenAI API error: ${response.status} ${errorText}`)
      }

      const data = await response.json()
      return data.data.map((item: any) => item.embedding as number[])
    } catch (error) {
      console.error('❌ Embedding generation failed:', error)
      throw error
    }
  }

  /**
   * Upsert vectors to Pinecone
   */
  private async upsertToPinecone(
    namespace: string,
    vectors: Array<{
      id: string
      values: number[]
      metadata: Record<string, any>
    }>
  ): Promise<void> {
    const url = `${this.pineconeHost}/vectors/upsert`
    const start = Date.now()
    console.log(`[Pinecone] Upsert start namespace=${namespace} count=${vectors.length}`)

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Api-Key': this.pineconeApiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          vectors: vectors,
          namespace: namespace,
        }),
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`Pinecone upsert failed: ${response.status} ${errorText}`)
      }

      console.log(`[Pinecone] Upsert success namespace=${namespace} count=${vectors.length} ms=${Date.now() - start}`)
    } catch (error) {
      console.error(`[Pinecone] Upsert failed namespace=${namespace} error=${(error as Error).message}`)
      throw error
    }
  }

  /**
   * Search document chunks from Pinecone (for backend use)
   */
  async searchDocumentChunks(
    query: string,
    userId: string,
    limit: number = 5,
    selectedDocuments?: string[]
  ): Promise<Array<{
    id: string
    content: string
    score: number
    documentId: string
    documentName: string
    chunkIndex: number
    metadata: any
  }>> {
    try {
      if (!this.openaiKey || !this.pineconeApiKey || !this.pineconeHost) {
        throw new Error('Document RAG services not configured')
      }

      // Generate query embedding
      const embeddings = await this.generateEmbeddings([query])
      const queryEmbedding = embeddings[0]

      // Build filter for selected documents
      const filter: any = {}
      if (selectedDocuments && selectedDocuments.length > 0) {
        filter.documentId = { $in: selectedDocuments }
      }

      // Query Pinecone
      const namespace = getNamespace('documents', userId)
      const url = `${this.pineconeHost}/query`
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Api-Key': this.pineconeApiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          vector: queryEmbedding,
          topK: limit * 2, // Get more for filtering
          namespace: namespace,
          filter: Object.keys(filter).length > 0 ? filter : undefined,
          includeMetadata: true,
        }),
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`Pinecone query failed: ${response.status} ${errorText}`)
      }

      const data = await response.json()
      const matches = (data?.matches || []) as Array<{
        id: string
        score: number
        metadata?: any
      }>

      // Format results
      return matches.slice(0, limit).map(match => ({
        id: match.id,
        content: match.metadata?.text || '',
        score: match.score,
        documentId: match.metadata?.documentId || '',
        documentName: match.metadata?.documentName || '',
        chunkIndex: match.metadata?.chunkIndex || 0,
        metadata: match.metadata || {}
      }))
    } catch (error) {
      console.error('❌ Document chunk search failed:', error)
      throw error
    }
  }
}

export const documentRAGService = new DocumentRAGService()

