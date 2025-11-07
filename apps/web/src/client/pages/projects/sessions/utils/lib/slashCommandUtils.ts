import type { SlashCommand } from '@/shared/types/slash-command.types';

/**
 * Default Claude Code built-in slash commands
 * These commands are always available regardless of project
 */
export const DEFAULT_SLASH_COMMANDS: SlashCommand[] = [
  {
    name: 'add-dir',
    fullCommand: '/add-dir',
    description: 'Add a directory to context',
    type: 'builtin',
  },
  {
    name: 'agents',
    fullCommand: '/agents',
    description: 'View and manage background agents',
    type: 'builtin',
  },
  {
    name: 'bug',
    fullCommand: '/bug',
    description: 'Report a bug or issue',
    type: 'builtin',
  },
  {
    name: 'clear',
    fullCommand: '/clear',
    description: 'Clear the chat history',
    type: 'builtin',
  },
  {
    name: 'compact',
    fullCommand: '/compact',
    description: 'Toggle compact mode',
    type: 'builtin',
  },
  {
    name: 'config',
    fullCommand: '/config',
    description: 'Configure Claude Code settings',
    type: 'builtin',
  },
  {
    name: 'cost',
    fullCommand: '/cost',
    description: 'View API usage and costs',
    type: 'builtin',
  },
  {
    name: 'doctor',
    fullCommand: '/doctor',
    description: 'Run diagnostics and health checks',
    type: 'builtin',
  },
  {
    name: 'help',
    fullCommand: '/help',
    description: 'Show help and available commands',
    type: 'builtin',
  },
  {
    name: 'init',
    fullCommand: '/init',
    description: 'Initialize a new project',
    type: 'builtin',
  },
  {
    name: 'login',
    fullCommand: '/login',
    description: 'Authenticate with Claude Code',
    type: 'builtin',
  },
  {
    name: 'logout',
    fullCommand: '/logout',
    description: 'Sign out of Claude Code',
    type: 'builtin',
  },
  {
    name: 'mcp',
    fullCommand: '/mcp',
    description: 'Manage Model Context Protocol servers',
    type: 'builtin',
  },
  {
    name: 'memory',
    fullCommand: '/memory',
    description: 'Manage conversation memory',
    type: 'builtin',
  },
  {
    name: 'model',
    fullCommand: '/model',
    description: 'Switch AI model',
    type: 'builtin',
  },
  {
    name: 'permissions',
    fullCommand: '/permissions',
    description: 'Manage tool permissions',
    type: 'builtin',
  },
  {
    name: 'pr_comments',
    fullCommand: '/pr_comments',
    description: 'View pull request comments',
    type: 'builtin',
  },
  {
    name: 'review',
    fullCommand: '/review',
    description: 'Review code changes',
    type: 'builtin',
  },
  {
    name: 'rewind',
    fullCommand: '/rewind',
    description: 'Rewind conversation to earlier state',
    type: 'builtin',
  },
  {
    name: 'sandbox',
    fullCommand: '/sandbox',
    description: 'Manage sandbox environment',
    type: 'builtin',
  },
  {
    name: 'status',
    fullCommand: '/status',
    description: 'Show current status',
    type: 'builtin',
  },
  {
    name: 'terminal-setup',
    fullCommand: '/terminal-setup',
    description: 'Configure terminal integration',
    type: 'builtin',
  },
  {
    name: 'usage',
    fullCommand: '/usage',
    description: 'View usage statistics',
    type: 'builtin',
  },
  {
    name: 'vim',
    fullCommand: '/vim',
    description: 'Enable vim keybindings',
    type: 'builtin',
  },
];
