"use client";

import { Attachment, ChatRequestOptions, CreateMessage, Message } from "ai";
import { motion } from "framer-motion";
import React, {
  useRef,
  useEffect,
  useState,
  useCallback,
  Dispatch,
  SetStateAction,
  ChangeEvent,
} from "react";
import { toast } from "sonner";

import { ArrowUpIcon, PaperclipIcon, StopIcon, RouteIcon, InvoiceIcon, BoxIcon, FileIcon, HomeIcon, GPSIcon, PencilEditIcon, MessageIcon, CheckCircle, MoreHorizontalIcon } from "./icons";
import { PreviewAttachment } from "./preview-attachment";
import useWindowSize from "./use-window-size";
import { Button } from "../ui/button";
import { Textarea } from "../ui/textarea";

const suggestedActions = [
  {
    title: "Browse Publishers",
    label: "Find high-quality backlink opportunities",
    action: "Browse publishers for backlink opportunities with no filters",
    icon: <RouteIcon size={16} />,
  },
  {
    title: "View My Orders",
    label: "Check order status and history",
    action: "Show me my orders",
    icon: <InvoiceIcon size={16} />,
  },
  {
    title: "View Cart",
    label: "See items ready to checkout",
    action: "Show my cart",
    icon: <BoxIcon size={16} />,
  },
  {
    title: "Backlink Data with Filters",
    label: "Filter publishers by DR, DA, and price",
    action: "Show backlink publishers with filters for DR, DA, and price",
    icon: <FileIcon size={16} />,
  },
  {
    title: "Top DR Publishers",
    label: "Discover publishers with DR 60+",
    action: "Browse publishers with Domain Rating above 60",
    icon: <GPSIcon size={16} />,
  },
  {
    title: "Budget Picks",
    label: "Under $100 per placement",
    action: "Show publishers under $100 per placement",
    icon: <HomeIcon size={16} />,
  },
  {
    title: "Saved Filters",
    label: "Reuse my last search setup",
    action: "Load my saved publisher filters",
    icon: <MoreHorizontalIcon size={16} />,
  },
  {
    title: "Manage Plan",
    label: "Upgrade or change plan",
    action: "Open plan management",
    icon: <PencilEditIcon size={16} />,
  },
  {
    title: "Support",
    label: "Ask a question about orders or billing",
    action: "Connect me to support for orders or billing",
    icon: <MessageIcon size={16} />,
  },
  {
    title: "Completed Orders",
    label: "Show my fulfilled orders",
    action: "Show my completed orders",
    icon: <CheckCircle size={16} />,
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
      // Cap the textarea height to prevent giant pastes from expanding the layout
      const maxHeightPx = 200; // lock around 200px
      const el = textareaRef.current;
      el.style.height = "auto";
      const desired = Math.min(el.scrollHeight, maxHeightPx);
      el.style.height = `${desired}px`;
      el.style.overflowY = el.scrollHeight > maxHeightPx ? "auto" : "hidden";
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

  return (
    <div className="relative w-full flex flex-col gap-4">
      {messages.length === 0 &&
        attachments.length === 0 &&
        uploadQueue.length === 0 && (
          <div className="flex flex-row flex-wrap items-center gap-2 md:gap-3 w-full px-4 md:px-0 mx-auto max-w-6xl">
            {suggestedActions.map((suggestedAction, index) => (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 20 }}
                transition={{ delay: 0.05 * index }}
                key={index}
                className="group relative"
              >
                <button
                  onClick={async () => {
                    append({
                      role: "user",
                      content: suggestedAction.action,
                    });
                  }}
                  className="relative inline-flex items-center gap-2 rounded-full px-3 py-1.5 md:px-3.5 md:py-1.5 text-sm border border-border bg-card hover:bg-secondary/30 transition-colors shadow-sm focus:outline-none focus:ring-1 focus:ring-border"
                >
                  <span className="text-muted-foreground">{suggestedAction.icon}</span>
                  <span className="font-medium text-foreground whitespace-nowrap">{suggestedAction.title}</span>
                </button>
                {/* Hover description tooltip centered above */}
                <div className="pointer-events-none absolute left-1/2 -translate-x-1/2 -top-2 -translate-y-full hidden group-hover:block z-20">
                  <div className="rounded-md border border-border bg-card text-foreground shadow-lg px-3 py-2 text-xs md:text-sm max-w-sm text-center whitespace-normal">
                    {suggestedAction.label}
                  </div>
                </div>
              </motion.div>
            ))}
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

      <Textarea
        ref={textareaRef}
        placeholder="Send a message..."
        value={input}
        onChange={handleInput}
        className="min-h-[24px] max-h-[200px] overflow-y-auto resize-none rounded-xl text-base bg-card border border-border shadow-sm focus:shadow-md transition-shadow w-full md:max-w-[650px]"
        rows={3}
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

      {isLoading ? (
        <Button
          className="rounded-full p-1.5 h-fit absolute bottom-2 right-2 m-0.5 bg-primary hover:bg-primary/90 text-primary-foreground"
          onClick={(event) => {
            event.preventDefault();
            stop();
          }}
        >
          <StopIcon size={14} />
        </Button>
      ) : (
        <Button
          className="rounded-full p-1.5 h-fit absolute bottom-2 right-2 m-0.5 bg-primary hover:bg-primary/90 text-primary-foreground"
          onClick={(event) => {
            event.preventDefault();
            submitForm();
          }}
          disabled={input.length === 0 || uploadQueue.length > 0}
        >
          <ArrowUpIcon size={14} />
        </Button>
      )}

      <Button
        className="rounded-full p-1.5 h-fit absolute bottom-2 right-10 m-0.5 border-border"
        onClick={(event) => {
          event.preventDefault();
          fileInputRef.current?.click();
        }}
        variant="outline"
        disabled={isLoading}
      >
        <PaperclipIcon size={14} />
      </Button>
    </div>
  );
}
