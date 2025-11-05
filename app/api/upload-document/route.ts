import crypto from 'crypto'

import { eq, and, desc } from 'drizzle-orm'
import { NextRequest, NextResponse } from 'next/server'

import { auth } from '@/app/(auth)/auth'
import { documentRAGService } from '@/lib/document-rag'
import { userDocuments, documentChunkMetadata } from '@/lib/drizzle-external/schema'
import { external_db } from '@/lib/external-db'
import { fileProcessor } from '@/lib/file-processor'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// File validation
const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB
const ALLOWED_TYPES = [
  'text/plain',
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/msword',
  'text/csv',
  'application/json',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-excel'
]

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

export async function POST(req: NextRequest) {
  try {
    console.log('[API /api/upload-document] POST start');
    const session = await auth()
    if (!session?.user?.id) {
      console.warn('[API /api/upload-document] Unauthorized');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log('[API /api/upload-document] Parsing formData');
    const formData = await req.formData()
    const file = formData.get('file') as File
    const userId = session.user.id
    console.log('[API /api/upload-document] Parsed file', file ? { name: file.name, type: file.type, size: file.size } : null)
    
    // Validation
    if (!file) {
      console.warn('[API /api/upload-document] No file provided');
      return NextResponse.json({ 
        error: 'File is required' 
      }, { status: 400 })
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ 
        error: `File too large. Maximum size is ${MAX_FILE_SIZE / (1024 * 1024)}MB` 
      }, { status: 400 })
    }

    // More flexible file type validation
    const fileExtension = file.name.split('.').pop()?.toLowerCase()
    const allowedExtensions = ['txt', 'pdf', 'docx', 'doc', 'csv', 'json', 'xlsx', 'xls']
    
    if (!ALLOWED_TYPES.includes(file.type) && !allowedExtensions.includes(fileExtension || '')) {
      return NextResponse.json({ 
        error: 'Unsupported file type. Supported: TXT, PDF, DOCX, DOC, CSV, JSON, XLSX, XLS' 
      }, { status: 400 })
    }

    // Generate file hash for duplicate detection
    console.log('[API /api/upload-document] Reading file buffer for hash');
    const fileBuffer = Buffer.from(await file.arrayBuffer())
    const fileHash = crypto.createHash('sha256').update(fileBuffer).digest('hex')
    console.log('[API /api/upload-document] File hash generated');

    // Check for duplicate
    const existingDocs = await external_db
      .select()
      .from(userDocuments)
      .where(
        and(
          eq(userDocuments.userId, userId),
          eq(userDocuments.fileHash, fileHash),
          eq(userDocuments.isActive, true)
        )
      )
      .limit(1)

    if (existingDocs.length > 0) {
      return NextResponse.json({ 
        error: 'This file has already been uploaded',
        document: {
          id: existingDocs[0].id,
          original_name: existingDocs[0].originalName
        }
      }, { status: 409 })
    }
    
    // 1. Upload to external storage
    const uploadFormData = new FormData()
    uploadFormData.append('file_name', new Blob([fileBuffer]), file.name)
    
    // Upload to external storage with SSL error handling
    let uploadResponse
    try {
      console.log('[API /api/upload-document] External upload via HTTPS');
      uploadResponse = await fetch('https://da.outreachdeal.com/upload.php', {
        method: 'POST',
        body: uploadFormData,
        headers: {
          'User-Agent': 'OMS-Document-Uploader/1.0'
        }
      })
    } catch (sslError) {
      console.log('⚠️ HTTPS upload failed, trying HTTP fallback...', sslError)
      try {
        uploadResponse = await fetch('http://da.outreachdeal.com/upload.php', {
          method: 'POST',
          body: uploadFormData,
          headers: {
            'User-Agent': 'OMS-Document-Uploader/1.0'
          }
        })
        console.log('✅ HTTP fallback upload successful')
      } catch (httpError) {
        console.error('❌ Both HTTPS and HTTP upload attempts failed')
        throw new Error(`External upload failed: ${sslError instanceof Error ? sslError.message : 'SSL Error'}`)
      }
    }
    
    // Try to parse JSON response
    let uploadResult: any = {}
    try {
      const responseText = await uploadResponse.text()
      console.log('[API /api/upload-document] External upload raw response:', responseText?.slice(0, 200))
      if (responseText.trim()) {
        uploadResult = JSON.parse(responseText)
      } else {
        uploadResult = {
          success: true,
          file_name: file.name,
          message: 'Upload completed (empty response)'
        }
      }
    } catch (parseError) {
      console.warn('[API /api/upload-document] External upload non-JSON response, assuming success')
      uploadResult = {
        success: true,
        file_name: file.name,
        message: 'Upload completed (non-JSON response)'
      }
    }
    
    if (!uploadResult.success) {
      console.error('[API /api/upload-document] External upload reported failure', uploadResult)
      throw new Error(uploadResult.error || 'External upload failed')
    }

    // 2. Create database record immediately
    const documentId = `doc_${userId}_${Date.now()}`
    const namespace = getNamespace('documents', userId)
    
    console.log('[API /api/upload-document] Inserting DB record', { documentId, namespace })
    await external_db.insert(userDocuments).values({
      id: documentId,
      userId: userId,
      originalName: file.name,
      fileName: uploadResult.file_name || file.name,
      fileUrl: uploadResult.url || `https://da.outreachdeal.com/uploads/${file.name}`,
      fileSize: file.size,
      mimeType: file.type,
      contentSummary: '', // Will be updated after processing
      processingStatus: 'processing',
      fileHash: fileHash,
      pineconeNamespace: namespace,
      isActive: true,
      chunkCount: 0,
      accessCount: 0,
    })

    // 3. Process asynchronously (don't block response)
    console.log('[API /api/upload-document] Kicking off async processing', { documentId })
    processDocumentAsync(documentId, file, userId, namespace)

    return NextResponse.json({
      success: true,
      document: {
        id: documentId,
        original_name: file.name,
        status: 'processing',
        message: 'Document uploaded and processing started'
      }
    })

  } catch (error) {
    console.error('[API /api/upload-document] Upload error:', error)
    return NextResponse.json({ 
      error: 'Upload failed', 
      details: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 })
  }
}

