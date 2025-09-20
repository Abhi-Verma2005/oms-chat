"use client";

import { Attachment, Message } from "ai";
import { useChat } from "ai/react";
import { GripVertical } from "lucide-react";
import { useState, useRef, useEffect } from "react";

import { LeftSidebar } from "./left-sidebar";
import { Message as PreviewMessage } from "./message";
import { MultimodalInput } from "./multimodal-input";
import { Overview } from "./overview";
import { RightPanel } from "./RightPanel";
import { useScrollToBottom } from "./use-scroll-to-bottom";
import { useSplitScreen } from "../../contexts/SplitScreenProvider";

export function Chat({
  id,
  initialMessages,
  user,
}: {
  id: string;
  initialMessages: Array<Message>;
  user?: any;
}) {
  const { messages, handleSubmit, input, setInput, append, isLoading, stop } =
    useChat({
      id,
      body: { id },
      initialMessages,
      maxSteps: 10,
      onFinish: () => {
        window.history.replaceState({}, "", `/chat/${id}`);
      },
    });

  const [messagesContainerRef, messagesEndRef] =
    useScrollToBottom<HTMLDivElement>(!isLoading);

  const [attachments, setAttachments] = useState<Array<Attachment>>([]);
  const { isRightPanelOpen, rightPanelWidth, setRightPanelWidth } = useSplitScreen();
  const [isResizing, setIsResizing] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Handle mouse move for resizing
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing || !containerRef.current) return;

      const containerRect = containerRef.current.getBoundingClientRect();
      const newRightPanelWidth = containerRect.right - e.clientX;
      
      // Constrain width between 300px and 60% of screen width
      const maxWidth = window.innerWidth * 0.6;
      const constrainedWidth = Math.max(300, Math.min(newRightPanelWidth, maxWidth));
      setRightPanelWidth(constrainedWidth);
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [isResizing, setRightPanelWidth]);

  // Handle mouse down on resize handle
  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
  };

  return (
    <div 
      ref={containerRef}
      className="flex flex-row h-dvh bg-background"
    >
      {/* Left Sidebar */}
      <LeftSidebar user={user} />

      {/* Main Chat Area */}
      <div 
        className={`flex flex-col justify-center pb-4 md:pb-8 transition-all duration-300 flex-1 ${
          isRightPanelOpen ? 'mr-0' : ''
        }`}
        style={{
          minWidth: isRightPanelOpen ? '300px' : '100%',
          maxWidth: isRightPanelOpen ? `calc(100% - ${rightPanelWidth}px)` : '100%'
        }}
      >
        <div className="flex flex-col justify-between items-center gap-4 h-full">
          <div
            ref={messagesContainerRef}
            className="flex flex-col gap-4 size-full items-center overflow-y-auto px-4 md:px-0"
          >
            {messages.length === 0 && <Overview />}

            {messages.map((message) => (
              <PreviewMessage
                key={message.id}
                chatId={id}
                role={message.role}
                content={message.content}
                attachments={message.experimental_attachments}
                toolInvocations={message.toolInvocations}
              />
            ))}

            <div
              ref={messagesEndRef}
              className="shrink-0 min-w-[24px] min-h-[24px]"
            />
          </div>

          <form className="flex flex-row gap-2 relative items-end w-full md:max-w-[500px] max-w-[calc(100dvw-32px)] px-4 md:px-0">
            <MultimodalInput
              input={input}
              setInput={setInput}
              handleSubmit={handleSubmit}
              isLoading={isLoading}
              stop={stop}
              attachments={attachments}
              setAttachments={setAttachments}
              messages={messages}
              append={append}
            />
          </form>
        </div>
      </div>

      {/* Resize Handle - only show when right panel is open */}
      {isRightPanelOpen && (
        <div
          className="w-1 bg-border hover:bg-blue-500/50 cursor-col-resize transition-colors relative z-10"
          onMouseDown={handleMouseDown}
        >
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
            <GripVertical className="size-4 text-muted-foreground" />
          </div>
        </div>
      )}

      {/* Right Panel */}
      <RightPanel />
    </div>
  );
}
