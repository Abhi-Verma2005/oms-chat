"use client";

import { Attachment, Message, ToolInvocation } from "ai";
import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { Panel, PanelGroup, PanelResizeHandle } from "react-resizable-panels";

import { LeftSidebar } from "./left-sidebar";
import { Message as PreviewMessage } from "./message";
import { MultimodalInput } from "./multimodal-input";
import { RightPanel } from "./RightPanel";
import { useScrollToBottom } from "./use-scroll-to-bottom";
import { useCart } from "../../contexts/cart-context";
import { useSplitScreen } from "../../contexts/SplitScreenProvider";
import { useUserInfo } from "../../contexts/UserInfoProvider";
import { useWebSocket, MessageType, ChatMessage } from "../../contexts/websocket-context";

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
  
  // Clean up initialMessages: merge empty assistant messages with tool invocations into adjacent messages
  const cleanedInitialMessages = useMemo(() => {
    if (!initialMessages || initialMessages.length === 0) return [];
    
    const cleaned: Array<Message> = [];
    const pendingToolInvocations: Array<ToolInvocation>[] = []; // Track tool invocations from skipped messages
    
    for (let i = 0; i < initialMessages.length; i++) {
      const currentMsg = initialMessages[i];
      
      // If it's an assistant message with empty content but has tool invocations
      if (
        currentMsg.role === "assistant" &&
        (!currentMsg.content || currentMsg.content.trim() === "") &&
        currentMsg.toolInvocations &&
        currentMsg.toolInvocations.length > 0
      ) {
        // Look ahead to see if there's a next assistant message with content
        let hasNextAssistantWithContent = false;
        
        for (let j = i + 1; j < initialMessages.length; j++) {
          if (
            initialMessages[j].role === "assistant" &&
            initialMessages[j].content &&
            initialMessages[j].content.trim() !== ""
          ) {
            hasNextAssistantWithContent = true;
            // Store tool invocations to merge into the next assistant message
            pendingToolInvocations.push(currentMsg.toolInvocations || []);
            break;
          }
          // Stop if we hit a user message
          if (initialMessages[j].role === "user") {
            break;
          }
        }
        
        // If there's a next assistant with content, skip this empty message
        // The tool invocations will be merged when we process that message
        if (hasNextAssistantWithContent) {
          continue; // Skip this empty message
        } else {
          // No next assistant with content, keep it (might need to show tool invocations)
          cleaned.push(currentMsg);
        }
      } else if (
        currentMsg.role === "assistant" &&
        currentMsg.content &&
        currentMsg.content.trim() !== "" &&
        pendingToolInvocations.length > 0
      ) {
        // This is an assistant message with content, merge any pending tool invocations
        const mergedToolInvocations = [
          ...pendingToolInvocations.flat(),
          ...(currentMsg.toolInvocations || []),
        ];
        cleaned.push({
          ...currentMsg,
          toolInvocations: mergedToolInvocations,
        });
        pendingToolInvocations.length = 0; // Clear pending
      } else {
        // Not an empty assistant message, add it as-is
        cleaned.push(currentMsg);
      }
    }
    
    return cleaned;
  }, [initialMessages]);

  // Convert initialMessages to internal format and manage state
  const [messages, setMessages] = useState<Array<Message>>(cleanedInitialMessages);
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
  const { isRightPanelOpen } = useSplitScreen();
  const [isLeftSidebarCollapsed, setIsLeftSidebarCollapsed] = useState(true);

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
          
          let updatedMessages: Array<Message>;
          
          if (existingIndex >= 0) {
            // Update existing message
            updatedMessages = [...prev];
            updatedMessages[existingIndex] = {
              ...updatedMessages[existingIndex],
              content,
            };
            console.log("[Chat] Updated existing message at index:", existingIndex);
          } else {
            // Add new assistant message
            console.log("[Chat] Creating new assistant message with id:", messageId);
            updatedMessages = [
              ...prev,
              {
                id: messageId,
                role: "assistant",
                content,
              },
            ];
          }
          
          // Save to database immediately
          if (user) {
            const assistantMessage = updatedMessages[existingIndex >= 0 ? existingIndex : updatedMessages.length - 1];
            fetch("/api/chat/message", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                chatId: id,
                message: assistantMessage,
              }),
            })
              .then((res) => {
                if (!res.ok) {
                  console.error("[Chat] Failed to save assistant message:", res.status, res.statusText);
                }
              })
              .catch((err) => {
                console.error("[Chat] Failed to save assistant message:", err);
              });
          }
          
          return updatedMessages;
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
              
              // Save the message with tool invocation to DB
              const updatedMessage = { ...message, toolInvocations: [...message.toolInvocations] };
              updated[lastAssistantIndex] = updatedMessage;
              
              if (user && updatedMessage.role === "assistant") {
                fetch("/api/chat/message", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    chatId: id,
                    message: updatedMessage,
                  }),
                })
                  .then((res) => {
                    if (!res.ok) {
                      console.error("[Chat] Failed to save function call:", res.status, res.statusText);
                    } else {
                      console.log("[Chat] Successfully saved message with function call to DB");
                    }
                  })
                  .catch((err) => {
                    console.error("[Chat] Failed to save function call:", err);
                  });
              }
            } else {
              console.log("[Chat] Tool invocation already exists in call state, skipping duplicate");
            }
          } else {
            console.log("[Chat] Last assistant message is older than last user message, creating new assistant message");
            // Create a new assistant message instead
            const newMessage: Message = {
              id: `assistant_${Date.now()}`,
              role: "assistant",
              content: "",
              toolInvocations: [{
                toolCallId: `call_${Date.now()}`,
                toolName: data.name,
                args: data.args,
                state: "call",
              }],
            };
            updated.push(newMessage);
            
            // Save the new message with tool invocation to DB
            if (user && newMessage.role === "assistant") {
              fetch("/api/chat/message", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  chatId: id,
                  message: newMessage,
                }),
              })
                .then((res) => {
                  if (!res.ok) {
                    console.error("[Chat] Failed to save new function call:", res.status, res.statusText);
                  } else {
                    console.log("[Chat] Successfully saved new message with function call to DB");
                  }
                })
                .catch((err) => {
                  console.error("[Chat] Failed to save new function call:", err);
                });
            }
          }
        } else {
          // Create a new assistant message with tool invocation
          console.log("[Chat] Creating new assistant message for function call");
          const newMessage: Message = {
            id: `assistant_${Date.now()}`,
            role: "assistant",
            content: "",
            toolInvocations: [{
              toolCallId: `call_${Date.now()}`,
              toolName: data.name,
              args: data.args,
              state: "call",
            }],
          };
          updated.push(newMessage);
          
          // Save the new message with tool invocation to DB
          if (user && newMessage.role === "assistant") {
            fetch("/api/chat/message", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                chatId: id,
                message: newMessage,
              }),
            })
              .then((res) => {
                if (!res.ok) {
                  console.error("[Chat] Failed to save new function call:", res.status, res.statusText);
                } else {
                  console.log("[Chat] Successfully saved new message with function call to DB");
                }
              })
              .catch((err) => {
                console.error("[Chat] Failed to save new function call:", err);
              });
          }
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
              const updatedMessage = {
                ...updated[i],
                toolInvocations: newToolInvocations,
              };
              updated[i] = updatedMessage;

              // Save the updated message with function result to DB
              if (user && updatedMessage.role === "assistant") {
                fetch("/api/chat/message", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    chatId: id,
                    message: updatedMessage,
                  }),
                })
                  .then((res) => {
                    if (!res.ok) {
                      console.error("[Chat] Failed to save function result:", res.status, res.statusText);
                    } else {
                      console.log("[Chat] Successfully saved message with function result to DB");
                    }
                  })
                  .catch((err) => {
                    console.error("[Chat] Failed to save function result:", err);
                  });
              }
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
              const updatedMessage = {
                ...updated[i],
                toolInvocations: newToolInvocations,
              };
              updated[i] = updatedMessage;

              // Save the updated message with publishers data to DB
              if (user && updatedMessage.role === "assistant") {
                fetch("/api/chat/message", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    chatId: id,
                    message: updatedMessage,
                  }),
                })
                  .then((res) => {
                    if (!res.ok) {
                      console.error("[Chat] Failed to save publishers data:", res.status, res.statusText);
                    } else {
                      console.log("[Chat] Successfully saved message with publishers data to DB");
                    }
                  })
                  .catch((err) => {
                    console.error("[Chat] Failed to save publishers data:", err);
                  });
              }
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
  }, [onEvent, streamingContent, id, user]);

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
    const userMsg: Message = {
      id: userMsgId,
      role: "user",
      content: userMessage.content,
    };
    
    // Add to state immediately
    setMessages((prev) => [...prev, userMsg]);
    
    // Save to database immediately (don't await - but ensure it runs)
    if (user) {
      fetch("/api/chat/message", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chatId: id,
          message: userMsg,
        }),
      })
        .then((res) => {
          if (!res.ok) {
            console.error("[Chat] Failed to save user message:", res.status, res.statusText);
          }
        })
        .catch((err) => {
          console.error("[Chat] Failed to save user message:", err);
        });
    }

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
  }, [input, isLoading, wsState, id, sendMessage, messagesContainerRef, user]);

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
    <div className="flex flex-row h-dvh bg-background relative">
      {/* Left Sidebar - Fixed width */}
      <div className="w-16 h-full shrink-0 z-20">
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

      {/* Panel Group for resizable layout */}
      <div className="flex-1 h-full min-w-0">
        <PanelGroup direction="horizontal" className="size-full">
          {/* Main Chat Area */}
          <Panel 
            defaultSize={100}
            minSize={25}
            className="flex flex-col relative"
          >
            <div 
              className={`flex flex-col pb-4 md:pb-8 transition-all duration-300 h-full ${
                messages.length === 0 ? 'justify-center items-center' : 'justify-between'
              }`}
            >
              {messages.length > 0 && (
                <div
                  ref={messagesContainerRef}
                  className="flex flex-col gap-4 w-full h-full items-center overflow-y-auto px-4"
                >
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
              )}

              <form className="flex flex-row gap-2 relative items-end w-full md:max-w-[650px] max-w-[calc(100dvw-32px)] px-4 mx-auto">
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
          </Panel>

        {/* Right Panel */}
        {isRightPanelOpen && (
          <>
            <PanelResizeHandle className="w-1 bg-border hover:bg-blue-500/50 cursor-col-resize transition-colors relative z-10" />
            <Panel 
              defaultSize={30} 
              minSize={15} 
              maxSize={75}
              className="flex flex-col"
            >
              <RightPanel />
            </Panel>
          </>
        )}
      </PanelGroup>
      </div>
    </div>
  );
}
