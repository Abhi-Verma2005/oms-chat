"use client";

import { Attachment, ChatRequestOptions, CreateMessage, Message } from "ai";
import { motion, AnimatePresence } from "framer-motion";
import { FileText, X, CheckCircle, Loader2, Upload } from "lucide-react";
import {
  useRef,
  useEffect,
  useState,
  useCallback,
  Dispatch,
  SetStateAction,
  ChangeEvent,
} from "react";
import { toast } from "sonner";

import { ArrowUpIcon, StopIcon, GlobeIcon, ImageIcon, AtIcon, LoaderIcon } from "./icons";
import Logo from "./logo";
import { PreviewAttachment } from "./preview-attachment";
import useWindowSize from "./use-window-size";
import { useDocuments } from "../../contexts/DocumentsProvider";
import { Button } from "../ui/button";
import { Textarea } from "../ui/textarea";

// Removed static time-based greetings; we fetch a dynamic title and show skeleton while loading

const suggestedActions = [
  {
    title: "Get Publishers",
    label: "No filters — just show data",
    action: "Get publishers data without any filters",
  },
  {
    title: "What is backlinking?",
    label: "Explain benefits in simple terms",
    action: "Explain backlinking in simple terms and how it helps SEO",
  },
  {
    title: "Best filters for me",
    label: "Based on niche and budget",
    action: "Suggest the best publisher filters based on my niche and budget",
  },
  {
    title: "Make payment",
    label: "Proceed to checkout",
    action: "Open the cart so I can make payment for selected publishers",
  },
];

