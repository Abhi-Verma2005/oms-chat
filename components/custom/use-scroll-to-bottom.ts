import { useEffect, useRef, RefObject, useCallback } from "react";

export function useScrollToBottom<T extends HTMLElement>(
  shouldAutoScroll: boolean = true
): [RefObject<T>, RefObject<T>] {
  const containerRef = useRef<T>(null);
  const endRef = useRef<T>(null);

  useEffect(() => {
    const container = containerRef.current;
    const end = endRef.current;

    if (container && end && shouldAutoScroll) {
      const observer = new MutationObserver(() => {
        end.scrollIntoView({ behavior: "instant", block: "end" });
      });

      observer.observe(container, {
        childList: true,
        subtree: true,
        attributes: true,
        characterData: true,
      });

      return () => observer.disconnect();
    }
  }, [shouldAutoScroll]);

  return [containerRef, endRef];
}

/**
 * Hook for Claude AI-style scrolling behavior:
 * - Scrolls the user's latest message to the TOP of the viewport
 * - Maintains scroll position during AI streaming
 * - Only applies when chat content is longer than viewport
 */
export function useClaudeScroll<T extends HTMLElement>(
  shouldAutoScroll: boolean = true
): [RefObject<T>, (elementId?: string) => void] {
  const containerRef = useRef<T>(null);

  const scrollToMessage = useCallback((elementId?: string) => {
    if (!shouldAutoScroll || !containerRef.current) return;
    
    const container = containerRef.current;
    
    // If elementId is provided, scroll that specific element to top
    if (elementId) {
      const element = document.getElementById(elementId);
      if (element && container) {
        // Calculate the position relative to the container
        const containerRect = container.getBoundingClientRect();
        const elementRect = element.getBoundingClientRect();
        
        // Calculate how much to scroll to bring element to the top of container
        const scrollTop = container.scrollTop + (elementRect.top - containerRect.top);
        
        // Scroll the container to position the element at the very top
        container.scrollTo({
          top: scrollTop,
          behavior: 'smooth'
        });
        return;
      }
    }
  }, [shouldAutoScroll]);

  return [containerRef, scrollToMessage];
}

/**
 * Enhanced hook that adds auto-scroll during streaming
 * Watches for content changes and maintains viewport position
 */
export function useEnhancedClaudeScroll<T extends HTMLElement>(
  shouldAutoScroll: boolean = true,
  isStreaming: boolean = false,
  lastMessageId?: string
): [RefObject<T>, (elementId?: string) => void] {
  const containerRef = useRef<T>(null);

  const scrollToMessage = useCallback((elementId?: string) => {
    if (!shouldAutoScroll || !containerRef.current) return;
    
    const container = containerRef.current;
    
    // If elementId is provided, scroll that specific element to top
    if (elementId) {
      const element = document.getElementById(elementId);
      if (element && container) {
        // Calculate the position relative to the container
        const containerRect = container.getBoundingClientRect();
        const elementRect = element.getBoundingClientRect();
        
        // Calculate how much to scroll to bring element to the top of container
        const scrollTop = container.scrollTop + (elementRect.top - containerRect.top);
        
        // Scroll the container to position the element at the very top
        container.scrollTo({
          top: scrollTop,
          behavior: 'smooth'
        });
        return;
      }
    }
  }, [shouldAutoScroll]);

  // Auto-scroll during streaming to keep the assistant's response visible
  useEffect(() => {
    if (!shouldAutoScroll || !isStreaming || !lastMessageId) return;
    
    const element = document.getElementById(`msg-${lastMessageId}`);
    if (!element) return;

    // Create an observer to watch for content changes during streaming
    const observer = new MutationObserver(() => {
      // Only auto-scroll if user hasn't manually scrolled away
      const container = containerRef.current;
      if (!container) return;
      
      // Check if user is near the bottom (within 100px)
      const { scrollTop, scrollHeight, clientHeight } = container;
      const distanceFromBottom = scrollHeight - scrollTop - clientHeight;
      
      // Only auto-scroll if user is staying near the active content
      if (distanceFromBottom < 300) {
        // Use a small delay to debounce rapid mutations
        setTimeout(() => {
          const rect = element.getBoundingClientRect();
          const containerRect = container.getBoundingClientRect();
          
          // Check if element is outside viewport or too far down
          if (rect.bottom > containerRect.bottom - 50) {
            element.scrollIntoView({ 
              behavior: 'instant', 
              block: 'nearest',
              inline: 'nearest'
            });
          }
        }, 50);
      }
    });

    observer.observe(element, {
      childList: true,
      subtree: true,
      characterData: true,
    });

    return () => observer.disconnect();
  }, [shouldAutoScroll, isStreaming, lastMessageId]);

  return [containerRef, scrollToMessage];
}
