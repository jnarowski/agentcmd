/**
 * Markdown preview component for full-page document display
 * Adapted from TextBlock for spec file viewing
 */

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { CodeBlock } from "@/client/pages/projects/sessions/components/CodeBlock";

interface MarkdownPreviewProps {
  content: string;
  className?: string;
}

export function MarkdownPreview({
  content,
  className = "",
}: MarkdownPreviewProps) {
  const safeContent = typeof content === "string" ? content : "";

  return (
    <div className={`h-full overflow-auto bg-background ${className}`}>
      <div className="max-w-4xl mx-auto pl-4 pr-8 py-6">
        <div className="prose prose-base dark:prose-invert max-w-none prose-hr:my-4 prose-p:my-3 prose-ul:my-3 prose-ol:my-3 prose-li:my-1 prose-headings:mb-3 prose-headings:mt-4 prose-*:first:mt-0 prose-pre:my-4 prose-pre:bg-transparent prose-pre:p-0 break-words">
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={{
              // Custom heading renderers - larger for document display
              h1({ children, ...props }) {
                return (
                  <h1
                    className="text-2xl! font-bold! mb-3! mt-4!"
                    {...props}
                  >
                    {children}
                  </h1>
                );
              },
              h2({ children, ...props }) {
                return (
                  <h2
                    className="text-xl! font-bold! mb-3! mt-4!"
                    {...props}
                  >
                    {children}
                  </h2>
                );
              },
              h3({ children, ...props }) {
                return (
                  <h3 className="text-lg! font-semibold! mb-2! mt-3!" {...props}>
                    {children}
                  </h3>
                );
              },
              h4({ children, ...props }) {
                return (
                  <h4 className="text-base! font-semibold! mb-2! mt-3!" {...props}>
                    {children}
                  </h4>
                );
              },
              h5({ children, ...props }) {
                return (
                  <h5 className="text-base! font-medium! mb-2! mt-3!" {...props}>
                    {children}
                  </h5>
                );
              },
              h6({ children, ...props }) {
                return (
                  <h6 className="text-base! font-medium! mb-2! mt-3!" {...props}>
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
                      className="px-1.5 py-0.5 rounded bg-muted text-blue-600 dark:text-blue-400 font-mono text-sm font-normal"
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
                  <CodeBlock code={code} language={language} showHeader={true} />
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
          >
            {safeContent}
          </ReactMarkdown>
        </div>
      </div>
    </div>
  );
}
