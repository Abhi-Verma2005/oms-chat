"use client";

import { createContext, useContext, useEffect, useRef, useState, useCallback } from "react";

// WebSocket message types matching backend protocol
export enum MessageType {
  ConnectionEstablished = "connection_established",
  ConnectionError = "connection_error",
  JoinChat = "join_chat",
  LeaveChat = "leave_chat",
  ChatMessage = "chat_message",
  MessageReceived = "message_received",
  MessageError = "message_error",
  TextStream = "text_stream",
  TextStreamEnd = "text_stream_end",
  FunctionCall = "function_call",
  FunctionCallStart = "function_call_start",
  FunctionCallEnd = "function_call_end",
  FunctionResult = "function_result",
  FunctionError = "function_error",
  FunctionExecuteRequest = "function_execute_request",
  FunctionExecuteResponse = "function_execute_response",
  PublishersData = "publishers_data",
  ExecutionPlanData = "execution_plan_data",
  PlanCreated = "plan_created",
  PlanUpdated = "plan_updated",
  PlanCompleted = "plan_completed",
  CartUpdated = "cart_updated",
  CartCleared = "cart_cleared",
  SystemMessage = "system_message",
  IterationStart = "iteration_start",
  IterationEnd = "iteration_end",
  Heartbeat = "heartbeat",
  Error = "error",
}

export interface WebSocketMessage {
  type: MessageType;
  payload: unknown;
  timestamp: number;
  message_id: string;
}

export interface JoinRoomMessage {
  chat_id: string;
}

export interface SendMessageData {
  chat_id: string;
  message: {
    room_id: string;
    payload: {
      role: "user" | "assistant" | "system" | "function";
      content: string;
      name?: string;
    };
  };
}

export interface ChatMessage {
  role: "user" | "assistant" | "system" | "function";
  content: string;
  name?: string;
}

type WebSocketState = "connecting" | "connected" | "disconnected" | "error";

interface WebSocketContextType {
  state: WebSocketState;
  sendMessage: (data: SendMessageData) => void;
  joinChat: (chatId: string) => void;
  leaveChat: (chatId: string) => void;
  onMessage: (handler: (message: WebSocketMessage) => void) => () => void;
  onEvent: (eventType: MessageType, handler: (payload: unknown) => void) => () => void;
}

const WebSocketContext = createContext<WebSocketContextType | null>(null);

// WebSocket URL for chat WebSocket server (port 8080, root path)
// Format: ws://host:port/ or wss://host:port/ for production
const WS_URL = process.env.NEXT_PUBLIC_CHAT_WS_URL || "ws://localhost:8080/";
const RECONNECT_DELAY = 3000;
const MAX_RECONNECT_ATTEMPTS = 5;

