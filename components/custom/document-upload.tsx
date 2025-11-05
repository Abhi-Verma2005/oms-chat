"use client"

import { useState, useRef, useEffect } from 'react'
import { Upload, FileText, X, CheckCircle, Loader2, XCircle, Clock } from 'lucide-react'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

interface Document {
  id: string
  original_name: string
  file_name: string
  file_url: string
  file_size?: number
  mime_type?: string
  uploaded_at: string
  processing_status: string
  chunk_count?: number
  content_summary?: string
  error_message?: string
}

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
  const [documents, setDocuments] = useState<Document[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [documentStatuses, setDocumentStatuses] = useState<Map<string, string>>(new Map())
  const intervalRefs = useRef<Map<string, NodeJS.Timeout>>(new Map())

  // Load documents on mount
  useEffect(() => {
    loadDocuments()
    return () => {
      // Cleanup intervals on unmount
      intervalRefs.current.forEach(interval => clearInterval(interval))
    }
  }, [])

  const loadDocuments = async () => {
    setIsLoading(true)
    try {
      const response = await fetch(`/api/upload-document?search=${encodeURIComponent(searchQuery)}`)
      if (response.ok) {
        const data = await response.json()
        setDocuments(data.documents || [])
        
        // Update statuses map
        const statusMap = new Map<string, string>()
        data.documents?.forEach((doc: Document) => {
          statusMap.set(doc.id, doc.processing_status)
        })
        setDocumentStatuses(statusMap)
      }
    } catch (error) {
      console.error('Failed to load documents:', error)
      toast.error('Failed to load documents')
    } finally {
      setIsLoading(false)
    }
  }

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
          const doc = data.documents?.find((d: Document) => d.id === documentId)
          
          if (doc) {
            setDocumentStatuses(prev => {
              const next = new Map(prev)
              next.set(documentId, doc.processing_status)
              return next
            })
            
            if (doc.processing_status === 'completed' || doc.processing_status === 'failed') {
              clearInterval(interval)
              intervalRefs.current.delete(documentId)
              loadDocuments() // Refresh list
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
        const newDoc = {
          ...result.document,
          processing_status: 'processing',
          original_name: result.document.original_name,
        }
        setDocuments(prev => [newDoc, ...prev])
        setDocumentStatuses(prev => {
          const next = new Map(prev)
          next.set(result.document.id, 'processing')
          return next
        })
        toast.success('Document uploaded successfully')
        
        // Start polling for this document
        pollDocumentStatus(result.document.id)
        onDocumentsUpdated?.()
        
        // Dispatch custom event to notify other components
        window.dispatchEvent(new CustomEvent('document-uploaded', { 
          detail: { documentId: result.document.id } 
        }))
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
            const status = documentStatuses.get(doc.id) || doc.processing_status
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

