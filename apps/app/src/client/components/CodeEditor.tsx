import CodeMirror from "@uiw/react-codemirror";
import { javascript } from "@codemirror/lang-javascript";
import { python } from "@codemirror/lang-python";
import { html } from "@codemirror/lang-html";
import { css } from "@codemirror/lang-css";
import { json } from "@codemirror/lang-json";
import { markdown } from "@codemirror/lang-markdown";
import { oneDark } from "@codemirror/theme-one-dark";
import { EditorView } from "@codemirror/view";
import type { Extension } from "@codemirror/state";
import { useCodeBlockTheme } from "@/client/utils/codeBlockTheme";

// Create a theme extension that makes the background transparent
const transparentTheme = EditorView.theme({
  "&": {
    backgroundColor: "transparent !important",
  },
  ".cm-scroller": {
    backgroundColor: "transparent !important",
  },
  ".cm-gutters": {
    backgroundColor: "transparent !important",
    borderRight: "none",
  },
});

export type SupportedLanguage =
  | "javascript"
  | "typescript"
  | "jsx"
  | "tsx"
  | "python"
  | "html"
  | "css"
  | "json"
  | "markdown";

interface CodeEditorProps {
  value: string;
  onChange: (value: string) => void;
  language?: SupportedLanguage;
  height?: string;
  minHeight?: string;
  readOnly?: boolean;
  className?: string;
  showLineNumbers?: boolean;
  wordWrap?: boolean;
  transparentBackground?: boolean;
  fontSize?: string;
}

function getLanguageExtension(language?: SupportedLanguage): Extension[] {
  switch (language) {
    case "javascript":
    case "jsx":
      return [javascript({ jsx: true })];
    case "typescript":
    case "tsx":
      return [javascript({ jsx: true, typescript: true })];
    case "python":
      return [python()];
    case "html":
      return [html()];
    case "css":
      return [css()];
    case "json":
      return [json()];
    case "markdown":
      return [markdown()];
    default:
      return [];
  }
}

export function CodeEditor({
  value,
  onChange,
  language,
  height = "400px",
  minHeight,
  readOnly = false,
  className = "",
  showLineNumbers = true,
  wordWrap = true,
  transparentBackground = false,
  fontSize = "14px",
}: CodeEditorProps) {
  const { isDark } = useCodeBlockTheme();

  const extensions = [
    ...getLanguageExtension(language),
    ...(wordWrap ? [EditorView.lineWrapping] : []),
    ...(transparentBackground ? [transparentTheme] : []),
  ];

  return (
    <div className={`overflow-hidden ${className}`}>
      <CodeMirror
        value={value}
        onChange={onChange}
        extensions={extensions}
        theme={isDark ? oneDark : "light"}
        height={height}
        minHeight={minHeight}
        editable={!readOnly}
        readOnly={readOnly}
        style={{
          fontSize,
        }}
        basicSetup={{
          lineNumbers: showLineNumbers,
          foldGutter: false,
          highlightActiveLine: !readOnly,
          highlightSelectionMatches: !readOnly,
          indentOnInput: true,
          bracketMatching: true,
          closeBrackets: !readOnly,
          autocompletion: !readOnly,
          searchKeymap: false,
        }}
      />
    </div>
  );
}
