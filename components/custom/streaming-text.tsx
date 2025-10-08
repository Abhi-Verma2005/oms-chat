"use client";

import { memo, useEffect, useRef, useState, useCallback } from "react";

interface StreamingTextProps {
  content: string;
  isStreaming?: boolean;
  className?: string;
}

const StreamingTextComponent = ({ content, isStreaming = false, className = "" }: StreamingTextProps) => {
  const [isAnimating, setIsAnimating] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout>();
  const lastContentRef = useRef(content);

  useEffect(() => {
    if (content !== lastContentRef.current) {
      lastContentRef.current = content;
      
      if (isStreaming) {
        // During streaming, show a subtle animation
        setIsAnimating(true);
        
        // Clear any existing timeout
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
        }
        
        // Stop animation after a short delay
        timeoutRef.current = setTimeout(() => {
          setIsAnimating(false);
        }, 200);
      } else {
        // When streaming is complete, stop animation
        setIsAnimating(false);
      }
    }
  }, [content, isStreaming]);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return (
    <div className={`relative ${className}`}>
      <div 
        className={`streaming-text ${
          isAnimating ? 'animate-[text-stream_0.15s_ease-out]' : ''
        }`}
      >
        {content}
      </div>
      
      {/* Typing cursor - only show during streaming */}
      {isStreaming && (
        <span 
          className="inline-block w-0.5 h-5 bg-primary ml-0.5 animate-[typing-cursor-optimized_1s_ease-in-out_infinite]"
          aria-hidden="true"
        />
      )}
    </div>
  );
};

// Memoize the component to prevent unnecessary re-renders
export const StreamingText = memo(
  StreamingTextComponent,
  (prevProps, nextProps) => {
    return (
      prevProps.content === nextProps.content &&
      prevProps.isStreaming === nextProps.isStreaming &&
      prevProps.className === nextProps.className
    );
  }
);
