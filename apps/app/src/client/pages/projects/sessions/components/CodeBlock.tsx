/**
 * Code block with syntax highlighting, copy button, and collapse support
 */

import { useState } from 'react';
import { Copy, Check, ChevronDown, ChevronRight } from 'lucide-react';
import { Button } from "@/client/components/ui/button";
import { Badge } from "@/client/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/client/components/ui/collapsible";
import { SyntaxHighlighter } from "@/client/utils/syntaxHighlighter";
import { getLanguageDisplayName } from "@/client/utils/getLanguageFromPath";
import { useCodeBlockTheme } from "@/client/utils/codeBlockTheme";
import { useCopy } from "@/client/hooks/useCopy";

interface CodeBlockProps {
  code: string;
  language: string;
  showLineNumbers?: boolean;
  collapsedByDefault?: boolean;
  showHeader?: boolean;
  className?: string;
}

const MAX_LINES_BEFORE_COLLAPSE = 20;

export function CodeBlock({
  code,
  language,
  showLineNumbers = false,
  collapsedByDefault = false,
  showHeader = true,
  className = ''
}: CodeBlockProps) {
  const { copied, copy } = useCopy();
  const { isDark } = useCodeBlockTheme();
  const lineCount = code.split('\n').length;
  const shouldCollapse = collapsedByDefault && lineCount > MAX_LINES_BEFORE_COLLAPSE;
  const [isOpen, setIsOpen] = useState(!shouldCollapse);

  const content = (
    <div className={`rounded-lg border overflow-hidden ${className}`}>
      {/* Header */}
      {showHeader && (
        <div className="flex items-center justify-between px-4 py-2 border-b bg-muted/20">
          <div className="flex items-center gap-2">
            {shouldCollapse && (
              <CollapsibleTrigger asChild>
                <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                  {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                </Button>
              </CollapsibleTrigger>
            )}
            <Badge variant="secondary" className="text-xs font-mono">
              {getLanguageDisplayName(language)}
            </Badge>
            {lineCount > 1 && (
              <span className="text-xs text-muted-foreground">
                {lineCount} lines
              </span>
            )}
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-xs"
            onClick={() => copy(code)}
          >
            {copied ? (
              <>
                <Check className="h-3 w-3 mr-1" />
                Copied
              </>
            ) : (
              <>
                <Copy className="h-3 w-3 mr-1" />
                Copy
              </>
            )}
          </Button>
        </div>
      )}

      {/* Code content */}
      <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
        <SyntaxHighlighter
          key={`${isDark ? 'dark' : 'light'}-${language}-${code.length}`}
          code={code}
          language={language}
          showLineNumbers={showLineNumbers}
          className="text-sm"
        />
      </div>
    </div>
  );

  if (shouldCollapse) {
    return (
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleContent>
          {content}
        </CollapsibleContent>
      </Collapsible>
    );
  }

  return content;
}
