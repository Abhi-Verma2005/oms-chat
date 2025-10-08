import hljs from 'highlight.js';
import Link from "next/link";
import React, { memo, useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
// Import highlight.js theme
import 'highlight.js/styles/github-dark.css';

import { MermaidChart } from './mermaid-chart';

const NonMemoizedMarkdown = ({ children }: { children: string }) => {
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  useEffect(() => {
    hljs.configure({
      ignoreUnescapedHTML: true,
    });
  }, []);

  const copyToClipboard = async (text: string, codeId: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedCode(codeId);
      setTimeout(() => setCopiedCode(null), 2000);
    } catch (err) {
      console.error('Failed to copy text: ', err);
    }
  };

  const components = {
    code: ({ node, inline, className, children, ...props }: any) => {
      const match = /language-(\w+)/.exec(className || "");
      const language = match ? match[1] : '';
      const codeString = String(children).replace(/\n$/, '');
      const codeId = `code-${Math.random().toString(36).substr(2, 9)}`;
      
      // Handle Mermaid diagrams
      if (!inline && language === 'mermaid') {
        return <MermaidChart code={codeString} />;
      }
      
      if (!inline && match) {
        let highlightedCode;
        try {
          highlightedCode = hljs.highlight(codeString, { language }).value;
        } catch (error) {
          highlightedCode = hljs.highlightAuto(codeString).value;
        }
        return (
          <div className="relative my-6 group">
            {/* Header */}
            <div className="flex items-center justify-between bg-card border-b-2 border-primary px-4 py-2 rounded-t-lg">
              <span className="text-muted-foreground text-xs font-mono tracking-widest">
                {language.toUpperCase()}
              </span>
              <div className="flex space-x-1">
                <div className="size-2 rounded-full bg-destructive" />
                <div className="size-2 rounded-full bg-yellow-400" />
                <div className="size-2 rounded-full bg-green-500" />
              </div>
            </div>
            {/* Code block */}
            <pre className="hljs !mt-0 !rounded-t-none !rounded-b-lg !border-t-0 border border-border bg-card overflow-x-auto">
              <code
                className={`hljs language-${language} block p-4 text-sm leading-relaxed`}
                dangerouslySetInnerHTML={{ __html: highlightedCode }}
                style={{
                  fontFamily: 'geist-mono, "JetBrains Mono", "Fira Code", "SF Mono", Monaco, Consolas, monospace',
                  fontSize: '14px',
                  lineHeight: '1.6',
                }}
              />
            </pre>
            {/* Copy button */}
            <button 
              className="absolute top-2 right-2 p-2 bg-primary/10 hover:bg-primary/20 text-primary rounded-md opacity-0 group-hover:opacity-100 transition-opacity duration-200"
              onClick={() => copyToClipboard(codeString, codeId)}
              title="Copy code"
            >
              {copiedCode === codeId ? (
                <svg className="size-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              ) : (
                <svg className="size-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
              )}
            </button>
          </div>
        );
      } else {
        return (
          <code
            className={`${className} text-sm bg-muted py-0.5 px-1 rounded-md font-mono`}
            {...props}
          >
            {children}
          </code>
        );
      }
    },
    // Headings
    h1: ({ children, ...props }: any) => (
      <h1 className="text-3xl font-bold mt-6 mb-4 text-foreground border-b border-border pb-2" {...props}>
        {children}
      </h1>
    ),
    h2: ({ children, ...props }: any) => (
      <h2 className="text-2xl font-semibold mt-5 mb-3 text-foreground" {...props}>
        {children}
      </h2>
    ),
    h3: ({ children, ...props }: any) => (
      <h3 className="text-xl font-medium mt-4 mb-2 text-foreground" {...props}>
        {children}
      </h3>
    ),
    h4: ({ children, ...props }: any) => (
      <h4 className="text-lg font-medium mt-3 mb-2 text-foreground" {...props}>
        {children}
      </h4>
    ),
    h5: ({ children, ...props }: any) => (
      <h5 className="text-base font-medium mt-3 mb-2 text-foreground" {...props}>
        {children}
      </h5>
    ),
    h6: ({ children, ...props }: any) => (
      <h6 className="text-sm font-medium mt-3 mb-2 text-muted-foreground" {...props}>
        {children}
      </h6>
    ),
    // Lists
    ol: ({ node, children, ...props }: any) => (
      <ol className="list-decimal list-outside ml-6 space-y-1" {...props}>
        {children}
      </ol>
    ),
    ul: ({ node, children, ...props }: any) => (
      <ul className="list-disc list-outside ml-6 space-y-1" {...props}>
        {children}
      </ul>
    ),
    li: ({ node, children, ...props }: any) => (
      <li className="text-foreground" {...props}>
        {children}
      </li>
    ),
    // Text formatting
    strong: ({ children, ...props }: any) => (
      <strong className="font-semibold text-foreground" {...props}>
        {children}
      </strong>
    ),
    em: ({ children, ...props }: any) => (
      <em className="italic text-foreground" {...props}>
        {children}
      </em>
    ),
    // Links
    a: ({ node, children, ...props }: any) => (
      <Link
        className="text-primary hover:text-primary/80 hover:underline transition-colors"
        target="_blank"
        rel="noreferrer"
        {...props}
      >
        {children}
      </Link>
    ),
    // Blockquotes
    blockquote: ({ children, ...props }: any) => (
      <blockquote 
        className="border-l-4 border-primary pl-4 py-2 my-4 bg-muted/50 rounded-r-lg italic text-muted-foreground" 
        {...props}
      >
        {children}
      </blockquote>
    ),
    // Tables
    table: ({ children, ...props }: any) => (
      <div className="overflow-x-auto my-4">
        <table className="min-w-full border-collapse border border-border text-sm text-left text-foreground" {...props}>
          {children}
        </table>
      </div>
    ),
    thead: ({ children, ...props }: any) => (
      <thead className="bg-muted" {...props}>
        {children}
      </thead>
    ),
    tbody: ({ children, ...props }: any) => (
      <tbody className="bg-card divide-y divide-border" {...props}>
        {children}
      </tbody>
    ),
    tr: ({ children, ...props }: any) => (
      <tr className="hover:bg-muted/50 transition-colors" {...props}>
        {children}
      </tr>
    ),
    th: ({ children, ...props }: any) => (
      <th className="px-4 py-3 border border-border font-medium text-foreground" {...props}>
        {children}
      </th>
    ),
    td: ({ children, ...props }: any) => (
      <td className="px-4 py-3 border border-border text-foreground" {...props}>
        {children}
      </td>
    ),
    // Horizontal rule
    hr: ({ ...props }: any) => (
      <hr className="my-6 border-border" {...props} />
    ),
    // Paragraphs
    p: ({ children, ...props }: any) => (
      <p className="mb-4 text-foreground leading-relaxed" {...props}>
        {children}
      </p>
    ),
  };

  return (
    <div className="prose prose-slate dark:prose-invert max-w-none">
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
        {children}
      </ReactMarkdown>
    </div>
  );
};

export const Markdown = memo(
  NonMemoizedMarkdown,
  (prevProps, nextProps) => prevProps.children === nextProps.children,
);