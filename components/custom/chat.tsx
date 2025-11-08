"use client";

import { Attachment, Message, ToolInvocation } from "ai";
import { useRouter } from "next/navigation";
import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { Panel, PanelGroup, PanelResizeHandle } from "react-resizable-panels";

import { LeftSidebar } from "./left-sidebar";
import { Message as PreviewMessage } from "./message";
import { MultimodalInput } from "./multimodal-input";
import { RightPanel } from "./RightPanel";
import { useScrollToBottom, useClaudeScroll, useEnhancedClaudeScroll } from "./use-scroll-to-bottom";
import { useCart } from "../../contexts/cart-context";
import { useSplitScreen } from "../../contexts/SplitScreenProvider";
import { useUserInfo } from "../../contexts/UserInfoProvider";
import { useWebSocket, MessageType, ChatMessage } from "../../contexts/websocket-context";

// Helper functions for localStorage draft keys
const getPerChatDraftKey = (chatId: string) => `chat_draft_${chatId}`;
const NEW_CHAT_DRAFT_KEY = `chat_draft_new`;


export function Chat({
  id,
  initialMessages,
  user,
}: {
  id: string;
  initialMessages: Array<Message>;
  user?: any;
}) {
  const router = useRouter();
  const { userInfo } = useUserInfo();
  const { state: cartState, addItem: addItemToCart } = useCart();
  const { setRightPanelContent } = useSplitScreen();
  const { sendMessage, joinChat, leaveChat, onEvent, state: wsState } = useWebSocket();
  const wsCtx = useWebSocket();
  const [isCreatingChat, setIsCreatingChat] = useState(false);
  const [selectedDocuments, setSelectedDocuments] = useState<string[]>([]);
  
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
  // Input state (draft restored via effect below)
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const saveDraftTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [streamingContent, setStreamingContent] = useState<{ [messageId: string]: string }>({});
  const [loadingTools, setLoadingTools] = useState<Set<string>>(new Set());
  const currentAssistantMessageIdRef = useRef<string | null>(null);
  const stopRequestedRef = useRef(false);
  const lastUserMessageRef = useRef<string | null>(null);

  // Get last message ID for streaming scroll tracking
  const lastMessageId = useMemo(() => {
    if (messages.length === 0) return undefined;
    return messages[messages.length - 1].id;
  }, [messages]);

  const [messagesContainerRef, scrollToMessage] =
    useEnhancedClaudeScroll<HTMLDivElement>(!isLoading, isLoading, lastMessageId);

  const [attachments, setAttachments] = useState<Array<Attachment>>([]);
  const { isRightPanelOpen } = useSplitScreen();
  const [isLeftSidebarCollapsed, setIsLeftSidebarCollapsed] = useState(true);

  // Load draft when chat ID or message count changes
  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        // Prefer new-chat draft when there are no messages yet
        const key = messages.length === 0 ? NEW_CHAT_DRAFT_KEY : getPerChatDraftKey(id);
        const saved = localStorage.getItem(key);
        if (typeof saved === 'string') {
          setInput(saved);
        }
      } catch {
        // Ignore localStorage errors
      }
    }
  }, [id, messages.length]);

  // Save draft to localStorage whenever input changes (debounced)
  useEffect(() => {
    if (typeof window !== "undefined") {
      // Clear previous timeout
      if (saveDraftTimeoutRef.current) {
        clearTimeout(saveDraftTimeoutRef.current);
      }
      // Save after 300ms of no typing
      saveDraftTimeoutRef.current = setTimeout(() => {
        try {
          const key = messages.length === 0 ? NEW_CHAT_DRAFT_KEY : getPerChatDraftKey(id);
          if (input.trim()) {
            localStorage.setItem(key, input);
          } else {
            // Clear if empty
            localStorage.removeItem(key);
          }
        } catch {
          // Ignore localStorage errors (quota exceeded, etc.)
        }
      }, 300);
      return () => {
        if (saveDraftTimeoutRef.current) {
          clearTimeout(saveDraftTimeoutRef.current);
        }
      };
    }
  }, [input, id, messages.length]);

  // Join chat on mount
  useEffect(() => {
    if (wsState === "connected") {
      joinChat(id, user?.id);
    }
    return () => {
      leaveChat(id);
    };
  }, [id, wsState, joinChat, leaveChat]);

  // If we navigated after creating a new chat, pick up the pending first message and send it
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (wsState !== "connected") return;
    try {
      const key = `pending_first_message_${id}`;
      const raw = sessionStorage.getItem(key);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      
      // Handle both old format (just Message) and new format (with selectedDocuments/cartData)
      let pending: Message;
      let pendingSelectedDocuments: string[] | undefined;
      let cartData: any;
      
      if (parsed.message) {
        // New format: { message: Message, selectedDocuments?: string[], cartData?: any }
        pending = parsed.message;
        pendingSelectedDocuments = parsed.selectedDocuments;
        cartData = parsed.cartData;
      } else {
        // Old format: just Message
        pending = parsed as Message;
      }
      // Send via WebSocket; UI likely already shows this message from DB
      if (pending?.content) {
        const messagePayload: any = {
          chat_id: id,
          user_id: user?.id,
          message: {
            room_id: id,
            payload: {
              role: "user",
              content: pending.content,
              ...(cartData && { cartData: cartData })
            },
          },
        };
        
        // Include selectedDocuments and cartData if they exist
        if (pendingSelectedDocuments && pendingSelectedDocuments.length > 0) {
          messagePayload.selectedDocuments = pendingSelectedDocuments;
        }
        if (cartData) {
          messagePayload.cartData = cartData;
        }
        
        sendMessage(messagePayload);
        setIsLoading(true);
        stopRequestedRef.current = false;
        
        // Restore selectedDocuments state so it persists for subsequent messages
        if (pendingSelectedDocuments && pendingSelectedDocuments.length > 0) {
          setSelectedDocuments(pendingSelectedDocuments);
        }
        
        // Align the pending message to top in the viewport
        setTimeout(() => {
          scrollToMessage(`msg-${pending.id}`);
        }, 0);
      }
      sessionStorage.removeItem(key);
      // Clear any leftover new-chat draft
      localStorage.removeItem(NEW_CHAT_DRAFT_KEY);
    } catch {}
  }, [id, wsState, sendMessage, scrollToMessage, user, setSelectedDocuments]);

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

    // Handle cart data - update tool invocations and show cart in sidebar (like PublishersData)
    const unsubscribeCartData = onEvent(MessageType.CartData, (payload: unknown) => {
      const data = payload as { 
        action: 'show' | 'checkout'; 
        summary?: {
          totalItems: number;
          totalQuantity: number;
          totalPrice: number;
          isEmpty: boolean;
        };
        cartData?: {
          items: unknown[];
          totalItems: number;
          totalPrice: number;
        };
        message?: string;
      };
      console.log("[Chat] CartData received:", data);
      
      // Remove viewCart from loadingTools since we have the data
      setLoadingTools((prev) => {
        const updated = new Set(prev);
        updated.delete("viewCart");
        return updated;
      });
      
      // Update viewCart tool invocations to result state (similar to PublishersData)
      if (data.summary) {
        const cartSummary = {
          summary: data.summary,
          cartData: data.cartData || {
            items: [],
            totalItems: data.summary.totalItems,
            totalPrice: data.summary.totalPrice
          },
          success: true,
          message: data.message || (data.summary.isEmpty ? "Cart is empty" : "Cart displayed")
        };
        
        setMessages((prev) => {
          const updated = [...prev];
          // Find all messages with tool invocations (viewCart)
          for (let i = updated.length - 1; i >= 0; i--) {
            const message = updated[i];
            if (message.toolInvocations && message.toolInvocations.length > 0) {
              // Find ALL viewCart tool invocations (in case there are duplicates)
              const viewCartIndices = message.toolInvocations
                .map((inv, idx) => inv.toolName === "viewCart" && inv.state === "call" ? idx : -1)
                .filter(idx => idx !== -1);
              
              if (viewCartIndices.length > 0) {
                const newToolInvocations = [...(message.toolInvocations || [])];
                // Update all "call" state viewCart invocations to "result"
                viewCartIndices.forEach((idx) => {
                  newToolInvocations[idx] = {
                    ...newToolInvocations[idx],
                    state: "result",
                    result: cartSummary,
                  };
                });
                const updatedMessage = {
                  ...updated[i],
                  toolInvocations: newToolInvocations,
                };
                updated[i] = updatedMessage;

                // Save the updated message with cart data to DB
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
                        console.error("[Chat] Failed to save cart data:", res.status, res.statusText);
                      } else {
                        console.log("[Chat] Successfully saved message with cart data to DB");
                      }
                    })
                    .catch((err) => {
                      console.error("[Chat] Failed to save cart data:", err);
                    });
                }
              }
            }
          }
          return updated;
        });
      }
      
      if (data.action === 'show') {
        // Show cart in sidebar
        import('../oms/cart-management-results').then(({ default: CartManagementResults }) => {
          const items = cartState.items || [];
          const cartData = {
            items: items,
            totalItems: items.reduce((sum, item) => sum + item.quantity, 0),
            totalPrice: items.reduce((sum, item) => sum + (item.price * item.quantity), 0),
            lastUpdated: new Date()
          };
          
          setRightPanelContent(
            <CartManagementResults 
              data={{
                success: true,
                message: data.message || "Your cart",
                cartData
              }}
              onDoneAddingToCart={() => {
                // When user clicks checkout, trigger processPayment
                const cartItems = (cartState.items || []).map(item => ({
                  id: item.id,
                  name: item.name,
                  price: item.price,
                  quantity: item.quantity
                }));
                // This will be handled by the AI calling processPayment
              }}
            />
          );
          // setRightPanelContent automatically opens the panel
        });
      } else if (data.action === 'checkout') {
        // Show payment component
        import('../oms/stripe-payment-component').then(({ default: StripePaymentComponent }) => {
          const items = cartState.items || [];
          const totalAmount = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
          const stripeItems = items.map(item => ({
            id: item.id,
            name: item.name,
            price: item.price,
            quantity: item.quantity
          }));
          
          setRightPanelContent(
            <div className="p-4">
              <StripePaymentComponent
                amount={totalAmount * 1.08} // Include tax
                items={stripeItems}
                onPaymentSuccess={(paymentIntent) => {
                  console.log('Payment successful:', paymentIntent);
                  // Clear cart after successful payment
                  // Trigger AI acknowledgment
                }}
                onPaymentError={(error) => {
                  console.error('Payment error:', error);
                }}
              />
            </div>
          );
          // setRightPanelContent automatically opens the panel
        });
      }
    });

    // Handle cart updated - add item to cart
    const unsubscribeCartUpdated = onEvent(MessageType.CartUpdated, (payload: unknown) => {
      const data = payload as { action: 'add'; item: { type: "publisher" | "product"; name: string; price: number; quantity: number; metadata?: unknown } };
      console.log("[Chat] CartUpdated received:", data);
      
      if (data.action === 'add' && data.item) {
        // Generate a cart ID for the item
        const cartId = `cart_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        
        addItemToCart({
          id: cartId,
          type: data.item.type,
          name: data.item.name,
          price: data.item.price,
          quantity: data.item.quantity,
          addedAt: new Date(),
          metadata: data.item.metadata as {
            publisherId?: string;
            website?: string;
            niche?: string[];
            dr?: number;
            da?: number;
          }
        });
      }
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
      unsubscribeCartData();
      unsubscribeCartUpdated();
      unsubscribeError();
    };
  }, [onEvent, streamingContent, id, user, cartState.items, addItemToCart, setRightPanelContent, setMessages, setLoadingTools]);

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
    
    // If first message in a new chat: create chat, redirect, then stream
    if (messages.length === 0) {
      try {
        setIsCreatingChat(true);
        const res = await fetch("/api/chat/create", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message: userMsg }),
        });
        if (!res.ok) {
          console.error("[Chat] Failed to create chat:", res.status, res.statusText);
          setIsCreatingChat(false);
          return;
        }
        const data = await res.json();
        const newId = data?.id as string;
        if (!newId) { setIsCreatingChat(false); return; }

        // Prepare cart data and selected documents to store with pending message
        const items = cartState.items || [];
        const cartDataForBackend = items.length > 0 ? {
          items: items.map(item => ({
            id: item.id,
            type: item.type,
            name: item.name,
            price: item.price,
            quantity: item.quantity,
            addedAt: item.addedAt.toISOString(),
            metadata: item.metadata
          })),
          totalItems: items.reduce((sum, item) => sum + item.quantity, 0),
          totalPrice: items.reduce((sum, item) => sum + (item.price * item.quantity), 0),
        } : undefined;

        try {
          // Store pending message with selectedDocuments and cartData
          const pendingData = {
            message: userMsg,
            selectedDocuments: selectedDocuments.length > 0 ? selectedDocuments : undefined,
            cartData: cartDataForBackend
          };
          sessionStorage.setItem(`pending_first_message_${newId}`, JSON.stringify(pendingData));
          localStorage.removeItem(NEW_CHAT_DRAFT_KEY);
        } catch {}

        setIsLoading(true);
        stopRequestedRef.current = false;
        router.push(`/chat/${newId}`);
        return;
      } catch (e) {
        console.error("[Chat] Exception creating chat:", e);
        setIsCreatingChat(false);
        return;
      }
    }

    // Existing chat: proceed normally
    setMessages((prev) => [...prev, userMsg]);
    // Scroll so the just-sent user message is positioned at the top of the scroll container
    setTimeout(() => {
      scrollToMessage(`msg-${userMsgId}`);
    }, 0);
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

    // Include cart data in message payload
    const items = cartState.items || [];
    const cartDataForBackend = items.length > 0 ? {
      items: items.map(item => ({
        id: item.id,
        type: item.type,
        name: item.name,
        price: item.price,
        quantity: item.quantity,
        addedAt: item.addedAt.toISOString(),
        metadata: item.metadata
      })),
      totalItems: items.reduce((sum, item) => sum + item.quantity, 0),
      totalPrice: items.reduce((sum, item) => sum + (item.price * item.quantity), 0),
    } : undefined;

    sendMessage({
      chat_id: id,
      user_id: user?.id,
      message: {
        room_id: id,
        payload: {
          ...userMessage,
          ...(cartDataForBackend && { cartData: cartDataForBackend })
        },
      },
      ...(cartDataForBackend && { cartData: cartDataForBackend }),
      ...(selectedDocuments.length > 0 && { selectedDocuments })
    });

    setInput("");
    setIsLoading(true);
    stopRequestedRef.current = false;
    if (typeof window !== "undefined") {
      try {
        localStorage.removeItem(NEW_CHAT_DRAFT_KEY);
        localStorage.removeItem(getPerChatDraftKey(id));
      } catch {}
    }
  }, [input, isLoading, wsState, id, sendMessage, scrollToMessage, user, messages.length, router, cartState.items, selectedDocuments]);

  // Stop generation
  const stop = useCallback(() => {
    stopRequestedRef.current = true;
    setIsLoading(false);
    try {
      (wsCtx as any).sendStop?.(id);
    } catch {}
  }, [id, wsCtx]);

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
      if (newMessage.id) {
        scrollToMessage(`msg-${newMessage.id}`);
      }
    }, 0);
    
    // If it's a user message and WebSocket is connected, send it via WebSocket
    if (newMessage.role === "user" && wsState === "connected" && newMessage.content) {
      sendMessage({
        chat_id: id,
        user_id: user?.id,
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

      // Clear any existing draft since a user message was sent via quick prompt
      if (typeof window !== "undefined") {
        try {
          localStorage.removeItem(NEW_CHAT_DRAFT_KEY);
          localStorage.removeItem(getPerChatDraftKey(id));
        } catch {}
      }
      setInput("");
    }
    
    return newMessage.id;
  }, [wsState, id, sendMessage, scrollToMessage]);

  // Regenerate function (placeholder - would need backend support)
  const handleRegenerate = useCallback(() => {
    // TODO: Implement regeneration via WebSocket
    console.log("Regenerate not yet implemented");
  }, []);

  return (
    <div className="h-dvh bg-background relative">
      {/* Menu button - positioned absolutely */}
      <div className="absolute left-4 top-4 z-30">
        <LeftSidebar 
          user={user} 
          onCollapseChange={setIsLeftSidebarCollapsed}
        />
      </div>

      {/* Panel Group for resizable layout */}
      <div className="h-full w-full">
        <PanelGroup direction="horizontal" className="size-full">
          {/* Main Chat Area */}
          <Panel 
            defaultSize={100}
            minSize={25}
            className="flex flex-col relative"
          >
            <div 
              className={`flex flex-col pb-2 md:pb-4 transition-all duration-300 h-full ${
                messages.length === 0 ? 'justify-center items-center' : 'justify-between'
              }`}
            >
              {messages.length > 0 && (
                <div
                  ref={messagesContainerRef}
                  className="flex flex-col gap-4 w-full h-full items-center overflow-y-auto px-4"
                >
                  {messages.map((message, index) => (
                    <div id={`msg-${message.id}`} key={message.id} className={`w-full flex justify-center ${index === 0 ? 'pt-20' : ''}`}>
                      <PreviewMessage
                        chatId={id}
                        role={message.role}
                        content={message.content}
                        attachments={message.experimental_attachments}
                        toolInvocations={message.toolInvocations}
                        onRegenerate={handleRegenerate}
                        isLastMessage={index === messages.length - 1}
                        isGenerating={isLoading && index === messages.length - 1 && message.role === "assistant"}
                        onAppendMessage={append}
                        loadingTools={loadingTools}
                      />
                    </div>
                  ))}

                  {/* Show "Thinking..." shimmer when loading but no assistant message exists yet */}
                  {isLoading && (messages.length === 0 || messages[messages.length - 1]?.role === "user") && 
                    Object.keys(streamingContent).length === 0 && (
                    <PreviewMessage
                      key="thinking-placeholder"
                      chatId={id}
                      role="assistant"
                      content=""
                      isGenerating={true}
                      toolInvocations={undefined}
                      onAppendMessage={append}
                      loadingTools={loadingTools}
                    />
                  )}

                  {/* Spacer for proper scrolling */}
                  <div className="shrink-0 min-w-[24px] min-h-[24px]" />
                </div>
              )}

              <form className="flex flex-row gap-2 relative items-end w-full md:max-w-[650px] max-w-[calc(100dvw-32px)] px-4 mx-auto">
                <MultimodalInput
                  input={input}
                  setInput={setInput}
                  handleSubmit={handleSubmit}
                  isLoading={isLoading}
                  stop={stop}
                  isCreatingChat={isCreatingChat}
                  attachments={attachments}
                  setAttachments={setAttachments}
                  messages={messages}
                  append={append}
                  selectedDocuments={selectedDocuments}
                  setSelectedDocuments={setSelectedDocuments}
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