export function MultimodalInput({
  input,
  setInput,
  isLoading,
  stop,
  isCreatingChat,
  attachments,
  setAttachments,
  messages,
  append,
  handleSubmit,
  selectedDocuments,
  setSelectedDocuments,
}: {
  input: string;
  setInput: (value: string) => void;
  isLoading: boolean;
  stop: () => void;
  isCreatingChat?: boolean;
  attachments: Array<Attachment>;
  setAttachments: Dispatch<SetStateAction<Array<Attachment>>>;
  messages: Array<Message>;
  append: (
    message: Message | CreateMessage,
    chatRequestOptions?: ChatRequestOptions,
  ) => Promise<string | null | undefined>;
  handleSubmit: (
    event?: {
      preventDefault?: () => void;
    },
    chatRequestOptions?: ChatRequestOptions,
  ) => void;
  selectedDocuments: string[];
  setSelectedDocuments: Dispatch<SetStateAction<string[]>>;
}) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { width } = useWindowSize();
  const [pageTitleBase] = useState<string>("OMS Chat Assistant");
  const [showDocsHint, setShowDocsHint] = useState(false);
  const { documents, isLoading: isLoadingDocs, refetch: refetchDocuments, updateDocumentStatus } = useDocuments();
  const docsHintRef = useRef<HTMLDivElement>(null);
  const documentUploadInputRef = useRef<HTMLInputElement>(null);
  const [isUploadingDocument, setIsUploadingDocument] = useState(false);
  const fileDialogOpenRef = useRef(false);

  useEffect(() => {
    if (textareaRef.current) {
      adjustHeight();
    }
  }, []);

  const adjustHeight = () => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      const scrollHeight = textareaRef.current.scrollHeight;
      const maxHeight = 200; // max height in pixels (about 12-13 lines)
      const newHeight = Math.min(scrollHeight, maxHeight);
      textareaRef.current.style.height = `${newHeight}px`;
    }
  };

  const handleInput = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(event.target.value);
    adjustHeight();
  };

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadQueue, setUploadQueue] = useState<Array<string>>([]);

  const submitForm = useCallback(() => {
    handleSubmit(undefined, {
      experimental_attachments: attachments,
    });

    setAttachments([]);
    setShowDocsHint(false);

    if (width && width > 768) {
      textareaRef.current?.focus();
    }
  }, [attachments, handleSubmit, setAttachments, width]);

  const uploadFile = async (file: File) => {
    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await fetch(`/api/files/upload`, {
        method: "POST",
        body: formData,
      });

      if (response.ok) {
        const data = await response.json();
        const { url, pathname, contentType } = data;

        return {
          url,
          name: pathname,
          contentType: contentType,
        };
      } else {
        const { error } = await response.json();
        toast.error(error);
      }
    } catch (error) {
      toast.error("Failed to upload file, please try again!");
    }
  };

  const handleFileChange = useCallback(
    async (event: ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(event.target.files || []);

      setUploadQueue(files.map((file) => file.name));

      try {
        const uploadPromises = files.map((file) => uploadFile(file));
        const uploadedAttachments = await Promise.all(uploadPromises);
        const successfullyUploadedAttachments = uploadedAttachments.filter(
          (attachment) => attachment !== undefined,
        );

        setAttachments((currentAttachments) => [
          ...currentAttachments,
          ...successfullyUploadedAttachments,
        ]);
      } catch (error) {
        console.error("Error uploading files!", error);
      } finally {
        setUploadQueue([]);
      }
    },
    [setAttachments],
  );

  const [aiGreeting, setAiGreeting] = useState<string>("");
  const [aiSubtitle, setAiSubtitle] = useState<string>("");
  const [isTitleLoading, setIsTitleLoading] = useState<boolean>(true);
  const [isClient, setIsClient] = useState(false);
  useEffect(() => { setIsClient(true); }, []);

  // Documents are now managed by DocumentsProvider context
  // No need to fetch here - context handles it globally

  const toggleDocumentSelection = (documentId: string) => {
    setSelectedDocuments(prev => {
      if (prev.includes(documentId)) {
        return prev.filter(id => id !== documentId);
      } else {
        return [...prev, documentId];
      }
    });
  };

  const handleDocumentUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    // If user canceled picker, just reset the flag and bail
    if (!file) {
      fileDialogOpenRef.current = false;
      return;
    }

    setIsUploadingDocument(true);
    try {
      console.log('[MultimodalInput] Upload start', {
        name: file.name,
        type: file.type,
        size: file.size
      });
      const formData = new FormData();
      formData.append('file', file);

      console.log('[MultimodalInput] POST /api/upload-document ...');
      const response = await fetch('/api/upload-document', {
        method: 'POST',
        body: formData,
      });

      console.log('[MultimodalInput] /api/upload-document response', response.status, response.statusText);
      if (!response.ok) {
        const error = await response.json();
        console.error('[MultimodalInput] Upload failed response body:', error);
        throw new Error(error.error || 'Upload failed');
      }

      const result = await response.json();
      console.log('[MultimodalInput] Upload success payload:', result);
      
      if (result.success) {
        toast.success('Document uploaded successfully');
        
        // Dispatch event - DocumentsProvider will listen and refresh
        window.dispatchEvent(new CustomEvent('document-uploaded', { 
          detail: { documentId: result.document.id } 
        }));
        
        // Also refresh immediately
        refetchDocuments();
      } else {
        throw new Error(result.error || 'Upload failed');
      }
    } catch (error) {
      console.error('Upload error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to upload document');
    } finally {
      setIsUploadingDocument(false);
      fileDialogOpenRef.current = false;
      // Reset file input
      if (documentUploadInputRef.current) {
        documentUploadInputRef.current.value = '';
      }
    }
  };

  // Safety: if the user cancels the dialog and focus returns, clear the flag
  useEffect(() => {
    const onWindowFocus = () => {
      // Delay slightly to allow onChange to fire if a file was picked
      setTimeout(() => {
        fileDialogOpenRef.current = false;
      }, 300);
    };
    window.addEventListener('focus', onWindowFocus);
    return () => window.removeEventListener('focus', onWindowFocus);
  }, []);

  const completedDocuments = documents.filter(doc => doc.processing_status === 'completed');
  const allDocuments = documents; // Show all documents, not just completed ones

  // Update document title for SEO when there's no conversation yet
  useEffect(() => {
    const shouldShowEmpty = messages.length === 0 && attachments.length === 0 && uploadQueue.length === 0;
    if (typeof document !== "undefined" && shouldShowEmpty) {
      const shortTitle = aiGreeting || "Growth Through Links";
      document.title = `${shortTitle} | ${pageTitleBase}`;
    }
  }, [messages.length, attachments.length, uploadQueue.length, aiGreeting, pageTitleBase]);

  // Fetch AI-generated three-word greeting once per page load
  useEffect(() => {
    const run = async () => {
      try {
        // Use an in-memory global to keep the greeting stable during SPA navigation
        // but allow a new one after a full reload (globals reset on reload)
        const w = typeof window !== 'undefined' ? (window as any) : undefined;
        // Prefer a single cached object with both greeting and subtitle
        if (w && w.__OMS_HERO__ && typeof w.__OMS_HERO__ === 'object') {
          const cached = w.__OMS_HERO__ as { greeting?: string; subtitle?: string };
          if (cached.greeting) setAiGreeting(cached.greeting);
          if (cached.subtitle) setAiSubtitle(cached.subtitle);
          setIsTitleLoading(false);
          return;
        }

        const response = await fetch('/api/greeting');
        const data = await response.json();
        if (data?.greeting && typeof data.greeting === 'string') {
          setAiGreeting(data.greeting);
          if (typeof data.subtitle === 'string') setAiSubtitle(data.subtitle);
          if (w) {
            // Cache both greeting and subtitle to avoid partial UI on SPA transitions
            w.__OMS_HERO__ = { greeting: data.greeting, subtitle: data.subtitle };
          }
        }
      } catch {
        // keep fallback greeting
      }
      finally {
        setIsTitleLoading(false);
      }
    };
    run();
  }, []);

  // Rotating placeholder for the text area to guide user workflow
  const placeholderSteps = [
    "Understand backlinking",
    "Decide filters",
    "Get data",
    "Make payment",
    "Done",
  ];
  const [placeholderIndex, setPlaceholderIndex] = useState(0);
  const [slideshowOn, setSlideshowOn] = useState(true);
  const slideshowTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    const noContent =
      messages.length === 0 &&
      attachments.length === 0 &&
      uploadQueue.length === 0 &&
      input.length === 0;

    // Once content appears, permanently stop slideshow
    if (!noContent) {
      setSlideshowOn(false);
    }

    // Guard: stop if slideshow disabled or content present
    if (!noContent || !slideshowOn) {
      if (slideshowTimeoutRef.current) {
        clearTimeout(slideshowTimeoutRef.current);
        slideshowTimeoutRef.current = null;
      }
      return;
    }

    // Schedule next step exactly after 2 seconds
    slideshowTimeoutRef.current = setTimeout(() => {
      setPlaceholderIndex((current) => (current + 1) % placeholderSteps.length);
    }, 2000);

    return () => {
      if (slideshowTimeoutRef.current) {
        clearTimeout(slideshowTimeoutRef.current);
        slideshowTimeoutRef.current = null;
      }
    };
  }, [messages.length, attachments.length, uploadQueue.length, input.length, slideshowOn, placeholderSteps.length, placeholderIndex]);
  const rotatingPlaceholder = placeholderSteps[placeholderIndex];

  return (
    <div className="relative w-full flex flex-col gap-4">
      {messages.length === 0 &&
        attachments.length === 0 &&
        uploadQueue.length === 0 && (
          <div className="flex flex-col gap-8 items-center w-full md:px-0 mx-auto md:max-w-[700px]">
            {/* Subtle gradient background accent */}
            <div className="pointer-events-none absolute -z-10 inset-0 flex items-center justify-center">
              <div className="w-[800px] h-[280px] rounded-full blur-3xl opacity-30 dark:opacity-25 bg-gradient-to-b from-violet-500/40 via-violet-500/0 to-transparent" />
            </div>
            {/* Welcome Header */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0 }}
              className="flex flex-col items-center gap-2 text-center"
            >
              <div className="flex items-center gap-4">
                <Logo href="#" size={32} />
                {isTitleLoading ? (
                  <div className="h-[28px] w-[220px] rounded-md bg-zinc-200 dark:bg-zinc-700 animate-pulse" />
                ) : (
                  <h1 className="text-2xl md:text-3xl font-semibold text-foreground">
                    {aiGreeting}
                  </h1>
                )}
              </div>
              {isTitleLoading ? (
                <div className="mt-1 h-[14px] w-[320px] rounded-md bg-zinc-200 dark:bg-zinc-700 animate-pulse" />
              ) : (
                aiSubtitle ? (
                  <p className="text-sm text-muted-foreground max-w-[560px]">{aiSubtitle}</p>
                ) : null
              )}
            </motion.div>

            
          </div>
        )}

      <input
        type="file"
        className="fixed -top-4 -left-4 size-0.5 opacity-0 pointer-events-none"
        ref={fileInputRef}
        multiple
        onChange={handleFileChange}
        tabIndex={-1}
      />

      {(attachments.length > 0 || uploadQueue.length > 0) && (
        <div className="flex flex-row gap-2 overflow-x-scroll">
          {attachments.map((attachment) => (
            <PreviewAttachment key={attachment.url} attachment={attachment} />
          ))}

          {uploadQueue.map((filename) => (
            <PreviewAttachment
              key={filename}
              attachment={{
                url: "",
                name: filename,
                contentType: "",
              }}
              isUploading={true}
            />
          ))}
        </div>
      )}

      <div className={`relative w-full bg-card border border-border rounded-xl shadow-sm focus-within:shadow-md transition-shadow overflow-visible group ${isCreatingChat ? 'animate-pulse' : ''}`} aria-busy={isCreatingChat ? true : undefined}>
        {selectedDocuments.length > 0 && (
          <div className="flex items-center gap-2 px-4 pt-3 pb-1 overflow-x-auto">
            {selectedDocuments.map((docId) => {
              const doc = documents.find((d) => d.id === docId);
              if (!doc) return null;
              return (
                <div key={docId} className="flex items-center gap-2 rounded-full bg-muted text-sm text-foreground pl-2 pr-1 py-1 border border-border shrink-0">
                  <FileText className="size-4 text-muted-foreground" />
                  <span className="max-w-[200px] truncate">{doc.original_name}</span>
                  <button
                    type="button"
                    onClick={() => toggleDocumentSelection(docId)}
                    className="inline-flex items-center justify-center size-5 rounded-full hover:bg-accent text-muted-foreground"
                    aria-label="Remove reference"
                  >
                    <X className="size-3" />
                  </button>
                </div>
              );
            })}
          </div>
        )}
        {isCreatingChat && (
          <div className="pointer-events-none absolute inset-0 z-0">
            <div 
              className="absolute inset-0 opacity-60"
              style={{
                background: 'linear-gradient(135deg, rgba(59,130,246,0.08) 0%, rgba(17,24,39,0.12) 100%)'
              }}
            />
            <div 
              className="absolute inset-0"
              style={{
                background: 'linear-gradient(90deg, transparent 0%, rgba(59,130,246,0.18) 50%, transparent 100%)',
                backgroundSize: '200% 100%',
                animation: 'border-light-border 2s ease-in-out infinite'
              }}
            />
          </div>
        )}

        {/* TEXT AREA + correctly positioned placeholder inside the input area */}
        <div className="relative z-10">
          {isClient && (input.length === 0 && (slideshowOn || messages.length > 0)) && (
            <div className={`pointer-events-none absolute ${messages.length > 0 ? 'top-3' : 'top-4'} left-4 text-sm text-muted-foreground`}>
              <AnimatePresence mode="wait" initial={false}>
                <motion.span
                  key={slideshowOn ? `slide-${placeholderIndex}` : 'follow-up-static'}
                  initial={{ opacity: 0, y: 2 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -2 }}
                  transition={{ duration: 0.25 }}
                >
                  {slideshowOn ? rotatingPlaceholder : 'Add a follow up'}
                </motion.span>
              </AnimatePresence>
            </div>
          )}

          <Textarea
            ref={textareaRef}
            placeholder={""}
            value={input}
            onChange={handleInput}
            className={`w-full min-h-[32px] max-h-[200px] overflow-y-auto resize-none text-sm bg-transparent border-0 focus:ring-0 focus-visible:ring-0 focus-visible:ring-offset-0 px-4 pb-1.5 shadow-none ${messages.length > 0 ? 'pt-3' : 'pt-4'}`}
            rows={2}
            onKeyDown={(event) => {
              // Handle @ key (Shift+2 on US keyboards, or @ key directly)
              if ((event.shiftKey && event.key === "2") || event.key === "@") {
                event.preventDefault();
                setShowDocsHint(true);
                return;
              }
              if (event.key === "Escape") {
                setShowDocsHint(false);
              }
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();

                if (isLoading) {
                  toast.error("Please wait for the model to finish its response!");
                } else {
                  setShowDocsHint(false);
                  submitForm();
                }
              }
            }}
            onBlur={(e) => {
              // Only close if the blur is not caused by clicking inside the modal
              // Use setTimeout to check if the new focus is inside the modal
              setTimeout(() => {
                if (fileDialogOpenRef.current) return; // keep open while file dialog is up
                if (docsHintRef.current && !docsHintRef.current.contains(document.activeElement)) {
                  setShowDocsHint(false);
                }
              }, 200);
            }}
          />
        </div>

        {showDocsHint && (
          <div 
            ref={docsHintRef}
            className="absolute bottom-full mb-2 left-4 z-50 w-80 max-w-[calc(100vw-2rem)]"
            onMouseDown={(e) => e.preventDefault()} // Prevent blur when clicking inside modal
          >
            <div className="rounded-md border bg-popover text-popover-foreground shadow-lg max-h-[400px] overflow-hidden flex flex-col">
              <div className="px-3 py-2 border-b flex items-center justify-between">
                <span className="text-sm font-medium">Select Documents</span>
                <div className="flex items-center gap-2">
                  <input
                    ref={documentUploadInputRef}
                    type="file"
                    accept=".pdf,.doc,.docx,.txt,.csv,.xlsx,.xls"
                    onChange={handleDocumentUpload}
                    className="hidden"
                    disabled={isUploadingDocument}
                  />
                  <button
                    type="button"
                    onMouseDown={(e) => {
                      e.preventDefault(); // Prevent blur
                      e.stopPropagation(); // Stop event bubbling
                      fileDialogOpenRef.current = true;
                    }}
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      fileDialogOpenRef.current = true;
                      documentUploadInputRef.current?.click();
                    }}
                    disabled={isUploadingDocument}
                    className="text-muted-foreground hover:text-foreground disabled:opacity-50"
                    title="Upload document"
                  >
                    {isUploadingDocument ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <Upload className="size-4" />
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setShowDocsHint(false);
                    }}
                    className="text-muted-foreground hover:text-foreground"
                  >
                    <X className="size-4" />
                  </button>
                </div>
              </div>
              
              <div className="overflow-y-auto max-h-[300px]">
                {isLoadingDocs ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="size-5 animate-spin text-muted-foreground" />
                  </div>
                ) : allDocuments.length === 0 ? (
                  <div className="text-center py-8 text-sm text-muted-foreground px-4">
                    No documents available. Upload documents first.
                  </div>
                ) : (
                  <div className="p-2 space-y-1">
                    {allDocuments.map(doc => {
                      const isSelected = selectedDocuments.includes(doc.id);
                      const isCompleted = doc.processing_status === 'completed';
                      const isProcessing = doc.processing_status === 'processing' || doc.processing_status === 'pending';
                      const isFailed = doc.processing_status === 'failed';
                      return (
                        <button
                          key={doc.id}
                          type="button"
                          onClick={() => isCompleted && toggleDocumentSelection(doc.id)}
                          disabled={!isCompleted}
                          className={`w-full flex items-center gap-2 p-2 rounded-md text-left text-sm transition-colors ${
                            !isCompleted 
                              ? 'opacity-50 cursor-not-allowed' 
                              : isSelected 
                                ? 'bg-primary/10 text-primary' 
                                : 'hover:bg-accent'
                          }`}
                        >
                          <span className={`inline-flex items-center justify-center size-4 rounded-full border shrink-0 ${
                            isSelected && isCompleted
                              ? 'bg-primary border-primary text-primary-foreground' 
                              : 'border-muted-foreground'
                          }`}>
                            {isSelected && isCompleted && <CheckCircle className="size-3" />}
                          </span>
                          <FileText className="size-4 shrink-0 text-muted-foreground" />
                          <span className="truncate flex-1">{doc.original_name}</span>
                          {isProcessing && (
                            <span className="text-xs text-muted-foreground shrink-0">Processing...</span>
                          )}
                          {isFailed && (
                            <span className="text-xs text-destructive shrink-0">Failed</span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
              
              {selectedDocuments.length > 0 && (
                <div className="px-3 py-2 border-t text-xs text-muted-foreground">
                  {selectedDocuments.length} document{selectedDocuments.length !== 1 ? 's' : ''} selected
                </div>
              )}
            </div>
          </div>
        )}
        
        {/* Bottom Control Bar */}
        <div className="flex items-center justify-between px-3 py-1.5 border-t border-border/50 bg-card">
          {/* Left hint below divider */}
          <div className="text-[11px] text-muted-foreground/70 select-none">
            @ to add context
          </div>

          {/* Right side - Multimodal input icons */}
          <div className="flex items-center gap-1">
            {isLoading && (
              <button className="p-1.5 text-muted-foreground hover:text-foreground">
                <LoaderIcon size={14} />
              </button>
            )}
            <button className="p-1.5 text-muted-foreground hover:text-foreground">
              <AtIcon size={14} />
            </button>
            <button className="p-1.5 text-muted-foreground hover:text-foreground">
              <GlobeIcon size={14} />
            </button>
            <button 
              className="p-1.5 text-muted-foreground hover:text-foreground"
              onClick={(event) => {
                event.preventDefault();
                fileInputRef.current?.click();
              }}
              disabled={isLoading}
            >
              <ImageIcon size={14} />
            </button>
            {isLoading ? (
              <button
                className="rounded-full p-1.5 h-fit bg-primary hover:bg-primary/90 text-primary-foreground"
                onClick={(event) => {
                  event.preventDefault();
                  stop();
                }}
              >
                <StopIcon size={14} />
              </button>
            ) : (
              <button
                className="rounded-full p-1.5 h-fit bg-primary hover:bg-primary/90 text-primary-foreground"
                onClick={(event) => {
                  event.preventDefault();
                  submitForm();
                }}
                disabled={input.length === 0 || uploadQueue.length > 0}
              >
                <ArrowUpIcon size={14} />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Quick Prompts below the text area */}
      {messages.length === 0 && attachments.length === 0 && uploadQueue.length === 0 && (
        <div className="flex flex-wrap gap-2 justify-center w-full">
          {suggestedActions.map((suggestedAction, index) => (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              transition={{ delay: 0.05 * index }}
              key={index}
              className="relative group"
            >
              <button
                onClick={async () => {
                  append({
                    role: "user",
                    content: suggestedAction.action,
                  });
                }}
                className="border border-border bg-card text-foreground rounded-full px-3 py-1.5 text-xs hover:bg-secondary/50 transition-all duration-200 whitespace-nowrap"
              >
                <span>{suggestedAction.title}</span>
              </button>
              {/* Tooltip */}
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-muted text-muted-foreground text-xs rounded-md opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10">
                {suggestedAction.label}
                <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-muted"></div>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
