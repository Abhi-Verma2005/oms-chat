"use client";

import { Attachment, Message } from "ai";
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
import { useWebSocket, MessageType, ChatMessage } from "../../contexts/websocket-context";

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
  const { sendMessage, joinChat, leaveChat, onEvent, state: wsState } = useWebSocket();
  
  // Convert initialMessages to internal format and manage state
  const [messages, setMessages] = useState<Array<Message>>(initialMessages || []);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [streamingContent, setStreamingContent] = useState<{ [messageId: string]: string }>({});
  const [loadingTools, setLoadingTools] = useState<Set<string>>(new Set());
  const currentAssistantMessageIdRef = useRef<string | null>(null);
  const stopRequestedRef = useRef(false);
  const lastUserMessageRef = useRef<string | null>(null);

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

  // Join chat on mount
  useEffect(() => {
    if (wsState === "connected") {
      joinChat(id);
    }
    return () => {
      leaveChat(id);
    };
  }, [id, wsState, joinChat, leaveChat]);

  // Handle WebSocket events
  useEffect(() => {
    // Handle text streaming
    const unsubscribeTextStream = onEvent(MessageType.TextStream, (payload: unknown) => {
      const data = payload as { text: string; isComplete?: boolean };
      console.log("[Chat] TextStream received:", data.text?.substring(0, 50), "currentMessageId:", currentAssistantMessageIdRef.current);
      if (data.text) {
        setIsLoading(true);
        const messageId = currentAssistantMessageIdRef.current || `stream_${Date.now()}`;
        if (!currentAssistantMessageIdRef.current) {
          currentAssistantMessageIdRef.current = messageId;
          console.log("[Chat] Created new messageId:", messageId);
        }
        
        setStreamingContent((prev) => ({
          ...prev,
          [messageId]: (prev[messageId] || "") + data.text,
        }));
      }
    });

    // Handle text stream end
    const unsubscribeTextStreamEnd = onEvent(MessageType.TextStreamEnd, (payload: unknown) => {
      const data = payload as { text?: string };
      console.log("[Chat] TextStreamEnd received, messageId:", currentAssistantMessageIdRef.current);
      setIsLoading(false);
      if (currentAssistantMessageIdRef.current) {
        const messageId = currentAssistantMessageIdRef.current;
        const content = data.text || streamingContent[messageId] || "";
        console.log("[Chat] Creating/updating assistant message with content length:", content.length);
        
        setMessages((prev) => {
          // Check if assistant message already exists
          const existingIndex = prev.findIndex(
            (m) => m.id === messageId && m.role === "assistant"
          );
          
          if (existingIndex >= 0) {
            // Update existing message
            const updated = [...prev];
            updated[existingIndex] = {
              ...updated[existingIndex],
              content,
            };
            console.log("[Chat] Updated existing message at index:", existingIndex);
            return updated;
          } else {
            // Add new assistant message
            console.log("[Chat] Creating new assistant message with id:", messageId);
            return [
              ...prev,
              {
                id: messageId,
                role: "assistant",
                content,
              },
            ];
          }
        });
        
        // Clear streaming content
        setStreamingContent((prev) => {
          const updated = { ...prev };
          delete updated[messageId];
          return updated;
        });
        
        currentAssistantMessageIdRef.current = null;
      }
    });

    // Handle message received confirmation
    const unsubscribeMessageReceived = onEvent(MessageType.MessageReceived, (payload: unknown) => {
      const data = payload as { room_id: string; payload: ChatMessage };
      if (data.payload) {
        const userMsg: ChatMessage = data.payload;
        if (userMsg.role === "user") {
          setIsLoading(true);
          // Note: lastUserMessageRef is already set in handleSubmit before sending
        }
      }
    });

    // Handle function call start (show loader)
    const unsubscribeFunctionCallStart = onEvent(MessageType.FunctionCallStart, (payload: unknown) => {
      const data = payload as { name: string };
      console.log("[Chat] Function call start:", data.name);
      setLoadingTools((prev) => new Set(prev).add(data.name));
    });

    // Handle function call end (keep loader until result arrives)
    // Note: We don't remove from loadingTools here because we want the loader
    // to stay visible until the FunctionResult event arrives
    const unsubscribeFunctionCallEnd = onEvent(MessageType.FunctionCallEnd, (payload: unknown) => {
      const data = payload as { name: string };
      console.log("[Chat] Function call end:", data.name, "- keeping loader until result arrives");
      // Don't remove from loadingTools yet - wait for FunctionResult
    });

    // Handle function calls
    const unsubscribeFunctionCall = onEvent(MessageType.FunctionCall, (payload: unknown) => {
      const data = payload as {
        name: string;
        args: Record<string, unknown>;
        requestId?: string;
        role?: string;
      };
      console.log("[Chat] Function call:", data.name, data.args);
      
      // Add function call as a tool invocation in the last assistant message
      setMessages((prev) => {
        const updated = [...prev];
        // Find the last assistant message or create one
        let lastAssistantIndex = updated.length - 1;
        while (lastAssistantIndex >= 0 && updated[lastAssistantIndex].role !== "assistant") {
          lastAssistantIndex--;
        }
        console.log("[Chat] Function call - found last assistant at index:", lastAssistantIndex, "total messages:", updated.length);
        
        if (lastAssistantIndex >= 0) {
          // Add tool invocation to existing assistant message
          const message = updated[lastAssistantIndex];
          
          // Check if this assistant message was created BEFORE the last user message
          // This prevents adding tool calls to old messages
          const messageIndex = updated.findIndex(m => m.id === message.id);
          const lastUserIndex = lastUserMessageRef.current 
            ? updated.findIndex(m => m.id === lastUserMessageRef.current)
            : -1;
          
          // Only add to assistant message if it comes AFTER the last user message
          if (lastUserIndex === -1 || messageIndex > lastUserIndex) {
            console.log("[Chat] Adding to existing message:", message.id, "content length:", message.content?.length);
            if (!message.toolInvocations) {
              message.toolInvocations = [];
            }
            
            // Check if a tool invocation with this name already exists in "call" state
            const existingCall = message.toolInvocations.find(
              (inv) => inv.toolName === data.name && inv.state === "call"
            );
            
            if (!existingCall) {
              // Only add if we don't already have a "call" state invocation for this tool
              message.toolInvocations.push({
                toolCallId: `call_${Date.now()}`,
                toolName: data.name,
                args: data.args,
                state: "call",
              });
            } else {
              console.log("[Chat] Tool invocation already exists in call state, skipping duplicate");
            }
          } else {
            console.log("[Chat] Last assistant message is older than last user message, creating new assistant message");
            // Create a new assistant message instead
            updated.push({
              id: `assistant_${Date.now()}`,
              role: "assistant",
              content: "",
              toolInvocations: [{
                toolCallId: `call_${Date.now()}`,
                toolName: data.name,
                args: data.args,
                state: "call",
              }],
            });
          }
        } else {
          // Create a new assistant message with tool invocation
          console.log("[Chat] Creating new assistant message for function call");
          updated.push({
            id: `assistant_${Date.now()}`,
            role: "assistant",
            content: "",
            toolInvocations: [{
              toolCallId: `call_${Date.now()}`,
              toolName: data.name,
              args: data.args,
              state: "call",
            }],
          });
        }
        return updated;
      });
    });

    // Handle function results
    const unsubscribeFunctionResult = onEvent(MessageType.FunctionResult, (payload: unknown) => {
      const data = payload as { name: string; result: unknown; role?: string };
      console.log("[Chat] Function result:", data.name, data.result);
      
      // Skip browsePublishers - it's handled by PublishersData event
      if (data.name === "browsePublishers") {
        console.log("[Chat] Skipping FunctionResult for browsePublishers - handled by PublishersData");
        return;
      }
      
      // Remove from loadingTools now that we have the result
      setLoadingTools((prev) => {
        const updated = new Set(prev);
        updated.delete(data.name);
        return updated;
      });
      
      // Update ALL tool invocations with this name to result state (in case there are duplicates)
      setMessages((prev) => {
        const updated = [...prev];
        // Find all messages with tool invocations matching this function name
        for (let i = updated.length - 1; i >= 0; i--) {
          const message = updated[i];
          if (message.toolInvocations && message.toolInvocations.length > 0) {
            // Find ALL matching tool invocations in "call" state
            const toolIndices = message.toolInvocations
              .map((inv, idx) => inv.toolName === data.name && inv.state === "call" ? idx : -1)
              .filter(idx => idx !== -1);
            
            if (toolIndices.length > 0) {
              const newToolInvocations = [...message.toolInvocations];
              // Update all "call" state invocations to "result"
              toolIndices.forEach((idx) => {
                newToolInvocations[idx] = {
                  ...newToolInvocations[idx],
                  state: "result",
                  result: data.result,
                };
              });
              updated[i] = {
                ...updated[i],
                toolInvocations: newToolInvocations,
              };
            }
          }
        }
        return updated;
      });
    });

    // Handle publishers data
    const unsubscribePublishersData = onEvent(MessageType.PublishersData, (payload: unknown) => {
      const data = payload as { publishers: unknown[]; totalCount: number; filters?: unknown };
      console.log("[Chat] Publishers data received:", data, "totalCount:", data.totalCount, "publishers:", data.publishers);
      
      // Safety check
      if (!data.publishers || !Array.isArray(data.publishers)) {
        console.error("[Chat] Invalid publishers data received:", data);
        return;
      }
      
      // Transform backend format to frontend format (with metadata)
      const transformedData = (() => {
        const publishers = (data.publishers || []) as Array<{
          authority?: { dr?: number; da?: number };
          pricing?: { base?: number; withContent?: number };
          niche?: string[];
        }>;
        
        // Calculate metadata from publishers
        const totalCount = data.totalCount || publishers.length;
        const drValues = publishers
          .map(p => p.authority?.dr)
          .filter((dr): dr is number => typeof dr === 'number');
        const daValues = publishers
          .map(p => p.authority?.da)
          .filter((da): da is number => typeof da === 'number');
        const prices = publishers
          .flatMap(p => [p.pricing?.base, p.pricing?.withContent])
          .filter((price): price is number => typeof price === 'number');
        
        const averageDR = drValues.length > 0
          ? Math.round(drValues.reduce((sum, dr) => sum + dr, 0) / drValues.length)
          : 0;
        const averageDA = daValues.length > 0
          ? Math.round(daValues.reduce((sum, da) => sum + da, 0) / daValues.length)
          : 0;
        const priceRange = prices.length > 0
          ? { min: Math.min(...prices), max: Math.max(...prices) }
          : { min: 0, max: 0 };
        
        // Get top niches
        const nicheCounts = new Map<string, number>();
        publishers.forEach(p => {
          p.niche?.forEach(niche => {
            nicheCounts.set(niche, (nicheCounts.get(niche) || 0) + 1);
          });
        });
        const topNiches = Array.from(nicheCounts.entries())
          .sort((a, b) => b[1] - a[1])
          .slice(0, 3)
          .map(([niche]) => niche);
        
        return {
          publishers: data.publishers,
          metadata: {
            totalCount,
            averageDR,
            averageDA,
            priceRange,
            topNiches,
            summary: `Found ${totalCount} publishers matching your criteria`,
          },
          filters: data.filters || {},
        };
      })();
      
      // Remove browsePublishers from loadingTools since we have the data
      setLoadingTools((prev) => {
        const updated = new Set(prev);
        updated.delete("browsePublishers");
        return updated;
      });
      
      // Update ALL browsePublishers tool invocations to result state
      setMessages((prev) => {
        const updated = [...prev];
        // Find all messages with tool invocations (browsePublishers)
        for (let i = updated.length - 1; i >= 0; i--) {
          const message = updated[i];
          if (message.toolInvocations && message.toolInvocations.length > 0) {
            // Find ALL browsePublishers tool invocations (in case there are duplicates)
            const browseToolIndices = message.toolInvocations
              .map((inv, idx) => inv.toolName === "browsePublishers" && inv.state === "call" ? idx : -1)
              .filter(idx => idx !== -1);
            
            if (browseToolIndices.length > 0) {
              const newToolInvocations = [...(message.toolInvocations || [])];
              // Update all "call" state browsePublishers invocations to "result"
              browseToolIndices.forEach((idx) => {
                newToolInvocations[idx] = {
                  ...newToolInvocations[idx],
                  state: "result",
                  result: transformedData,
                };
              });
              updated[i] = {
                ...updated[i],
                toolInvocations: newToolInvocations,
              };
            }
          }
        }
        return updated;
      });
    });

    // Handle errors
    const unsubscribeError = onEvent(MessageType.Error, (payload: unknown) => {
      const data = payload as { error: string };
      console.error("[Chat] WebSocket error:", data.error);
      setIsLoading(false);
    });

    return () => {
      unsubscribeTextStream();
      unsubscribeTextStreamEnd();
      unsubscribeMessageReceived();
      unsubscribeFunctionCallStart();
      unsubscribeFunctionCallEnd();
      unsubscribeFunctionCall();
      unsubscribeFunctionResult();
      unsubscribePublishersData();
      unsubscribeError();
    };
  }, [onEvent, streamingContent]);

  // Update messages when streaming content changes
  useEffect(() => {
    Object.entries(streamingContent).forEach(([messageId, content]) => {
      if (content) {
        setMessages((prev) => {
          const existingIndex = prev.findIndex(
            (m) => m.id === messageId && m.role === "assistant"
          );
          
          if (existingIndex >= 0) {
            const updated = [...prev];
            updated[existingIndex] = {
              ...updated[existingIndex],
              content,
            };
            return updated;
          } else {
            return [
              ...prev,
              {
                id: messageId,
                role: "assistant",
                content,
              },
            ];
          }
        });
      }
    });
  }, [streamingContent]);

  // Handle form submission
  const handleSubmit = useCallback(async (event?: { preventDefault?: () => void }) => {
    if (event?.preventDefault) {
      event.preventDefault();
    }
    
    if (!input.trim() || isLoading || wsState !== "connected") {
      return;
    }

    const userMessage: ChatMessage = {
      role: "user",
      content: input.trim(),
    };

    // Add user message to state
    const userMsgId = `user_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
    lastUserMessageRef.current = userMsgId;
    setMessages((prev) => [
      ...prev,
      {
        id: userMsgId,
        role: "user",
        content: userMessage.content,
      },
    ]);

    // Scroll to top immediately after adding user message
    setTimeout(() => {
      if (messagesContainerRef.current) {
        messagesContainerRef.current.scrollTop = 0;
      }
    }, 0);

    // Send message via WebSocket
    sendMessage({
      chat_id: id,
      message: {
        room_id: id,
        payload: userMessage,
      },
    });

    setInput("");
    setIsLoading(true);
    stopRequestedRef.current = false;
  }, [input, isLoading, wsState, id, sendMessage, messagesContainerRef]);

  // Stop generation
  const stop = useCallback(() => {
    stopRequestedRef.current = true;
    setIsLoading(false);
  }, []);

  // Append message (for compatibility)
  const append = useCallback(async (message: Partial<Message>): Promise<string | null | undefined> => {
    const newMessage: Message = {
      id: message.id || `msg_${Date.now()}`,
      role: message.role || "user",
      content: message.content || "",
      ...message,
    };
    
    setMessages((prev) => [...prev, newMessage]);
    
    // Scroll to top after adding message
    setTimeout(() => {
      if (messagesContainerRef.current) {
        messagesContainerRef.current.scrollTop = 0;
      }
    }, 0);
    
    // If it's a user message and WebSocket is connected, send it via WebSocket
    if (newMessage.role === "user" && wsState === "connected" && newMessage.content) {
      sendMessage({
        chat_id: id,
        message: {
          room_id: id,
          payload: {
            role: "user",
            content: newMessage.content,
          },
        },
      });
      setIsLoading(true);
      stopRequestedRef.current = false;
    }
    
    return newMessage.id;
  }, [wsState, id, sendMessage, messagesContainerRef]);

  // Regenerate function (placeholder - would need backend support)
  const handleRegenerate = useCallback(() => {
    // TODO: Implement regeneration via WebSocket
    console.log("Regenerate not yet implemented");
  }, []);

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
        className={`flex flex-col justify-center pb-4 md:pb-8 transition-all duration-300 w-full ${
          isRightPanelOpen ? 'mr-0' : ''
        }`}
        style={{
          minWidth: isRightPanelOpen ? '300px' : '100%',
          maxWidth: isRightPanelOpen ? `calc(100% - ${rightPanelWidth}px)` : '100%'
        }}
      >
        <div 
          className="flex flex-col justify-between items-center gap-4 h-full"
        >
          <div
            ref={messagesContainerRef}
            className="flex flex-col gap-4 size-full items-center overflow-y-auto px-4 md:px-0"
          >
            {messages.length === 0 && <Overview />}

            {messages.map((message, index) => (
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
                loadingTools={loadingTools}
              />
            ))}

            <div
              ref={messagesEndRef}
              className="shrink-0 min-w-[24px] min-h-[24px]"
            />
          </div>

          <form className="flex flex-row gap-2 relative items-end w-full md:max-w-[650px] max-w-[calc(100dvw-32px)] px-4 md:px-0">
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