// Async processing function
async function processDocumentAsync(
  documentId: string,
  file: File,
  userId: string,
  namespace: string
) {
  try {
    console.log(`🔄 [API /api/upload-document] Processing document ${documentId}...`)
    
    // 1. Extract content
    console.log('🔍 [API /api/upload-document] Starting content extraction...')
    const extractionResult = await fileProcessor.extractContent(file)
    
    if (!extractionResult.success) {
      console.log(`⚠️ [API /api/upload-document] Content extraction failed: ${extractionResult.error}`)
      
      await external_db
        .update(userDocuments)
        .set({
          contentSummary: 'Content extraction failed - document uploaded but not processed',
          processingStatus: 'failed',
          errorMessage: extractionResult.error || 'Content extraction failed'
        })
        .where(eq(userDocuments.id, documentId))
      
      console.log(`❌ [API /api/upload-document] Document ${documentId} processing failed: ${extractionResult.error}`)
      return
    }

    const content = extractionResult.content
    console.log(`✅ [API /api/upload-document] Extracted ${content.length} characters`)
    
    // 2. Generate content summary (first 200 chars)
    const contentSummary = content.substring(0, 200) + (content.length > 200 ? '...' : '')
    
    // 3. Add to RAG system with chunking and metadata
    console.log(`[API /api/upload-document] RAG add start userId=${userId} docId=${documentId} filename=${file.name}`)
    const result = await documentRAGService.addDocumentWithChunking(
      content,
      {
        documentId,
        filename: file.name,
        type: file.type,
        size: file.size,
        csvMetadata: extractionResult.metadata?.csvMetadata,
        xlsxMetadata: extractionResult.metadata?.xlsxMetadata,
        docxMetadata: extractionResult.metadata?.docxMetadata,
        pdfMetadata: extractionResult.metadata?.pdfMetadata
      },
      userId
    )
    console.log(`[API /api/upload-document] RAG add finished docId=${documentId} success=${result.success} chunks=${result.chunks?.length ?? 0}`)

    if (!result.success) {
      throw new Error(result.error || 'Failed to add to RAG system')
    }

    // 4. Store chunk metadata in database
    if (result.chunks.length > 0) {
      const chunkMetadata = result.chunks.map((chunk, i) => ({
        id: `${documentId}_chunk_${i}`,
        documentId: documentId,
        userId: userId,
        chunkIndex: i,
        tokenCount: Math.ceil(chunk.text.length / 4), // Rough estimate
        pineconeId: `${documentId}_chunk_${i}`
      }))

      await external_db.insert(documentChunkMetadata).values(chunkMetadata)
    }

    // 5. Update document status
    await external_db
      .update(userDocuments)
      .set({
        contentSummary: contentSummary,
        processingStatus: 'completed',
        chunkCount: result.chunks.length,
        errorMessage: null
      })
      .where(eq(userDocuments.id, documentId))
    
    console.log(`✅ [API /api/upload-document] Document ${documentId} processed: ${result.chunks.length} chunks (namespace=user_${userId}_docs)`) 

  } catch (error) {
    console.error(`❌ [API /api/upload-document] Processing failed for ${documentId}:`, error)
    await external_db
      .update(userDocuments)
      .set({
        processingStatus: 'failed',
        errorMessage: error instanceof Error ? error.message : 'Unknown processing error'
      })
      .where(eq(userDocuments.id, documentId))
  }
}

// GET endpoint to fetch user documents
export async function GET(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const searchParams = req.nextUrl.searchParams
    const searchQuery = searchParams.get('search') || ''
    const userId = session.user.id

    // Get all documents for the user (no limit - fetch all)
    const documents = await external_db
      .select()
      .from(userDocuments)
      .where(
        and(
          eq(userDocuments.userId, userId),
          eq(userDocuments.isActive, true)
        )
      )
      .orderBy(desc(userDocuments.uploadedAt))

    console.log(`[GET /api/upload-document] Found ${documents.length} documents for user ${userId}`)
    console.log(`[GET /api/upload-document] Document IDs:`, documents.map((d: any) => d.id))
    console.log(`[GET /api/upload-document] Document names:`, documents.map((d: any) => d.originalName))

    // Filter by search query if provided
    const filtered = searchQuery
      ? documents.filter((doc: any) => 
          (doc.originalName?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
          (doc.fileName?.toLowerCase() || '').includes(searchQuery.toLowerCase())
        )
      : documents

    console.log(`[GET /api/upload-document] Returning ${filtered.length} documents after filtering`)

    return NextResponse.json({
      success: true,
      documents: filtered.map((doc: any) => ({
        id: doc.id,
        original_name: doc.originalName,
        file_name: doc.fileName,
        file_url: doc.fileUrl,
        file_size: doc.fileSize,
        mime_type: doc.mimeType,
        uploaded_at: doc.uploadedAt,
        processing_status: doc.processingStatus,
        chunk_count: doc.chunkCount,
        content_summary: doc.contentSummary,
        error_message: doc.errorMessage
      }))
    })

  } catch (error) {
    console.error('Error fetching documents:', error)
    return NextResponse.json({ 
      error: 'Failed to fetch documents',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

