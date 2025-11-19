"use client";

import { useSession } from "next-auth/react";
import { createContext, useContext, useEffect, useState, useCallback } from "react";

export interface StoredDocument {
  id: string;
  original_name: string;
  file_name: string;
  file_url: string;
  file_size: number;
  mime_type: string;
  uploaded_at: string;
  processing_status: string;
  chunk_count?: number;
  content_summary?: string;
  error_message?: string;
}

interface DocumentsContextType {
  documents: StoredDocument[];
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
  updateDocumentStatus: (documentId: string, status: string) => void;
  addDocument: (document: StoredDocument) => void;
}

const DocumentsContext = createContext<DocumentsContextType | undefined>(undefined);

export function DocumentsProvider({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession();
  const [documents, setDocuments] = useState<StoredDocument[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasLoaded, setHasLoaded] = useState(false);

  const fetchDocuments = useCallback(async (forceRefresh = false) => {
    // If already loaded and not forcing refresh, skip
    if (hasLoaded && !forceRefresh) {
      console.log('[DocumentsProvider] Using cached documents:', documents.length);
      return;
    }

    if (!session?.user?.id) {
      setDocuments([]);
      setHasLoaded(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/upload-document');
      
      if (!response.ok) {
        throw new Error('Failed to fetch documents');
      }

      const data = await response.json();
      const fetchedDocuments = data.documents || [];
      setDocuments(fetchedDocuments);
      setHasLoaded(true);
      console.log('[DocumentsProvider] Loaded documents:', fetchedDocuments.length);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      console.error('Error fetching documents:', err);
    } finally {
      setIsLoading(false);
    }
  }, [session?.user?.id, hasLoaded]);

  // Update document status in cache
  const updateDocumentStatus = useCallback((documentId: string, status: string) => {
    setDocuments(prev => prev.map(doc => 
      doc.id === documentId 
        ? { ...doc, processing_status: status }
        : doc
    ));
  }, []);

  // Add a new document to cache
  const addDocument = useCallback((document: StoredDocument) => {
    setDocuments(prev => {
      // Check if document already exists
      const exists = prev.find(d => d.id === document.id);
      if (exists) {
        // Update existing
        return prev.map(d => d.id === document.id ? document : d);
      }
      // Add new at the beginning
      return [document, ...prev];
    });
  }, []);

  // Fetch documents when authenticated
  useEffect(() => {
    if (status === 'authenticated' && session?.user?.id) {
      fetchDocuments();
    } else if (status === 'unauthenticated') {
      setDocuments([]);
      setHasLoaded(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, session?.user?.id]);

  // Listen for document upload events to refresh cache
  useEffect(() => {
    const handleDocumentUploaded = () => {
      console.log('[DocumentsProvider] Document uploaded, refreshing cache...');
      fetchDocuments(true);
    };

    const handleDocumentStatusChanged = (event: CustomEvent) => {
      const { documentId, status } = event.detail;
      console.log('[DocumentsProvider] Document status changed:', documentId, status);
      updateDocumentStatus(documentId, status);
    };

    // Listen for custom events
    window.addEventListener('document-uploaded', handleDocumentUploaded as EventListener);
    window.addEventListener('document-status-changed', handleDocumentStatusChanged as EventListener);
    
    return () => {
      window.removeEventListener('document-uploaded', handleDocumentUploaded as EventListener);
      window.removeEventListener('document-status-changed', handleDocumentStatusChanged as EventListener);
    };
  }, [fetchDocuments, updateDocumentStatus]);

  return (
    <DocumentsContext.Provider 
      value={{ 
        documents, 
        isLoading, 
        error, 
        refetch: () => fetchDocuments(true),
        updateDocumentStatus,
        addDocument,
      }}
    >
      {children}
    </DocumentsContext.Provider>
  );
}

export function useDocuments() {
  const context = useContext(DocumentsContext);
  if (context === undefined) {
    throw new Error('useDocuments must be used within a DocumentsProvider');
  }
  return context;
}

