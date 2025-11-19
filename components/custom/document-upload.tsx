"use client"

import { CheckCircle, Clock, FileText, Loader2, Upload, X, XCircle } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { toast } from 'sonner'

import { cn } from '@/lib/utils'

import { useDocuments, type StoredDocument } from '../../contexts/DocumentsProvider'
import { Button } from '../ui/button'
import { Input } from '../ui/input'

interface DocumentUploadProps {
  onDocumentSelect?: (documentId: string) => void
  selectedDocuments?: string[]
  className?: string
  onDocumentsUpdated?: () => void
}

export function DocumentUpload({ 
  onDocumentSelect, 
  selectedDocuments = [], 
  className,
  onDocumentsUpdated
}: DocumentUploadProps) {
  const [isUploading, setIsUploading] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)
  const intervalRefs = useRef<Map<string, NodeJS.Timeout>>(new Map())
  
  // Use documents from context
  const { documents: allDocuments, isLoading, refetch: refetchDocuments, updateDocumentStatus, addDocument } = useDocuments()
  
  // Filter documents by search query (client-side filtering since context has all documents)
  const documents = useMemo<StoredDocument[]>(() => {
    if (!searchQuery) return allDocuments
    const query = searchQuery.toLowerCase()
    return allDocuments.filter(doc => 
      (doc.original_name?.toLowerCase() || '').includes(query) ||
      (doc.file_name?.toLowerCase() || '').includes(query)
    )
  }, [allDocuments, searchQuery])

  // Cleanup intervals on unmount
  useEffect(() => {
    return () => {
      intervalRefs.current.forEach(interval => clearInterval(interval))
    }
  }, [])

  // Poll document status
  const pollDocumentStatus = (documentId: string) => {
    if (intervalRefs.current.has(documentId)) {
      return // Already polling
    }

    const interval = setInterval(async () => {
      try {
        const response = await fetch(`/api/upload-document?search=`)
        if (response.ok) {
          const data = await response.json()
          const doc = data.documents?.find((d: StoredDocument) => d.id === documentId)
          
          if (doc) {
            // Update status in context
            updateDocumentStatus(documentId, doc.processing_status)
            
            // Dispatch event for other components
            window.dispatchEvent(new CustomEvent('document-status-changed', {
              detail: { documentId, status: doc.processing_status }
            }))
            
            if (doc.processing_status === 'completed' || doc.processing_status === 'failed') {
              clearInterval(interval)
              intervalRefs.current.delete(documentId)
              refetchDocuments() // Refresh list from context
              onDocumentsUpdated?.()
            }
          }
        }
      } catch (error) {
        console.error('Failed to poll document status:', error)
      }
    }, 2000) // Poll every 2 seconds

    intervalRefs.current.set(documentId, interval)
  }

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    setIsUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', file)

      const response = await fetch('/api/upload-document', {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Upload failed')
      }

      const result = await response.json()
      
      if (result.success) {
        const newDoc: StoredDocument = {
          ...result.document,
          processing_status: 'processing',
          original_name: result.document.original_name,
          file_size: result.document.file_size ?? file.size,
          mime_type: result.document.mime_type ?? file.type ?? 'application/octet-stream',
        }
        
        // Add to context
        addDocument(newDoc)
        toast.success('Document uploaded successfully')
        
        // Start polling for this document
        pollDocumentStatus(result.document.id)
        onDocumentsUpdated?.()
        
        // Dispatch custom event to notify other components (context will also listen)
        window.dispatchEvent(new CustomEvent('document-uploaded', { 
          detail: { documentId: result.document.id } 
        }))
        
        // Also refresh to get latest from server
        refetchDocuments()
      } else {
        throw new Error(result.error || 'Upload failed')
      }
    } catch (error) {
      console.error('Upload error:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to upload document')
    } finally {
      setIsUploading(false)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  const handleDocumentToggle = (documentId: string) => {
    if (onDocumentSelect) {
      onDocumentSelect(documentId)
    }
  }

  const truncateFilename = (filename: string, maxLength: number = 25) => {
    if (filename.length <= maxLength) return filename
    const lastDotIndex = filename.lastIndexOf('.')
    if (lastDotIndex === -1) {
      return `${filename.substring(0, maxLength - 3)}...`
    }
    const extension = filename.substring(lastDotIndex)
    const nameWithoutExt = filename.substring(0, lastDotIndex)
    const truncated = nameWithoutExt.substring(0, maxLength - extension.length - 3)
    return `${truncated}...${extension}`
  }

  const filteredDocuments = documents.filter(doc =>
    !searchQuery || 
    doc.original_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    doc.file_name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div className={cn("space-y-4", className)}>
      {/* Upload Button */}
      <div>
        <input
          ref={fileInputRef}
          type="file"
          accept=".txt,.pdf,.docx,.doc,.csv,.json,.xlsx,.xls"
          onChange={handleFileUpload}
          className="hidden"
          disabled={isUploading}
        />
        <Button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading}
          className="w-full"
          variant="outline"
        >
          {isUploading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Uploading...
            </>
          ) : (
            <>
              <Upload className="w-4 h-4 mr-2" />
              Upload Document
            </>
          )}
        </Button>
      </div>

      {/* Search */}
      {documents.length > 0 && (
        <Input
          placeholder="Search documents..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full"
        />
      )}

      {/* Documents List */}
      <div className="space-y-2 max-h-[400px] overflow-y-auto">
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
          </div>
        ) : filteredDocuments.length === 0 ? (
          <div className="text-center py-8 text-sm text-muted-foreground">
            {searchQuery ? 'No documents found' : 'No documents uploaded yet'}
          </div>
        ) : (
          filteredDocuments.map(doc => {
            const status = doc.processing_status
            const isCompleted = status === 'completed'
            const isFailed = status === 'failed'
            const isProcessing = status === 'processing'
            const isSelected = selectedDocuments.includes(doc.id)
            
            return (
              <div
                key={doc.id}
                className={cn(
                  "flex items-center gap-3 p-3 rounded-lg border transition-colors",
                  isSelected && "bg-primary/10 border-primary",
                  !isCompleted && "opacity-60"
                )}
              >
                <button
                  type="button"
                  className={cn(
                    "flex-1 text-left flex items-center gap-2 min-w-0",
                    !isCompleted && "cursor-not-allowed"
                  )}
                  onClick={() => {
                    if (isCompleted) handleDocumentToggle(doc.id)
                  }}
                  disabled={!isCompleted}
                >
                  <span className={cn(
                    "inline-flex items-center justify-center w-4 h-4 rounded-full border",
                    isSelected && "bg-primary border-primary text-primary-foreground",
                    !isSelected && "border-muted-foreground"
                  )}>
                    {isSelected && <CheckCircle className="w-3 h-3" />}
                  </span>
                  <FileText className="w-4 h-4 flex-shrink-0 text-muted-foreground" />
                  <span className="truncate text-sm" title={doc.original_name}>
                    {truncateFilename(doc.original_name, 30)}
                  </span>
                </button>
                
                {/* Status Icon */}
                <div className="flex-shrink-0">
                  {isProcessing && (
                    <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                  )}
                  {isCompleted && (
                    <CheckCircle className="w-4 h-4 text-green-500" />
                  )}
                  {isFailed && (
                    <XCircle className="w-4 h-4 text-red-500" />
                  )}
                  {status === 'pending' && (
                    <Clock className="w-4 h-4 text-yellow-500" />
                  )}
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}

