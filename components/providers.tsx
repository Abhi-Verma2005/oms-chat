"use client";

import { SessionProvider } from "next-auth/react";

import { ThemeProvider } from "./custom/theme-provider";
import { CartProvider } from "../contexts/cart-context";
import { DocumentsProvider } from "../contexts/DocumentsProvider";
import { SplitScreenProvider } from "../contexts/SplitScreenProvider";
import { UserInfoProvider } from "../contexts/UserInfoProvider";
import { WebSocketProvider } from "../contexts/websocket-context";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <ThemeProvider
        attribute="class"
        defaultTheme="dark"
        enableSystem={false}
        disableTransitionOnChange={false}
      >
        <WebSocketProvider>
          <SplitScreenProvider>
            <UserInfoProvider>
              <DocumentsProvider>
                <CartProvider>
                  {children}
                </CartProvider>
              </DocumentsProvider>
            </UserInfoProvider>
          </SplitScreenProvider>
        </WebSocketProvider>
      </ThemeProvider>
    </SessionProvider>
  );
}
