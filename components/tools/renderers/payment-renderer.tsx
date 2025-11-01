"use client";

import { useCart } from "../../../contexts/cart-context";
import StripePaymentComponent from "../../oms/stripe-payment-component";
import { ToolRendererProps } from "../types";

interface PaymentRendererProps extends ToolRendererProps {
  showInRightPanel?: (toolName: string, result: unknown) => void;
}

/**
 * Renderer for processPayment tool
 * Shows checkout preview with payment component
 */
export function PaymentRenderer({
  toolCallId,
  result,
  showInRightPanel,
}: PaymentRendererProps) {
  const { state: cartState } = useCart();

  if (!result) {
    return null;
  }

  const totalItems = cartState.items.reduce(
    (sum, item) => sum + item.quantity,
    0
  );
  const totalPrice = cartState.items.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  );

  const stripeItems = cartState.items.map((item) => ({
    id: item.id,
    name: item.name,
    price: item.price,
    quantity: item.quantity,
  }));

  return (
    <div
      key={toolCallId}
      className="bg-card border border-border rounded-lg p-4 hover:bg-card/80 transition-all duration-200 hover:shadow-md hover:border-ui-teal/50 w-fit max-w-full"
    >
      <div className="flex items-center justify-between gap-3 mb-3">
        <div className="flex items-center gap-2">
          <div className="p-1 bg-ui-teal/10 rounded">
            <div className="size-3 bg-ui-teal rounded-sm flex items-center justify-center">
              <div className="size-1.5 bg-white rounded-full"></div>
            </div>
          </div>
          <h3 className="text-foreground font-medium text-sm whitespace-nowrap">
            Checkout
          </h3>
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-foreground">
            {totalItems} items
          </span>
          <span className="text-xs text-muted-foreground">Order Total</span>
        </div>

        <div className="space-y-1">
          {cartState.items.slice(0, 2).map((item, index) => (
            <div key={index} className="flex justify-between text-xs">
              <span className="text-muted-foreground">
                {item.name} × {item.quantity}
              </span>
              <span className="text-foreground">
                ${(item.price * item.quantity).toFixed(2)}
              </span>
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
            <span className="text-lg font-bold text-foreground">
              ${totalPrice.toFixed(2)}
            </span>
          </div>
        </div>

        <div className="pt-2">
          <button
            onClick={() => {
              console.log("🛒 Opening cart management in sidebar");
              showInRightPanel?.("viewCart", {
                summary: {
                  totalItems,
                  totalPrice,
                  totalQuantity: totalItems,
                },
                cartData: {
                  items: cartState.items,
                  totalItems,
                  totalPrice,
                  lastUpdated: new Date(),
                },
              });
            }}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 text-xs bg-muted hover:bg-muted/80 text-foreground rounded-md transition-colors font-medium"
          >
            Edit Order
          </button>
        </div>

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
              console.log("Payment successful:", paymentIntent);
            }}
            onPaymentError={(error) => {
              console.error("Payment error:", error);
            }}
          />
        </div>
      </div>
    </div>
  );
}

