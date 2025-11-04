import { Metadata } from "next";
import { Toaster } from "sonner";

import { Providers } from "../components/providers";
import { auth } from "./(auth)/auth";

import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://oms-chat.vercel.app"),
  title: {
    default: "OMS Chat Assistant",
    template: "%s | OMS Chat",
  },
  description:
    "Chat with an AI assistant to discover publishers, set backlink filters, and checkout securely.",
  openGraph: {
    title: "OMS Chat Assistant",
    description:
      "AI assistant for publisher discovery and backlink orders. Plan, filter, and pay.",
    url: "https://oms-chat.vercel.app",
    siteName: "OMS Chat",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "OMS Chat Assistant",
    description:
      "Discover publishers, apply SEO filters, and complete payments with AI.",
  },
  alternates: {
    canonical: "https://oms-chat.vercel.app/",
  },
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
