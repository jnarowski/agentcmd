/**
 * Text content block with Markdown rendering
 */

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { CodeBlock } from "@/client/pages/projects/sessions/components/CodeBlock";

interface TextBlockProps {
  text: string;
  className?: string;
}

export function TextBlock({ text, className = "" }: TextBlockProps) {
  // SAFETY: Ensure text is a string
  const safeText =
    typeof text === "string" ? text : JSON.stringify(text, null, 2);

  // DEBUG: Log empty or whitespace-only text blocks
  if (!text || (typeof text === 'string' && text.trim() === '')) {
    console.warn('[TextBlock] RENDERING EMPTY TEXT BLOCK:', {
      text,
      type: typeof text,
      length: typeof text === 'string' ? text.length : 0,
      safeText,
    });
  }

  return (
    <div className={`flex gap-2.5 ${className}`}>
      {/* Gray dot indicator */}
      <div className="flex items-center h-7 md:h-6">
        <div className="h-2 w-2 rounded-full bg-gray-500 shrink-0" />
      </div>

      {/* Text content */}
      <div className="prose prose-base md:prose-sm dark:prose-invert max-w-none prose-hr:my-2 prose-p:my-2 prose-ul:my-2 prose-ol:my-2 prose-li:my-0.5 prose-headings:mb-2 prose-headings:mt-3 prose-*:first:mt-0 prose-p:last:mb-0 prose-pre:my-0 prose-pre:bg-transparent prose-pre:p-0 flex-1 min-w-0 overflow-hidden break-words">
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          children={safeText}
          components={{
            // Custom heading renderers - compact and minimal
            h1({ children, ...props }) {
              return (
                <h1
                  className="text-base! font-semibold! mb-2! mt-3!"
                  {...props}
                >
                  {children}
                </h1>
              );
            },
            h2({ children, ...props }) {
              return (
                <h2
                  className="text-base! font-semibold! mb-1.5! mt-3!"
                  {...props}
                >
                  {children}
                </h2>
              );
            },
            h3({ children, ...props }) {
              return (
                <h3 className="text-sm! font-semibold! mb-1! mt-2!" {...props}>
                  {children}
                </h3>
              );
            },
            h4({ children, ...props }) {
              return (
                <h4 className="text-sm! font-medium! mb-1! mt-2!" {...props}>
                  {children}
                </h4>
              );
            },
            h5({ children, ...props }) {
              return (
                <h5 className="text-sm! font-medium! mb-1! mt-2!" {...props}>
                  {children}
                </h5>
              );
            },
            h6({ children, ...props }) {
              return (
                <h6 className="text-sm! font-medium! mb-1! mt-2!" {...props}>
                  {children}
                </h6>
              );
            },
            // Custom code rendering with syntax highlighting
            code({ className, children, ...props }) {
              const match = /language-(\w+)/.exec(className || "");
              const isInline = !match;

              if (isInline) {
                return (
                  <code
                    className="px-1.5 py-0.5 rounded bg-muted text-blue-600 dark:text-blue-400 font-mono text-sm md:text-xs font-normal"
                    {...props}
                  >
                    {children}
                  </code>
                );
              }

              // Block code with syntax highlighting
              const language = match[1] || "text";
              const code = String(children).replace(/\n$/, "");

              return (
                <CodeBlock code={code} language={language} showHeader={false} />
              );
            },
            // Custom link rendering
            a({ href, children, ...props }) {
              return (
                <a
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline"
                  {...props}
                >
                  {children}
                </a>
              );
            },
            // Custom blockquote rendering
            blockquote({ children, ...props }) {
              return (
                <blockquote
                  className="border-l-4 border-muted-foreground/20 pl-4 italic text-muted-foreground"
                  {...props}
                >
                  {children}
                </blockquote>
              );
            },
          }}
        />
      </div>
    </div>
  );
}
