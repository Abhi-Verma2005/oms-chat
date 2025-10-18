"use client";

import { Attachment, Message } from "ai";
import { useChat } from "ai/react";
import { GripVertical } from "lucide-react";
import { useState, useRef, useEffect, useCallback } from "react";

import { LeftSidebar } from "./left-sidebar";
import { Message as PreviewMessage } from "./message";
import { MultimodalInput } from "./multimodal-input";
import { Overview } from "./overview";
import { RightPanel } from "./RightPanel";
import { useScrollToBottom } from "./use-scroll-to-bottom";
import { useCart } from "../../contexts/cart-context";
import { useSplitScreen } from "../../contexts/SplitScreenProvider";
import { useUserInfo } from "../../contexts/UserInfoProvider";

export function Chat({
  id,
  initialMessages,
  user,
}: {
  id: string;
  initialMessages: Array<Message>;
  user?: any;
}) {
  const { userInfo } = useUserInfo();
  const { state: cartState } = useCart();
  
  const { messages, handleSubmit, input, setInput, append, isLoading, stop, reload } =
    useChat({
      id,
      body: { 
        id,
        userInfo: userInfo ? {
          id: userInfo.id,
          email: userInfo.email,
          name: userInfo.name,
          preferences: userInfo.preferences,
          chatHistory: userInfo.chatHistory,
        } : null,
        cartState: cartState.items.length > 0 ? cartState.items : undefined
      },
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
  const [isLeftSidebarCollapsed, setIsLeftSidebarCollapsed] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);

  // Handle mouse move for resizing
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing || !containerRef.current) return;

      const containerRect = containerRef.current.getBoundingClientRect();
      const newRightPanelWidth = containerRect.right - e.clientX;
      
      // Constrain width between 300px and 70% of screen width
      // On mobile, limit to 50% to ensure chat area remains usable
      const isMobile = window.innerWidth < 768;
      const maxWidthPercent = isMobile ? 0.5 : 0.7;
      const maxWidth = window.innerWidth * maxWidthPercent;
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

  // Handle window resize to ensure proper layout
  useEffect(() => {
    const handleResize = () => {
      // Force a re-render to recalculate widths
      if (isRightPanelOpen) {
        const isMobile = window.innerWidth < 768;
        const maxWidthPercent = isMobile ? 0.5 : 0.7;
        const maxWidth = window.innerWidth * maxWidthPercent;
        if (rightPanelWidth > maxWidth) {
          setRightPanelWidth(maxWidth);
        }
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [isRightPanelOpen, rightPanelWidth, setRightPanelWidth]);

  // Handle mouse down on resize handle
  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
  };

  // Regenerate function
  const handleRegenerate = useCallback(() => {
    reload();
  }, [reload]);

  return (
    <div 
      ref={containerRef}
      className="flex flex-row h-dvh bg-background relative"
    >
      {/* Left Sidebar - Always overlay */}
      <div className="absolute left-0 top-0 z-20">
        <LeftSidebar 
          user={user} 
          onCollapseChange={setIsLeftSidebarCollapsed}
        />
      </div>

      {/* Backdrop for sidebar when expanded */}
      {!isLeftSidebarCollapsed && (
        <div 
          className="fixed inset-0 bg-black/20 backdrop-blur-sm z-10"
          onClick={() => {
            setIsLeftSidebarCollapsed(true);
          }}
        />
      )}

      <div 
        className={`flex flex-col justify-center pb-4 md:pb-8 transition-all duration-300 ${
          isRightPanelOpen ? 'mr-0' : ''
        }`}
        style={{
          // Calculate available width based on both sidebars
          width: isRightPanelOpen 
            ? `calc(100vw - ${rightPanelWidth}px - ${isLeftSidebarCollapsed ? '64px' : '256px'})`
            : `calc(100vw - ${isLeftSidebarCollapsed ? '64px' : '256px'})`,
          minWidth: isRightPanelOpen ? '300px' : '400px',
          marginLeft: isLeftSidebarCollapsed ? '64px' : '256px',
          // Ensure we don't go negative
          maxWidth: 'calc(100vw - 64px)'
        }}
      >
        <div 
          className="flex flex-col justify-between items-center gap-4 h-full"
        >
          <div
            ref={messagesContainerRef}
            className="flex flex-col gap-4 w-full items-center overflow-y-auto px-4 md:px-0"
          >
            {messages.length === 0 && <Overview />}

            {(() => {
              // Determine the last user message index
              let lastUserIndex = -1;
              for (let i = messages.length - 1; i >= 0; i--) {
                if (messages[i].role === 'user') {
                  lastUserIndex = i;
                  break;
                }
              }

              return messages.map((message, index) => (
              <PreviewMessage
                key={message.id}
                chatId={id}
                role={message.role}
                content={message.content}
                attachments={message.experimental_attachments}
                toolInvocations={message.toolInvocations}
                onRegenerate={handleRegenerate}
                isLastMessage={index === messages.length - 1}
                isGenerating={isLoading && index === messages.length - 1}
                onAppendMessage={append}
                isActiveForFilters={message.role === 'assistant' && index > lastUserIndex}
              />
              ));
            })()}

            <div
              ref={messagesEndRef}
              className="shrink-0 min-w-[24px] min-h-[24px]"
            />
          </div>

          <form className="flex flex-row gap-2 relative items-end w-full md:max-w-[650px] px-4 md:px-0">
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
