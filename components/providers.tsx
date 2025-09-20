"use client";

import { SessionProvider } from "next-auth/react";

import { ThemeProvider } from "./custom/theme-provider";
import { CartProvider } from "../contexts/cart-context";
import { SplitScreenProvider } from "../contexts/SplitScreenProvider";
import { UserInfoProvider } from "../contexts/UserInfoProvider";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <ThemeProvider
        attribute="class"
        defaultTheme="dark"
        enableSystem={false}
        disableTransitionOnChange={false}
      >
        <SplitScreenProvider>
          <UserInfoProvider>
            <CartProvider>
              {children}
            </CartProvider>
          </UserInfoProvider>
        </SplitScreenProvider>
      </ThemeProvider>
    </SessionProvider>
  );
}
