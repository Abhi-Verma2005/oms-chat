"use client";

import { Attachment, ToolInvocation } from "ai";
import { motion } from "framer-motion";
import { ThumbsUp, ThumbsDown, Copy, RotateCcw, ChevronDown } from "lucide-react";
import { ReactNode, useEffect, useRef, useCallback, useMemo, useState } from "react";

import { BotIcon, UserIcon } from "./icons";
import Logo from "./logo";
import { Markdown } from "./markdown";
import { PreviewAttachment } from "./preview-attachment";
import { Weather } from "./weather";
import { useCart } from "../../contexts/cart-context";
import { useSplitScreen } from "../../contexts/SplitScreenProvider";
import CartManagementResults from "../oms/cart-management-results";
import { OrdersDisplayResults } from "../oms/orders-display-results";
import StripePaymentComponent from "../oms/stripe-payment-component";
import { PublishersResults } from "../publishers/publishers-results";
import { ToolInvocationItem } from "../tools/use-tool-invocation";


export const Message = ({
  chatId,
  role,
  content,
  toolInvocations,
  attachments,
  onRegenerate,
  isLastMessage = false,
  isGenerating = false,
  onAppendMessage,
  loadingTools,
}: {
  chatId: string;
  role: string;
  content: string | ReactNode;
  toolInvocations: Array<ToolInvocation> | undefined;
  attachments?: Array<Attachment>;
  onRegenerate?: () => void;
  isLastMessage?: boolean;
  isGenerating?: boolean;
  onAppendMessage?: (message: { role: 'user'; content: string }) => Promise<string | null | undefined>;
  loadingTools?: Set<string>;
}) => {
  const { setRightPanelContent, closeRightPanel } = useSplitScreen();
  const { addItem, removeItem, getCartItemIds, state: cartState, clearCart } = useCart();
  const processedToolCalls = useRef<Set<string>>(new Set());
  const openedToolCalls = useRef<Set<string>>(new Set());
  const [copied, setCopied] = useState(false);
  const [feedback, setFeedback] = useState<'up' | 'down' | null>(null);
  
  // Filter collection state
  const [collectedFilters, setCollectedFilters] = useState<{
    priceRange?: { min: number; max: number };
    drRange?: { minDR: number; maxDR: number; minDA: number; maxDA: number };
  }>({});

  // Copy functionality
  const handleCopy = useCallback(async () => {
    if (typeof content === 'string') {
      try {
        await navigator.clipboard.writeText(content);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch (err) {
        console.error('Failed to copy text: ', err);
      }
    }
  }, [content]);

  // Feedback handlers
  const handleThumbsUp = useCallback(() => {
    setFeedback(prev => prev === 'up' ? null : 'up');
  }, []);

  const handleThumbsDown = useCallback(() => {
    setFeedback(prev => prev === 'down' ? null : 'down');
  }, []);

  // Function to trigger AI acknowledgment of payment success
  const triggerPaymentSuccessMessage = useCallback(async (paymentIntent: any) => {
    try {
      // Send a message to the chat API to trigger AI acknowledgment
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: chatId,
          messages: [
            {
              role: 'user',
              content: `Payment completed successfully! Payment ID: ${paymentIntent.id}, Amount: $${(paymentIntent.amount / 100).toFixed(2)}. Please acknowledge this payment and provide next steps.`
            }
          ]
        }),
      });

      if (response.ok) {
        console.log('Payment success message sent to AI');
      } else {
        console.error('Failed to send payment success message to AI');
      }
    } catch (error) {
      console.error('Error sending payment success message:', error);
    }
  }, [chatId]);

  // Function to handle "Done Adding to Cart" button click
  // Function to trigger AI to continue filter collection
  const triggerFilterCollectionStep = useCallback(async (step: string, filters: any) => {
    try {
      const message = `I've set my ${step === 'price' ? 'price range' : 'DR/DA ranges'}. Please continue with the next step in the filter collection process. Current filters: ${JSON.stringify(filters)}`;
      await onAppendMessage?.({ role: 'user', content: message });
    } catch (error) {
      console.error('Error triggering filter collection step:', error);
    }
  }, [onAppendMessage]);

  // Function to trigger final browse publishers call
  const triggerFinalBrowseCall = useCallback(async (filters: any) => {
    try {
      const message = `Perfect! I've completed setting up all my filters. Please now browse publishers with these filters: ${JSON.stringify(filters)}`;
      await onAppendMessage?.({ role: 'user', content: message });
    } catch (error) {
      console.error('Error triggering final browse call:', error);
    }
  }, [onAppendMessage]);

  // Filter collection handlers
  const handlePriceRangeConfirm = useCallback((priceRange: { min: number; max: number }) => {
    const newFilters = { ...collectedFilters, priceRange };
    setCollectedFilters(newFilters);
    // Trigger next step - DR range collection
    triggerFilterCollectionStep("dr", newFilters);
  }, [collectedFilters, triggerFilterCollectionStep]);

  const handlePriceRangeSkip = useCallback(() => {
    // Trigger next step - DR range collection
    triggerFilterCollectionStep("dr", collectedFilters);
  }, [collectedFilters, triggerFilterCollectionStep]);

  const handleDRRangeConfirm = useCallback((drRange: { minDR: number; maxDR: number; minDA: number; maxDA: number }) => {
    const newFilters = { ...collectedFilters, drRange };
    setCollectedFilters(newFilters);
    // Trigger final browse publishers call with proper filter format
    const browseFilters = {
      minDR: drRange.minDR,
      maxDR: drRange.maxDR,
      minDA: drRange.minDA,
      maxDA: drRange.maxDA,
      ...(collectedFilters.priceRange && {
        minPrice: collectedFilters.priceRange.min,
        maxPrice: collectedFilters.priceRange.max
      })
    };
    triggerFinalBrowseCall(browseFilters);
  }, [collectedFilters, triggerFinalBrowseCall]);

  const handleDRRangeSkip = useCallback(() => {
    // Trigger final browse publishers call with available filters
    const browseFilters = {
      ...(collectedFilters.priceRange && {
        minPrice: collectedFilters.priceRange.min,
        maxPrice: collectedFilters.priceRange.max
      })
    };
    triggerFinalBrowseCall(browseFilters);
  }, [collectedFilters, triggerFinalBrowseCall]);


  const handleDoneAddingToCart = useCallback(() => {
    if (cartState.items.length === 0) return;
    
    // Trigger AI to process payment with current cart items
    const cartItems = cartState.items.map(item => ({
      id: item.id,
      name: item.name,
      price: item.price,
      quantity: item.quantity
    }));
    
    // Show payment processing component
    const paymentComponent = (
      <div className="p-4 space-y-4">
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
          <p className="text-green-800 dark:text-green-200 text-sm font-medium">
            Ready to process payment! I&apos;ll now display the Stripe payment component for you to complete your purchase.
          </p>
        </div>
        <StripePaymentComponent
          amount={cartState.items.reduce((sum, item) => sum + (item.price * item.quantity), 0) * 1.08}
          items={cartItems}
          onPaymentSuccess={(paymentIntent: unknown) => {
            console.log('Payment successful:', paymentIntent);
            // Clear the cart after successful payment
            clearCart();
            // Trigger AI acknowledgment of successful payment
            triggerPaymentSuccessMessage(paymentIntent);
            // Auto-close sidebar after successful payment
            setTimeout(() => closeRightPanel(), 1000);
          }}
          onPaymentError={(error: unknown) => {
            console.error('Payment error:', error);
          }}
        />
      </div>
    );
    
    setRightPanelContent(paymentComponent);
  }, [cartState.items, setRightPanelContent, clearCart, triggerPaymentSuccessMessage, closeRightPanel]);

  // Function to get component and show in right panel
  const showInRightPanel = useCallback((toolName: string, result: any, key?: string) => {
    let component = null;

    switch (toolName) {
      case "getWeather":
        component = <Weather weatherAtLocation={result} />;
        break;
      case "displayOrders":
        component = <OrdersDisplayResults data={result} success={result.success} error={result.error} message={result.message} />;
        break;
      case "browsePublishers":
        component = (
          <PublishersResults 
            results={result}
            onAddToCart={(publisher) => {
              addItem({
                id: publisher.id,
                type: "publisher",
                name: publisher.websiteName,
                price: publisher.pricing.base,
                quantity: 1,
                addedAt: new Date(),
                metadata: {
                  publisherId: publisher.id,
                  website: publisher.website,
                  niche: publisher.niche,
                  dr: publisher.authority.dr,
                  da: publisher.authority.da
                }
              });
            }}
            onRemoveFromCart={(publisherId) => {
              removeItem(publisherId);
            }}
            cartItems={getCartItemIds()}
          />
        );
        break;
      case "getPublisherDetails":
        component = (
          <div className="p-4">
            <h3 className="text-lg font-semibold mb-2">Publisher Details</h3>
            <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border">
              <pre className="text-sm overflow-auto">
                {JSON.stringify(result, null, 2)}
              </pre>
            </div>
          </div>
        );
        break;
      case "addToCart":
      case "removeFromCart":
      case "viewCart":
      case "clearCart":
      case "updateCartItemQuantity":
        component = (
          <CartManagementResults 
            data={result} 
            onDoneAddingToCart={handleDoneAddingToCart}
          />
        );
        break;
      default:
        component = (
          <div className="p-4">
            <h3 className="text-lg font-semibold mb-2">Tool Result: {toolName}</h3>
            <pre className="bg-muted p-4 rounded-lg overflow-auto text-sm">
              {JSON.stringify(result, null, 2)}
            </pre>
          </div>
        );
    }

    if (component) {
      // Wrap with a key to force remount when switching from loading -> result
      const wrapped = <div key={key || `${toolName}-content`}>{component}</div>;
      console.log('🚀 Opening sidebar with content for tool:', toolName);
      setRightPanelContent(wrapped);
    } else {
      console.log('❌ No component created for tool:', toolName, 'result:', result);
    }
  }, [setRightPanelContent, addItem, removeItem, getCartItemIds, handleDoneAddingToCart, closeRightPanel]);

  // Auto-display completed tool results
  const toolStateSignature = useMemo(() => {
    if (!toolInvocations || toolInvocations.length === 0) return "";
    return toolInvocations.map((i) => `${i.toolCallId}:${i.state}`).join("|");
  }, [toolInvocations]);

  useEffect(() => {
    if (!toolInvocations || toolInvocations.length === 0) return;

    toolInvocations.forEach((toolInvocation) => {
      const { toolName, toolCallId, state } = toolInvocation;

      // When a tool call starts, just track it but don't open the sidebar yet
      if (state === "call" && !openedToolCalls.current.has(toolCallId)) {
        openedToolCalls.current.add(toolCallId);
      }

      // When the tool returns a result, open the sidebar and show the content
      if (state === "result" && !processedToolCalls.current.has(toolCallId)) {
        console.log('🔧 Tool call completed:', { toolName, toolCallId, state, result: toolInvocation.result });
        const { result } = toolInvocation as any;
        
        // Handle collectPublisherFilters inline (embedded), don't open sidebar
        if (toolName === "collectPublisherFilters") {
          // Don't open sidebar for filter collection - handled in result state
        } else {
          showInRightPanel(toolName, result, `result-${toolCallId}`);
        }
        
        processedToolCalls.current.add(toolCallId);
        openedToolCalls.current.delete(toolCallId);
      }
    });
  }, [toolStateSignature, toolInvocations, showInRightPanel, setRightPanelContent]);

  return (
    <motion.div
      className={`group flex flex-row gap-4 px-4 w-full md:w-[650px] md:px-0 first-of-type:pt-20`}
      initial={{ y: 5, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
    >
      <div className={`size-[24px] border border-border rounded-sm p-1 flex flex-col justify-center items-center shrink-0 text-muted-foreground relative ${
        role === "assistant" && isGenerating ? 'animate-[stream-pulse_2s_ease-in-out_infinite]' : ''
      }`}>
        {role === "assistant" ? (
          <Logo href="#" size={16} />
        ) : (
          <UserIcon />
        )}
        {role === "assistant" && isGenerating && (
          <div className="absolute -top-1 -right-1 size-2 bg-primary rounded-full animate-pulse" />
        )}
      </div>

      <div className="flex flex-col gap-2 w-full">
        {content && typeof content === "string" && (
          <div 
            className={`text-foreground flex flex-col gap-4 relative ${
              isGenerating ? 'animate-[stream-glow_2s_ease-in-out_infinite]' : ''
            }`}
          >
            <div className={isGenerating ? 'streaming-content' : ''}>
              <Markdown>{content}</Markdown>
            </div>
            
            {/* Typing cursor - only show during streaming */}
            {isGenerating && (
              <span 
                className="absolute bottom-0 right-0 inline-block w-0.5 h-5 bg-primary animate-[typing-cursor-optimized_1s_ease-in-out_infinite]"
                aria-hidden="true"
              />
            )}
          </div>
        )}


        {toolInvocations && (
          <div className="flex flex-col gap-3 mt-4">
            {toolInvocations.map((toolInvocation) => {
              const { toolName } = toolInvocation;
              const isLoading = loadingTools?.has(toolName) ?? false;

              // Additional props for specific renderers
              const additionalProps: Record<string, unknown> = {};

              // Filter renderer needs specific handlers
              if (toolName === "collectPublisherFilters") {
                additionalProps.onPriceRangeConfirm = handlePriceRangeConfirm;
                additionalProps.onPriceRangeSkip = handlePriceRangeSkip;
                additionalProps.onDRRangeConfirm = handleDRRangeConfirm;
                additionalProps.onDRRangeSkip = handleDRRangeSkip;
                additionalProps.onFinalBrowseCall = triggerFinalBrowseCall;
              }

              // Plan renderer needs chatId and append
              if (toolName === "createExecutionPlan" || toolName === "updatePlanProgress") {
                additionalProps.chatId = chatId;
                additionalProps.onAppendMessage = onAppendMessage;
              }

              // Payment renderer needs showInRightPanel
              if (toolName === "processPayment") {
                additionalProps.showInRightPanel = showInRightPanel;
              }

              return (
                <ToolInvocationItem
                  key={toolInvocation.toolCallId}
                  toolInvocation={toolInvocation}
                  loading={isLoading}
                  onExpand={showInRightPanel}
                  additionalProps={additionalProps}
                />
              );
            })}
          </div>
        )}

        {attachments && (
          <div className="flex flex-row gap-2">
            {attachments.map((attachment) => (
              <PreviewAttachment key={attachment.url} attachment={attachment} />
            ))}
          </div>
        )}

        {/* Response Action Buttons - Only show for assistant messages when response is complete */}
        {role === "assistant" && content && typeof content === "string" && !isGenerating && (
          <div className={`flex items-center gap-1 mt-2 text-muted-foreground transition-opacity duration-200 ${
            isLastMessage ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
          }`}>
            <button
              onClick={handleThumbsUp}
              className={`p-1 rounded hover:bg-muted transition-colors ${
                feedback === 'up' ? 'text-green-500' : ''
              }`}
              title="Thumbs up"
            >
              <ThumbsUp size={14} />
            </button>
            <button
              onClick={handleThumbsDown}
              className={`p-1 rounded hover:bg-muted transition-colors ${
                feedback === 'down' ? 'text-red-500' : ''
              }`}
              title="Thumbs down"
            >
              <ThumbsDown size={14} />
            </button>
            <button
              onClick={handleCopy}
              className={`p-1 rounded hover:bg-muted transition-colors ${
                copied ? 'text-green-500' : ''
              }`}
              title={copied ? "Copied!" : "Copy"}
            >
              <Copy size={14} />
            </button>
            {onRegenerate && (
              <button
                onClick={onRegenerate}
                className="p-1 rounded hover:bg-muted transition-colors"
                title="Regenerate response"
              >
                <RotateCcw size={14} />
              </button>
            )}
            <div className="w-px h-4 bg-border mx-1" />
            <div className="flex items-center gap-1 text-xs">
              <span className="text-muted-foreground">Personalized with Memory</span>
              <ChevronDown size={12} />
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
};
