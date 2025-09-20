"use client";

import { Attachment, ToolInvocation } from "ai";
import { motion } from "framer-motion";
import { ReactNode, useEffect, useRef, useCallback } from "react";

import { BotIcon, UserIcon } from "./icons";
import { Markdown } from "./markdown";
import { PreviewAttachment } from "./preview-attachment";
import { Weather } from "./weather";
import { useSplitScreen } from "../../contexts/SplitScreenProvider";
import { AuthorizePayment } from "../flights/authorize-payment";
import { DisplayBoardingPass } from "../flights/boarding-pass";
import { CreateReservation } from "../flights/create-reservation";
import { FlightStatus } from "../flights/flight-status";
import { ListFlights } from "../flights/list-flights";
import { SelectSeats } from "../flights/select-seats";
import { VerifyPayment } from "../flights/verify-payment";
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
  const processedToolCalls = useRef<Set<string>>(new Set());

  // Function to get component and show in right panel
  const showInRightPanel = useCallback((toolName: string, result: any) => {
    let component = null;

    switch (toolName) {
      case "getWeather":
        component = <Weather weatherAtLocation={result} />;
        break;
      case "displayFlightStatus":
        component = <FlightStatus flightStatus={result} />;
        break;
      case "searchFlights":
        component = <ListFlights chatId={chatId} results={result} />;
        break;
      case "selectSeats":
        component = <SelectSeats chatId={chatId} availability={result} />;
        break;
      case "createReservation":
        component = Object.keys(result).includes("error") ? null : (
          <CreateReservation reservation={result} />
        );
        break;
      case "authorizePayment":
        component = <AuthorizePayment intent={result} />;
        break;
      case "displayBoardingPass":
        component = <DisplayBoardingPass boardingPass={result} />;
        break;
      case "verifyPayment":
        component = <VerifyPayment result={result} />;
        break;
      case "browsePublishers":
        component = <PublishersResults results={result} />;
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
  }, [setRightPanelContent, chatId]);

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
