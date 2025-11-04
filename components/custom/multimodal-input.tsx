"use client";

import { Attachment, ChatRequestOptions, CreateMessage, Message } from "ai";
import { motion, AnimatePresence } from "framer-motion";
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
}) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { width } = useWindowSize();
  const [pageTitleBase] = useState<string>("OMS Chat Assistant");
  const [showDocsHint, setShowDocsHint] = useState(false);

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
        if (w && typeof w.__OMS_GREETING__ === 'string' && w.__OMS_GREETING__) {
          setAiGreeting(w.__OMS_GREETING__);
          setIsTitleLoading(false);
          return;
        }

        const response = await fetch('/api/greeting');
        const data = await response.json();
        if (data?.greeting && typeof data.greeting === 'string') {
          setAiGreeting(data.greeting);
          if (typeof data.subtitle === 'string') setAiSubtitle(data.subtitle);
          if (w) w.__OMS_GREETING__ = data.greeting;
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

      <div className={`relative w-full bg-card border border-border rounded-xl shadow-sm focus-within:shadow-md transition-shadow overflow-hidden group ${isCreatingChat ? 'animate-pulse' : ''}`} aria-busy={isCreatingChat ? true : undefined}>
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
              if (event.key === "@") {
                setShowDocsHint(true);
                return; // allow character input but show the hint
              }
              if (event.key === "Escape" || event.key === "Enter") {
                setShowDocsHint(false);
              }
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();

                if (isLoading) {
                  toast.error("Please wait for the model to finish its response!");
                } else {
                  submitForm();
                }
              }
            }}
            onBlur={() => setShowDocsHint(false)}
          />
        </div>

        {showDocsHint && (
          <div className={`absolute ${messages.length > 0 ? 'top-2.5' : 'top-3'} left-4 z-40`}> 
            <div className="rounded-md border bg-popover text-popover-foreground shadow-md">
              <div className="px-3 py-2 text-sm whitespace-nowrap">Docs</div>
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
