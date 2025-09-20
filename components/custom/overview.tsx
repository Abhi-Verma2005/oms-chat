import { motion } from "framer-motion";
import Link from "next/link";

import { LogoGoogle, MessageIcon, VercelIcon } from "./icons";

export const Overview = () => {
  return (
    <motion.div
      key="overview"
      className="max-w-[500px] mt-20 mx-4 md:mx-0"
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.98 }}
      transition={{ delay: 0.5 }}
    >
      <div className="border border-border bg-card rounded-2xl p-6 flex flex-col gap-4 text-muted-foreground text-sm">
        <p className="flex flex-row justify-center gap-4 items-center text-foreground">
          <VercelIcon />
          <span>+</span>
          <MessageIcon />
        </p>
        <p>
          This is an OMS Chat Assistant powered by the Google Gemini
          model built with Next.js and the AI SDK by Vercel. It uses the{" "}
          <code className="rounded-sm bg-secondary px-1.5 py-0.5 text-secondary-foreground">
            streamText
          </code>{" "}
          function in the server and the{" "}
          <code className="rounded-sm bg-secondary px-1.5 py-0.5 text-secondary-foreground">
            useChat
          </code>{" "}
          hook on the client to create a seamless chat experience.
        </p>
        <p>
          {" "}
          You can learn more about the AI SDK by visiting the{" "}
          <Link
            className="text-primary hover:text-primary/80"
            href="https://sdk.vercel.ai/docs"
            target="_blank"
          >
            Docs
          </Link>
          .
        </p>
      </div>
    </motion.div>
  );
};
