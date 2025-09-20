"use client";

import { Attachment, ToolInvocation } from "ai";
import { motion } from "framer-motion";
import { ReactNode, useEffect, useRef, useCallback } from "react";

import { BotIcon, UserIcon } from "./icons";
import { Markdown } from "./markdown";
import { PreviewAttachment } from "./preview-attachment";
import { Weather } from "./weather";
import { useCart } from "../../contexts/cart-context";
import { useSplitScreen } from "../../contexts/SplitScreenProvider";
import CartManagementResults from "../oms/cart-management-results";
import { OrdersDisplayResults } from "../oms/orders-display-results";
import StripePaymentComponent from "../oms/stripe-payment-component";
import { PublishersResults } from "../publishers/publishers-results";

export const Message = ({
  chatId,
  role,
  content,
  toolInvocations,
  attachments,
}: {
  chatId: string;
  role: string;
  content: string | ReactNode;
  toolInvocations: Array<ToolInvocation> | undefined;
  attachments?: Array<Attachment>;
}) => {
  const { setRightPanelContent } = useSplitScreen();
  const { addItem, removeItem, getCartItemIds, state: cartState, clearCart } = useCart();
  const processedToolCalls = useRef<Set<string>>(new Set());

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
          }}
          onPaymentError={(error) => {
            console.error('Payment error:', error);
          }}
        />
      </div>
    );
    
    setRightPanelContent(paymentComponent);
  }, [cartState.items, setRightPanelContent, clearCart, triggerPaymentSuccessMessage]);

  // Function to get component and show in right panel
  const showInRightPanel = useCallback((toolName: string, result: any) => {
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
      case "processPayment":
        component = (
          <div className="p-4 space-y-4">
            <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
              <p className="text-green-800 dark:text-green-200 text-sm font-medium">
                {result.message}
              </p>
            </div>
            <StripePaymentComponent
              amount={result.totalAmount}
              items={result.items}
              onPaymentSuccess={(paymentIntent) => {
                console.log('Payment successful:', paymentIntent);
              }}
              onPaymentError={(error) => {
                console.error('Payment error:', error);
              }}
            />
          </div>
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
      setRightPanelContent(component);
    }
  }, [setRightPanelContent, addItem, removeItem, getCartItemIds, handleDoneAddingToCart]);

  // Auto-display completed tool results
  useEffect(() => {
    if (toolInvocations) {
      toolInvocations.forEach((toolInvocation) => {
        const { toolName, toolCallId, state } = toolInvocation;
        
        if (state === "result" && !processedToolCalls.current.has(toolCallId)) {
          const { result } = toolInvocation;
          showInRightPanel(toolName, result);
          processedToolCalls.current.add(toolCallId);
        }
      });
    }
  }, [toolInvocations, showInRightPanel]);

  return (
    <motion.div
      className={`flex flex-row gap-4 px-4 w-full md:w-[500px] md:px-0 first-of-type:pt-20`}
      initial={{ y: 5, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
    >
      <div className="size-[24px] border rounded-sm p-1 flex flex-col justify-center items-center shrink-0 text-zinc-500">
        {role === "assistant" ? <BotIcon /> : <UserIcon />}
      </div>

      <div className="flex flex-col gap-2 w-full">
        {content && typeof content === "string" && (
          <div className="text-foreground flex flex-col gap-4">
            <Markdown>{content}</Markdown>
          </div>
        )}

        {toolInvocations && (
          <div className="flex flex-col gap-2">
            {toolInvocations.map((toolInvocation) => {
              const { toolName, toolCallId, state } = toolInvocation;

              if (state === "result") {
                const { result } = toolInvocation;

                return (
                  <div key={toolCallId}>
                    <button
                      onClick={() => showInRightPanel(toolName, result)}
                      className="px-3 py-2 bg-primary/10 text-primary rounded-lg hover:bg-primary/20 transition-colors text-sm font-medium"
                    >
                      View {toolName.replace(/([A-Z])/g, ' $1').trim()} →
                    </button>
                  </div>
                );
              } else {
                return (
                  <div key={toolCallId} className="skeleton">
                    <div className="px-3 py-2 bg-secondary rounded-lg text-sm animate-pulse">
                      Loading {toolName.replace(/([A-Z])/g, ' $1').trim()}...
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
      </div>
    </motion.div>
  );
};
