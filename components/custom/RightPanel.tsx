"use client";

import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";

import { useSplitScreen } from "../../contexts/SplitScreenProvider";

export function RightPanel() {
  const { isRightPanelOpen, rightPanelContent, rightPanelWidth, closeRightPanel } = useSplitScreen();

  return (
    <AnimatePresence>
      {isRightPanelOpen && (
        <motion.div
          className="flex flex-col bg-card border-l border-border shadow-lg h-full rounded-l-lg"
          style={{ width: `${rightPanelWidth}px` }}
          initial={{ x: "100%" }}
          animate={{ x: 0 }}
          exit={{ x: "100%" }}
          transition={{ type: "spring", damping: 30, stiffness: 300 }}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-3 shrink-0 bg-card">
            <h2 className="text-sm font-medium text-gray-600 dark:text-gray-300">
              Publishers Results
            </h2>
            <button
              onClick={closeRightPanel}
              className="p-2 bg-purple-500 hover:bg-purple-600 text-white rounded-full transition-all duration-200 hover:scale-110 shadow-lg hover:shadow-purple-500/25"
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
