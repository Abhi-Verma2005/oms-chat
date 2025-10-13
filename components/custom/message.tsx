"use client";

import { Attachment, ToolInvocation } from "ai";
import { motion } from "framer-motion";
import { ThumbsUp, ThumbsDown, Copy, RotateCcw, ChevronDown } from "lucide-react";
import { ReactNode, useEffect, useRef, useCallback, useMemo, useState } from "react";

import { BotIcon, UserIcon } from "./icons";
import Logo from "./logo";
import { Markdown } from "./markdown";
import { PlanDisplay } from "./plan-display";
import { PreviewAttachment } from "./preview-attachment";
import { Weather } from "./weather";
import { useCart } from "../../contexts/cart-context";
import { useSplitScreen } from "../../contexts/SplitScreenProvider";
import CartManagementResults from "../oms/cart-management-results";
import { OrdersDisplayResults } from "../oms/orders-display-results";
import StripePaymentComponent from "../oms/stripe-payment-component";
import { PublishersResults } from "../publishers/publishers-results";
import { DRRangeEmbed } from "../ui/dr-range-embed";
import { PriceRangeEmbed } from "../ui/price-range-embed";

// Checkout Preview Component
function CheckoutPreview({ result, showInRightPanel }: { result: any; showInRightPanel: (toolName: string, result: any) => void }) {
  const { state: cartState } = useCart();
  
  // Use live cart data instead of result data for real-time updates
  const totalItems = cartState.items.reduce((sum, item) => sum + item.quantity, 0);
  const totalPrice = cartState.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  
  // Memoize the items array to prevent unnecessary re-renders and payment intent recreations
  const stripeItems = useMemo(() => 
    cartState.items.map((item: any) => ({
      id: item.id,
      name: item.name,
      price: item.price,
      quantity: item.quantity
    })), 
    [cartState.items]
  );
  
  return (
    <div className="bg-card border border-border rounded-lg p-4 hover:bg-card/80 transition-all duration-200 hover:shadow-md hover:border-ui-teal/50 w-fit max-w-full">
      <div className="flex items-center justify-between gap-3 mb-3">
        <div className="flex items-center gap-2">
          <div className="p-1 bg-ui-teal/10 rounded">
            <div className="size-3 bg-ui-teal rounded-sm flex items-center justify-center">
              <div className="size-1.5 bg-white rounded-full"></div>
            </div>
          </div>
          <h3 className="text-foreground font-medium text-sm whitespace-nowrap">Checkout</h3>
        </div>
      </div>
      
      {/* Order Preview */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-foreground">{totalItems} items</span>
          <span className="text-xs text-muted-foreground">Order Total</span>
        </div>
        
        <div className="space-y-1">
          {cartState.items.slice(0, 2).map((item: any, index: number) => (
            <div key={index} className="flex justify-between text-xs">
              <span className="text-muted-foreground">{item.name} × {item.quantity}</span>
              <span className="text-foreground">${(item.price * item.quantity).toFixed(2)}</span>
            </div>
          ))}
          {cartState.items.length > 2 && (
            <div className="text-xs text-muted-foreground">
              +{cartState.items.length - 2} more items
            </div>
          )}
        </div>
        
        <div className="border-t border-border pt-2">
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium text-foreground">Total</span>
            <span className="text-lg font-bold text-foreground">${totalPrice.toFixed(2)}</span>
          </div>
        </div>
        
        {/* Edit Button */}
        <div className="pt-2">
          <button
            onClick={() => {
              console.log('🛒 Opening cart management in sidebar');
              showInRightPanel('viewCart', { 
                summary: { totalItems, totalPrice, totalQuantity: totalItems },
                cartData: { items: cartState.items, totalItems, totalPrice, lastUpdated: new Date() }
              });
            }}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 text-xs bg-muted hover:bg-muted/80 text-foreground rounded-md transition-colors font-medium"
          >
            Edit Order
          </button>
        </div>
        
        {/* Stripe Payment Component */}
        <div className="pt-3 border-t border-border">
          <div className="bg-ui-teal/10 border border-ui-teal/30 rounded-lg p-3 mb-3">
            <p className="text-ui-teal text-xs font-medium">
              Ready to process payment! Complete your purchase below.
            </p>
          </div>
          
          <StripePaymentComponent
            amount={totalPrice}
            items={stripeItems}
            onPaymentSuccess={(paymentIntent) => {
              console.log('Payment successful:', paymentIntent);
            }}
            onPaymentError={(error) => {
              console.error('Payment error:', error);
            }}
          />
        </div>
      </div>
    </div>
  );
}

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
          onPaymentSuccess={(paymentIntent) => {
            console.log('Payment successful:', paymentIntent);
            // Clear the cart after successful payment
            clearCart();
            // Trigger AI acknowledgment of successful payment
            triggerPaymentSuccessMessage(paymentIntent);
            // Auto-close sidebar after successful payment
            setTimeout(() => closeRightPanel(), 1000);
          }}
          onPaymentError={(error) => {
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
              const { toolName, toolCallId, state } = toolInvocation;
              const displayName = toolName.replace(/([A-Z])/g, ' $1').trim()
                .split(' ')
                .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
                .join(' ');

              if (state === "result") {
                const { result } = toolInvocation;

                // Special handling for browsePublishers to show a more informative summary
                if (toolName === "browsePublishers") {
                  const { publishers, metadata, filters } = result;
                  const appliedFilters = filters ? Object.entries(filters).filter(([_, value]) => value).map(([key, value]) => `${key}: ${value}`) : [];
                  
                  return (
                    <div 
                      key={toolCallId} 
                      onClick={() => {
                        console.log('🔍 Opening sidebar with browsePublishers result');
                        showInRightPanel(toolName, result);
                      }}
                      className="bg-card border border-border rounded-lg p-4 hover:bg-card/80 cursor-pointer transition-all duration-200 hover:shadow-md hover:border-ui-teal/50 w-fit max-w-full"
                    >
                      <div className="flex items-center justify-between gap-3 mb-2">
                        <div className="flex items-center gap-2">
                          <div className="p-1 bg-ui-teal/10 rounded">
                            <div className="size-3 bg-ui-teal rounded-sm flex items-center justify-center">
                              <div className="size-1.5 bg-white rounded-full"></div>
                            </div>
                          </div>
                          <h3 className="text-foreground font-medium text-sm whitespace-nowrap">Publisher Search Results</h3>
                        </div>
                        <span className="text-muted-foreground text-xs">
                          Expand →
                        </span>
                      </div>
                      
                      <div className="space-y-2 text-xs text-muted-foreground">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-foreground">{metadata.totalCount}</span>
                          <span>publishers found</span>
                        </div>
                        
                        <div className="flex items-center gap-4">
                          <span>Avg DR: <span className="font-medium text-foreground">{metadata.averageDR}</span></span>
                          <span>Avg DA: <span className="font-medium text-foreground">{metadata.averageDA}</span></span>
                          <span>Price: <span className="font-medium text-foreground">${metadata.priceRange.min}-${metadata.priceRange.max}</span></span>
                        </div>
                        
                        {appliedFilters.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            <span className="text-muted-foreground">Filters:</span>
                            {appliedFilters.slice(0, 2).map((filter, index) => (
                              <span key={index} className="bg-muted px-2 py-0.5 rounded text-xs">{filter}</span>
                            ))}
                            {appliedFilters.length > 2 && (
                              <span className="text-muted-foreground">+{appliedFilters.length - 2} more</span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                }

                // Special handling for viewCart to show a cute cart summary
                if (toolName === "viewCart") {
                  const { summary, cartData } = result;
                  
                  return (
                    <div 
                      key={toolCallId} 
                      onClick={() => {
                        console.log('🛒 Opening sidebar with viewCart result');
                        showInRightPanel(toolName, result);
                      }}
                      className="bg-card border border-border rounded-lg p-4 hover:bg-card/80 cursor-pointer transition-all duration-200 hover:shadow-md hover:border-ui-teal/50 w-fit max-w-full"
                    >
                      <div className="flex items-center justify-between gap-3 mb-2">
                        <div className="flex items-center gap-2">
                          <div className="p-1 bg-ui-teal/10 rounded">
                            <div className="size-3 bg-ui-teal rounded-sm flex items-center justify-center">
                              <div className="size-1.5 bg-white rounded-full"></div>
                            </div>
                          </div>
                          <h3 className="text-foreground font-medium text-sm whitespace-nowrap">Shopping Cart</h3>
                        </div>
                        <span className="text-muted-foreground text-xs">
                          Expand →
                        </span>
                      </div>
                      
                      <div className="space-y-2 text-xs text-muted-foreground">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-foreground">{summary.totalItems}</span>
                          <span>items in cart</span>
                        </div>
                        
                        <div className="flex items-center gap-4">
                          <span>Total: <span className="font-medium text-foreground">${summary.totalPrice.toFixed(2)}</span></span>
                          <span>Quantity: <span className="font-medium text-foreground">{summary.totalQuantity}</span></span>
                        </div>
                        
                        {cartData.items.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            <span className="text-muted-foreground">Items:</span>
                            {cartData.items.slice(0, 2).map((item: any, index: number) => (
                              <span key={index} className="bg-muted px-2 py-0.5 rounded text-xs">
                                {item.name} (${item.price})
                              </span>
                            ))}
                            {cartData.items.length > 2 && (
                              <span className="text-muted-foreground">+{cartData.items.length - 2} more</span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                }

                // Special handling for processPayment to show simple checkout preview
                if (toolName === "processPayment") {
                  return <CheckoutPreview key={toolCallId} result={result} showInRightPanel={showInRightPanel} />;
                }

                // Special handling for createExecutionPlan - show the plan as todo list
                if (toolName === "createExecutionPlan") {
                  const { planId, summary, steps, totalSteps, message } = result;
                  console.log('🎯 createExecutionPlan result:', { planId, summary, steps, totalSteps, message });
                  
                  return (
                    <div key={toolCallId}>
                      <PlanDisplay 
                        chatId={chatId}
                        append={onAppendMessage}
                        initialPlan={{
                          id: planId,
                          summary,
                          steps: (steps || []).map((step: any, index: number) => ({
                            id: `step-${index}`,
                            stepIndex: index,
                            description: step.description,
                            toolName: step.toolName,
                            status: 'pending'
                          })),
                          currentStepIndex: 0,
                          totalSteps,
                          status: 'active'
                        }}
                      />
                    </div>
                  );
                }

                // Special handling for updatePlanProgress - show updated plan as todo list
                if (toolName === "updatePlanProgress") {
                  const { planId, summary, steps, totalSteps, currentStepIndex, status, message } = result;
                  console.log('🎯 updatePlanProgress result:', { planId, summary, steps, totalStepIndex: currentStepIndex, totalSteps, status, message });
                  
                  return (
                    <div key={toolCallId}>
                      <PlanDisplay 
                        chatId={chatId}
                        append={onAppendMessage}
                        initialPlan={{
                          id: planId,
                          summary,
                          steps: (steps || []).map((step: any, index: number) => ({
                            id: step.id || `step-${index}`,
                            stepIndex: step.stepIndex || index,
                            description: step.description,
                            toolName: step.toolName,
                            status: step.status || (index < currentStepIndex ? 'completed' : 'pending')
                          })),
                          currentStepIndex,
                          totalSteps,
                          status
                        }}
                      />
                    </div>
                  );
                }

                // Special handling for collectPublisherFilters - show embedded input modal
                if (toolName === "collectPublisherFilters") {
                  const { action, message, collectedFilters } = result;
                  
                  if (action === "show_price_modal") {
                    return (
                      <div key={toolCallId} className="max-w-md">
                        <PriceRangeEmbed
                          onConfirm={handlePriceRangeConfirm}
                          onSkip={handlePriceRangeSkip}
                        />
                      </div>
                    );
                  } else if (action === "show_dr_modal") {
                    return (
                      <div key={toolCallId} className="max-w-md">
                        <DRRangeEmbed
                          onConfirm={handleDRRangeConfirm}
                          onSkip={handleDRRangeSkip}
                        />
                      </div>
                    );
                  } else if (action === "collect_complete") {
                    return (
                      <div key={toolCallId} className="bg-card border border-border rounded-lg p-4 max-w-md">
                        <div className="flex items-center gap-2 mb-3">
                          <div className="p-1.5 bg-green-100 dark:bg-green-900/30 rounded-md">
                            <div className="size-4 bg-green-600 dark:bg-green-400 rounded-full flex items-center justify-center">
                              <div className="size-2 bg-white rounded-full"></div>
                            </div>
                          </div>
                          <div>
                            <h3 className="text-sm font-semibold text-foreground">Filters Complete</h3>
                            <p className="text-xs text-muted-foreground">Ready to search publishers</p>
                          </div>
                        </div>
                        <div className="text-xs text-muted-foreground mb-3">
                          {message}
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => triggerFinalBrowseCall(collectedFilters)}
                            className="flex-1 bg-purple-600 hover:bg-purple-700 text-white text-xs font-medium px-3 py-2 rounded-md transition-colors"
                          >
                            Search Publishers
                          </button>
                        </div>
                      </div>
                    );
                  }
                  
                  // Fallback for unknown actions
                  return (
                    <div key={toolCallId} className="bg-card border border-border rounded-lg p-3 max-w-md">
                      <div className="text-sm text-muted-foreground">
                        {message}
                      </div>
                    </div>
                  );
                }

                return (
                  <div 
                    key={toolCallId} 
                    onClick={() => showInRightPanel(toolName, result)}
                    className="bg-card border border-border rounded-lg p-3 hover:bg-card/80 cursor-pointer transition-all duration-200 hover:shadow-md hover:border-ui-teal/50 w-fit max-w-full"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <h3 className="text-foreground font-medium text-sm whitespace-nowrap">{displayName}</h3>
                      <span className="text-muted-foreground text-xs">→</span>
                    </div>
                  </div>
                );
              } else {
                return (
                  <div key={toolCallId} className="relative bg-card border border-border rounded-lg p-3 overflow-hidden w-fit max-w-full">
                    {/* Animated border light */}
                    <div className="absolute inset-0 rounded-lg">
                      <div className="absolute inset-0 rounded-lg bg-gradient-to-r from-transparent via-ui-teal/50 to-transparent opacity-0 animate-[border-light_2s_ease-in-out_infinite]"></div>
                      <div className="absolute inset-px rounded-lg bg-card"></div>
                    </div>
                    
                    <div className="relative flex items-center justify-between gap-3">
                      <h3 className="text-foreground font-medium text-sm whitespace-nowrap">{displayName}</h3>
                      <div className="flex items-center gap-2">
                        <div className="size-2 bg-ui-teal rounded-full animate-pulse"></div>
                        <div className="size-2 bg-ui-teal rounded-full animate-pulse" style={{ animationDelay: '0.2s' }}></div>
                        <div className="size-2 bg-ui-teal rounded-full animate-pulse" style={{ animationDelay: '0.4s' }}></div>
                      </div>
                    </div>
                  </div>
                );
              }
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
