"use client";

import { Attachment, ChatRequestOptions, CreateMessage, Message } from "ai";
import { motion } from "framer-motion";
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

import { ArrowUpIcon, PaperclipIcon, StopIcon, ChevronDownIcon, InfinityIcon, MicrophoneIcon, GlobeIcon, ImageIcon, AtIcon, LoaderIcon, PlusIcon } from "./icons";
import Logo from "./logo";
import { PreviewAttachment } from "./preview-attachment";
import useWindowSize from "./use-window-size";
import { Button } from "../ui/button";
import { Textarea } from "../ui/textarea";

// Time-based greeting generator
const getTimeBasedGreeting = () => {
  const hour = new Date().getHours();
  
  if (hour >= 5 && hour < 12) {
    return {
      emoji: "☕",
      greeting: "Good morning!",
      subtitle: "Coffee and OMS time?",
    };
  } else if (hour >= 12 && hour < 17) {
    return {
      emoji: "🌤️",
      greeting: "Good afternoon!",
      subtitle: "Ready to discover?",
    };
  } else if (hour >= 17 && hour < 21) {
    return {
      emoji: "🌆",
      greeting: "Good evening!",
      subtitle: "Let's get things done",
    };
  } else {
    return {
      emoji: "🌙",
      greeting: "Good night!",
      subtitle: "Working late? OMS is here",
    };
  }
};

const suggestedActions = [
  {
    title: "Browse Publishers",
    label: "Find high-quality backlink opportunities",
    action: "Browse publishers for backlink opportunities with no filters",
  },
  {
    title: "View My Orders",
    label: "Check order status and history",
    action: "Show me my orders",
  },
  {
    title: "Help me book a flight",
    label: "from San Francisco to London",
    action: "Help me book a flight from San Francisco to London",
  },
  {
    title: "What is the status",
    label: "of flight BA142 flying tmrw?",
    action: "What is the status of flight BA142 flying tmrw?",
  },
];

export function MultimodalInput({
  input,
  setInput,
  isLoading,
  stop,
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

  const greeting = getTimeBasedGreeting();

  return (
    <div className="relative w-full flex flex-col gap-4">
      {messages.length === 0 &&
        attachments.length === 0 &&
        uploadQueue.length === 0 && (
          <div className="flex flex-col gap-8 items-center w-full md:px-0 mx-auto md:max-w-[600px]">
            {/* Welcome Header */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0 }}
              className="flex flex-col items-center gap-2 text-center"
            >
              <div className="flex items-center gap-4">
                <Logo href="#" size={32} />
                <h1 className="text-2xl md:text-3xl font-semibold text-foreground">
                  {greeting.greeting}
                </h1>
              </div>
            </motion.div>

            {/* Quick Prompts */}
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

      <div className="relative w-full bg-card border border-border rounded-xl shadow-sm focus-within:shadow-md transition-shadow overflow-hidden group">
        {/* Top section with Context button */}
        {messages.length > 0 && (
          <div className="flex items-start pt-3 px-3 pb-2">
            <button className="flex items-center gap-1.5 px-3 py-1.5 bg-secondary rounded-lg text-xs text-muted-foreground hover:bg-secondary/80 transition-colors border border-border">
              <PlusIcon size={16} />
              <span>Add Context</span>
            </button>
          </div>
        )}

        {/* TEXT AREA - Only the text input, full width */}
        <Textarea
          ref={textareaRef}
          placeholder="Plan, @ for context, / for commands"
          value={input}
          onChange={handleInput}
          className={`w-full min-h-[40px] max-h-[200px] overflow-y-auto resize-none text-sm bg-transparent border-0 focus:ring-0 focus-visible:ring-0 focus-visible:ring-offset-0 px-4 pb-2 shadow-none ${messages.length > 0 ? 'pt-1' : 'pt-3'}`}
          rows={2}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();

              if (isLoading) {
                toast.error("Please wait for the model to finish its response!");
              } else {
                submitForm();
              }
            }
          }}
        />
        
        {/* Bottom Control Bar */}
        <div className="flex items-center justify-between px-3 py-2.5 border-t border-border/50 bg-card">
          {/* Left side - Agent and Model selectors */}
          <div className="flex items-center gap-2">
            <button className="flex items-center gap-1.5 px-2.5 py-1 bg-secondary rounded-full text-sm hover:bg-secondary/80 transition-colors">
              <InfinityIcon size={14} />
              <span>Agent</span>
              <ChevronDownIcon size={12} />
            </button>
            <button className="flex items-center gap-1.5 px-2.5 py-1 text-sm hover:bg-secondary rounded-full transition-colors">
              <span>Sonnet 4.5</span>
              <ChevronDownIcon size={12} />
            </button>
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
    </div>
  );
}
