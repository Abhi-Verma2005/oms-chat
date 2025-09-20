import { Metadata } from "next";
import { Toaster } from "sonner";

import { ThemeProvider } from "../components/custom/theme-provider";
import { SplitScreenProvider } from "../contexts/SplitScreenProvider";
import { auth } from "@/app/(auth)/auth";

import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://gemini.vercel.ai"),
  title: "Next.js Gemini Chatbot",
  description: "Next.js chatbot template using the AI SDK and Gemini.",
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
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem={false}
          disableTransitionOnChange={false}
        >
          <SplitScreenProvider>
            <Toaster position="top-center" />
            {children}
          </SplitScreenProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
