import { Metadata } from "next";
import { Toaster } from "sonner";

import { Providers } from "../components/providers";
import { auth } from "./(auth)/auth";

import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://oms-chat.vercel.app"),
  title: "OMS Chat Assistant",
  description: "AI-powered publisher discovery and management assistant built with Next.js and the AI SDK.",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await auth();

  return (
    <html lang="en">
      <body className="antialiased">
        <Providers>
          <Toaster position="top-center" />
          {children}
        </Providers>
      </body>
    </html>
  );
}
