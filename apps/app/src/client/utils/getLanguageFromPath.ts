/**
 * Infer programming language from file path/extension
 * Used for syntax highlighting in code blocks
 */

/**
 * Language mapping from file extensions to language identifiers
 */
const EXTENSION_TO_LANGUAGE: Record<string, string> = {
  // JavaScript/TypeScript
  ts: 'typescript',
  tsx: 'tsx',
  js: 'javascript',
  jsx: 'jsx',
  mjs: 'javascript',
  cjs: 'javascript',

  // Web
  html: 'html',
  htm: 'html',
  css: 'css',
  scss: 'scss',
  sass: 'sass',
  less: 'less',

  // Markup/Data
  json: 'json',
  jsonl: 'jsonl',
  yaml: 'yaml',
  yml: 'yaml',
  xml: 'xml',
  toml: 'toml',
  md: 'markdown',
  mdx: 'mdx',

  // Shell
  sh: 'bash',
  bash: 'bash',
  zsh: 'zsh',
  fish: 'fish',

  // Python
  py: 'python',
  pyw: 'python',
  pyi: 'python',

  // Ruby
  rb: 'ruby',
  rake: 'ruby',

  // Go
  go: 'go',

  // Rust
  rs: 'rust',

  // Java/Kotlin/Scala
  java: 'java',
  kt: 'kotlin',
  kts: 'kotlin',
  scala: 'scala',

  // C/C++
  c: 'c',
  h: 'c',
  cpp: 'cpp',
  cc: 'cpp',
  cxx: 'cpp',
  hpp: 'cpp',
  hh: 'cpp',
  hxx: 'cpp',

  // C#
  cs: 'csharp',

  // PHP
  php: 'php',

  // Swift
  swift: 'swift',

  // Objective-C
  m: 'objective-c',
  mm: 'objective-cpp',

  // SQL
  sql: 'sql',

  // GraphQL
  graphql: 'graphql',
  gql: 'graphql',

  // Docker
  dockerfile: 'dockerfile',

  // Config files
  env: 'bash',
  gitignore: 'text',
  prettierrc: 'json',
  eslintrc: 'json',
  babelrc: 'json',

  // Other
  txt: 'text',
  log: 'text',
  diff: 'diff',
  patch: 'diff',
};

/**
 * Extract language identifier from file path
 *
 * @param filePath - File path or name
 * @returns Language identifier for syntax highlighting
 */
export function getLanguageFromPath(filePath: string): string {
  if (!filePath) {
    return 'text';
  }

  // Extract filename from path
  const filename = filePath.split('/').pop() || filePath;

  // Check for special filenames without extensions
  const lowercaseFilename = filename.toLowerCase();
  if (lowercaseFilename === 'dockerfile') return 'dockerfile';
  if (lowercaseFilename === 'makefile') return 'makefile';
  if (lowercaseFilename === 'rakefile') return 'ruby';
  if (lowercaseFilename === 'gemfile') return 'ruby';
  if (lowercaseFilename === 'podfile') return 'ruby';
  if (lowercaseFilename.endsWith('.prisma')) return 'prisma';

  // Extract extension
  const lastDot = filename.lastIndexOf('.');
  if (lastDot === -1) {
    return 'text';
  }

  const extension = filename.slice(lastDot + 1).toLowerCase();

  // Look up language
  return EXTENSION_TO_LANGUAGE[extension] || 'text';
}

/**
 * Get a display name for a language
 *
 * @param language - Language identifier
 * @returns Human-readable language name
 */
export function getLanguageDisplayName(language: string): string {
  const displayNames: Record<string, string> = {
    typescript: 'TypeScript',
    javascript: 'JavaScript',
    tsx: 'TSX',
    jsx: 'JSX',
    python: 'Python',
    bash: 'Bash',
    json: 'JSON',
    jsonl: 'JSONL',
    markdown: 'Markdown',
    yaml: 'YAML',
    css: 'CSS',
    scss: 'SCSS',
    html: 'HTML',
    sql: 'SQL',
    go: 'Go',
    rust: 'Rust',
    java: 'Java',
    kotlin: 'Kotlin',
    csharp: 'C#',
    cpp: 'C++',
    c: 'C',
    ruby: 'Ruby',
    php: 'PHP',
    swift: 'Swift',
    graphql: 'GraphQL',
    dockerfile: 'Dockerfile',
    diff: 'Diff',
    text: 'Text',
  };

  return displayNames[language] || language.charAt(0).toUpperCase() + language.slice(1);
}
