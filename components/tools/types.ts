/**
 * Type definitions for the tool rendering system
 */

export interface ToolRendererProps {
  /** Tool invocation ID */
  toolCallId: string;
  /** Tool name */
  toolName: string;
  /** Whether the tool is currently loading */
  loading?: boolean;
  /** Tool result data (when available) */
  result?: unknown;
  /** Callback to open tool in right panel */
  onExpand?: (toolName: string, result: unknown) => void;
  /** Additional props passed to specific renderers */
  [key: string]: unknown;
}

export interface ToolSummaryProps {
  /** Title of the tool summary */
  title: string;
  /** Icon component or element */
  icon?: React.ReactNode;
  /** Whether it's loading */
  loading?: boolean;
  /** Whether it's clickable/expandable */
  clickable?: boolean;
  /** Children content */
  children: React.ReactNode;
  /** Click handler */
  onClick?: () => void;
}

