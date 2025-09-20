"use client";

import { createContext, useContext, useState, ReactNode } from 'react';

interface SplitScreenContextType {
  isRightPanelOpen: boolean;
  rightPanelContent: ReactNode | null;
  rightPanelWidth: number;
  leftPanelWidth: number;
  setRightPanelContent: (content: ReactNode) => void;
  closeRightPanel: () => void;
  setRightPanelWidth: (width: number) => void;
  setLeftPanelWidth: (width: number) => void;
  toggleRightPanel: () => void;
}

const SplitScreenContext = createContext<SplitScreenContextType | undefined>(undefined);

export function SplitScreenProvider({ children }: { children: ReactNode }) {
  const [isRightPanelOpen, setIsRightPanelOpen] = useState(false);
  const [rightPanelContent, setRightPanelContent] = useState<ReactNode | null>(null);
  const [rightPanelWidth, setRightPanelWidth] = useState(500); // Default width in pixels
  const [leftPanelWidth, setLeftPanelWidth] = useState(0); // Will be calculated dynamically

  const handleSetRightPanelContent = (newContent: ReactNode) => {
    setRightPanelContent(newContent);
    setIsRightPanelOpen(true);
  };

  const closeRightPanel = () => {
    setIsRightPanelOpen(false);
    setRightPanelContent(null);
  };

  const toggleRightPanel = () => {
    if (isRightPanelOpen) {
      closeRightPanel();
    } else {
      setIsRightPanelOpen(true);
    }
  };

  const handleSetRightPanelWidth = (width: number) => {
    // Constrain width between 300px and 60% of screen width
    const maxWidth = window.innerWidth * 0.6;
    const constrainedWidth = Math.max(300, Math.min(width, maxWidth));
    setRightPanelWidth(constrainedWidth);
  };

  const handleSetLeftPanelWidth = (width: number) => {
    setLeftPanelWidth(width);
  };

  return (
    <SplitScreenContext.Provider value={{
      isRightPanelOpen,
      rightPanelContent,
      rightPanelWidth,
      leftPanelWidth,
      setRightPanelContent: handleSetRightPanelContent,
      closeRightPanel,
      setRightPanelWidth: handleSetRightPanelWidth,
      setLeftPanelWidth: handleSetLeftPanelWidth,
      toggleRightPanel
    }}>
      {children}
    </SplitScreenContext.Provider>
  );
}

export function useSplitScreen() {
  const context = useContext(SplitScreenContext);
  if (context === undefined) {
    throw new Error('useSplitScreen must be used within a SplitScreenProvider');
  }
  return context;
}