export function WebSocketProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<WebSocketState>("disconnected");
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const messageHandlersRef = useRef<Set<(message: WebSocketMessage) => void>>(new Set());
  const eventHandlersRef = useRef<Map<MessageType, Set<(payload: unknown) => void>>>(new Map());
  const currentChatIdRef = useRef<string | null>(null);
  const shouldReconnectRef = useRef(true);

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      console.log('🔄 [WebSocket] Already connected, skipping');
      return;
    }

    console.log('🔄 [WebSocket] Connecting to:', WS_URL);
    setState("connecting");

    try {
      const ws = new WebSocket(WS_URL);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log('🟢 [WebSocket] Connected to chat server:', WS_URL);
        setState("connected");
        reconnectAttemptsRef.current = 0;

        // Rejoin current chat if there was one
        if (currentChatIdRef.current && ws.readyState === WebSocket.OPEN) {
          const message: WebSocketMessage = {
            type: MessageType.JoinChat,
            payload: { chat_id: currentChatIdRef.current },
            timestamp: Date.now(),
            message_id: `msg_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`,
          };
          ws.send(JSON.stringify(message));
        }
      };

      ws.onmessage = (event) => {
        try {
          const message: WebSocketMessage = JSON.parse(event.data);
          console.log('📨 [WebSocket] Message received:', message.type);

          // Notify all message handlers
          messageHandlersRef.current.forEach((handler) => {
            try {
              handler(message);
            } catch (error) {
              // Silent error handling
            }
          });

          // Notify event-specific handlers
          const eventHandlers = eventHandlersRef.current.get(message.type);
          if (eventHandlers) {
            eventHandlers.forEach((handler) => {
              try {
                handler(message.payload);
              } catch (error) {
                // Silent error handling
              }
            });
          }
        } catch (error) {
          // Silent error handling
        }
      };

      ws.onerror = (error) => {
        console.error('❌ [WebSocket] Connection error:', error);
        setState("error");
      };

      ws.onclose = (event) => {
        console.log('🔴 [WebSocket] Connection closed:', {
          code: event.code,
          reason: event.reason,
          wasClean: event.wasClean
        });
        setState("disconnected");
        wsRef.current = null;

        // Attempt reconnect if needed
        if (shouldReconnectRef.current && reconnectAttemptsRef.current < MAX_RECONNECT_ATTEMPTS) {
          reconnectAttemptsRef.current++;
          const delay = RECONNECT_DELAY * reconnectAttemptsRef.current;
          
          reconnectTimeoutRef.current = setTimeout(() => {
            connect();
          }, delay);
        } else if (reconnectAttemptsRef.current >= MAX_RECONNECT_ATTEMPTS) {
          setState("error");
        }
      };
    } catch (error) {
      setState("error");
    }
  }, []);

  const disconnect = useCallback(() => {
    shouldReconnectRef.current = false;
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    setState("disconnected");
  }, []);

  const sendMessage = useCallback((data: SendMessageData) => {
    if (wsRef.current?.readyState !== WebSocket.OPEN) {
      return;
    }

    const message: WebSocketMessage = {
      type: MessageType.ChatMessage,
      payload: data,
      timestamp: Date.now(),
      message_id: `msg_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`,
    };

    wsRef.current.send(JSON.stringify(message));
  }, []);

  const joinChat = useCallback((chatId: string) => {
    if (wsRef.current?.readyState !== WebSocket.OPEN) {
      // Store chatId to join after connection
      currentChatIdRef.current = chatId;
      return;
    }

    const message: WebSocketMessage = {
      type: MessageType.JoinChat,
      payload: { chat_id: chatId },
      timestamp: Date.now(),
      message_id: `msg_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`,
    };

    wsRef.current.send(JSON.stringify(message));
    currentChatIdRef.current = chatId;
  }, []);

  const leaveChat = useCallback((chatId: string) => {
    if (wsRef.current?.readyState !== WebSocket.OPEN) {
      return;
    }

    const message: WebSocketMessage = {
      type: MessageType.LeaveChat,
      payload: { chat_id: chatId },
      timestamp: Date.now(),
      message_id: `msg_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`,
    };

    wsRef.current.send(JSON.stringify(message));
    if (currentChatIdRef.current === chatId) {
      currentChatIdRef.current = null;
    }
  }, []);

  const onMessage = useCallback((handler: (message: WebSocketMessage) => void) => {
    messageHandlersRef.current.add(handler);
    return () => {
      messageHandlersRef.current.delete(handler);
    };
  }, []);

  const onEvent = useCallback((eventType: MessageType, handler: (payload: unknown) => void) => {
    if (!eventHandlersRef.current.has(eventType)) {
      eventHandlersRef.current.set(eventType, new Set());
    }
    eventHandlersRef.current.get(eventType)!.add(handler);
    return () => {
      const handlers = eventHandlersRef.current.get(eventType);
      if (handlers) {
        handlers.delete(handler);
      }
    };
  }, []);

  // Connect on mount
  useEffect(() => {
    connect();
    return () => {
      disconnect();
    };
  }, [connect, disconnect]);

  const value: WebSocketContextType = {
    state,
    sendMessage,
    joinChat,
    leaveChat,
    onMessage,
    onEvent,
  };

  return (
    <WebSocketContext.Provider value={value}>
      {children}
    </WebSocketContext.Provider>
  );
}

export function useWebSocket() {
  const context = useContext(WebSocketContext);
  if (!context) {
    throw new Error("useWebSocket must be used within WebSocketProvider");
  }
  return context;
}

