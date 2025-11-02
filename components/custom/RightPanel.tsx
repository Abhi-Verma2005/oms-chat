"use client";

import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";

import { useSplitScreen } from "../../contexts/SplitScreenProvider";

export function RightPanel() {
  const { isRightPanelOpen, rightPanelContent, closeRightPanel } = useSplitScreen();

  return (
    <AnimatePresence>
      {isRightPanelOpen && (
        <motion.div
          className="flex flex-col border-l shadow-lg h-full"
          style={{ 
            backgroundColor: "#121212",
            borderColor: "#333333"
          }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          {/* Header */}
          <div 
            className="flex items-center justify-between p-3 shrink-0"
            style={{ backgroundColor: "#1E1E1E", borderBottom: "1px solid #333333" }}
          >
            <h2 className="text-sm font-medium" style={{ color: "#E0E0E0" }}>
              Publishers Results
            </h2>
            <button
              onClick={closeRightPanel}
              className="p-2 rounded-full transition-all duration-200 hover:scale-110"
              style={{ 
                backgroundColor: "#569CD6", 
                color: "#FFFFFF"
              }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = "#00C0C0"}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "#569CD6"}
            >
              <X className="size-4" />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto">
            {rightPanelContent}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
