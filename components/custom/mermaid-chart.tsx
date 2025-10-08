"use client";

import { useEffect, useRef, useState } from "react";
import mermaid from "mermaid";

interface MermaidChartProps {
  code: string;
}

export const MermaidChart = ({ code }: MermaidChartProps) => {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const chartRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const renderChart = async () => {
      if (!chartRef.current) return;

      try {
        setIsLoading(true);
        setError(null);

        // Clear previous content
        chartRef.current.innerHTML = "";

        // Configure Mermaid
        mermaid.initialize({
          startOnLoad: false,
          theme: "dark",
          themeVariables: {
            primaryColor: "#00BCD4", // Teal accent from screenshot
            primaryTextColor: "#FFFFFF", // White text
            primaryBorderColor: "#00BCD4", // Teal border
            lineColor: "#A0A0A0", // Light gray from screenshot
            secondaryColor: "#1E1E1E", // Main background
            tertiaryColor: "#2D2D2D", // Card background
            background: "#1E1E1E", // Main background
            mainBkg: "#1E1E1E", // Main background
            secondBkg: "#2D2D2D", // Card background
            tertiaryBkg: "#2D2D2D", // Card background
          },
          flowchart: {
            nodeSpacing: 50,
            rankSpacing: 50,
            curve: "basis",
          },
          sequence: {
            diagramMarginX: 50,
            diagramMarginY: 10,
            actorMargin: 50,
            width: 150,
            height: 65,
            boxMargin: 10,
            boxTextMargin: 5,
            noteMargin: 10,
            messageMargin: 35,
            mirrorActors: true,
            bottomMarginAdj: 1,
            useMaxWidth: true,
            rightAngles: false,
            showSequenceNumbers: false,
          },
          gantt: {
            titleTopMargin: 25,
            barHeight: 20,
            barGap: 4,
            topPadding: 50,
            leftPadding: 75,
            gridLineStartPadding: 35,
            fontSize: 11,
            fontFamily: '"Open Sans", sans-serif',
            sectionFontSize: 24,
            sectionFontFamily: '"Open Sans", sans-serif',
            numberSectionStyles: 4,
          },
        });

        // Generate unique ID for this chart
        const id = `mermaid-${Math.random().toString(36).substr(2, 9)}`;

        // Render the chart
        const { svg } = await mermaid.render(id, code);
        
        if (chartRef.current) {
          chartRef.current.innerHTML = svg;
        }
      } catch (err) {
        console.error("Mermaid rendering error:", err);
        setError(err instanceof Error ? err.message : "Failed to render diagram");
      } finally {
        setIsLoading(false);
      }
    };

    renderChart();
  }, [code]);

  if (error) {
    return (
      <div className="my-4 p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
        <div className="flex items-center gap-2 text-destructive">
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"
            />
          </svg>
          <span className="text-sm font-medium">Diagram Error</span>
        </div>
        <p className="text-sm text-muted-foreground mt-1">{error}</p>
        <details className="mt-2">
          <summary className="text-xs text-muted-foreground cursor-pointer hover:text-foreground">
            Show code
          </summary>
          <pre className="mt-2 p-2 bg-muted rounded text-xs overflow-x-auto">
            <code>{code}</code>
          </pre>
        </details>
      </div>
    );
  }

  return (
    <div className="my-6">
      {isLoading && (
        <div className="flex items-center justify-center p-8 bg-muted/50 rounded-lg">
          <div className="flex items-center gap-2 text-muted-foreground">
            <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            <span className="text-sm">Rendering diagram...</span>
          </div>
        </div>
      )}
      <div
        ref={chartRef}
        className={`mermaid-container ${isLoading ? "hidden" : ""}`}
        style={{ minHeight: isLoading ? "100px" : "auto" }}
      />
    </div>
  );
};


