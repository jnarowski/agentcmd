/**
 * GlobalOnboardingSuggestions Component
 * Shows installation status for global CLI tools and API key
 * Dismissible card with visual status indicators
 */

import { X, CheckCircle2, AlertCircle, ExternalLink } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/client/components/ui/alert';
import { Button } from '@/client/components/ui/button';
import { Badge } from '@/client/components/ui/badge';
import { useSettings, useUpdateSettings } from '@/client/hooks/useSettings';

interface SuggestionItem {
  label: string;
  description: string;
  isInstalled: boolean;
  docsUrl: string;
}

export function GlobalOnboardingSuggestions() {
  const { data: settings } = useSettings();
  const updateSettings = useUpdateSettings();

  // Don't render if dismissed or still loading
  if (!settings || settings.userPreferences.onboarding_dismissed) {
    return null;
  }

  const suggestions: SuggestionItem[] = [
    {
      label: 'GitHub CLI',
      description: 'Required for creating pull requests',
      isInstalled: settings.features.ghCliEnabled,
      docsUrl: 'https://cli.github.com',
    },
    {
      label: 'Claude CLI',
      description: 'Anthropic Claude Code assistant',
      isInstalled: settings.agents.claude.installed,
      docsUrl: 'https://docs.anthropic.com/claude/docs/claude-cli',
    },
    {
      label: 'Codex CLI',
      description: 'OpenAI Codex code assistant',
      isInstalled: settings.agents.codex.installed,
      docsUrl: 'https://platform.openai.com/docs',
    },
    {
      label: 'Anthropic API Key',
      description: 'Enables AI features like session naming',
      isInstalled: settings.features.aiEnabled,
      docsUrl: 'https://console.anthropic.com/settings/keys',
    },
  ];

  const allInstalled = suggestions.every((s) => s.isInstalled);
  const installedCount = suggestions.filter((s) => s.isInstalled).length;

  const handleDismiss = () => {
    updateSettings.mutate({ onboarding_dismissed: true });
  };

  return (
    <Alert className="relative py-3">
      <Button
        variant="ghost"
        size="icon"
        className="absolute right-1 top-1 h-6 w-6"
        onClick={handleDismiss}
        aria-label="Dismiss suggestions"
      >
        <X className="h-3 w-3" />
      </Button>

      <AlertTitle className="text-sm font-semibold mb-2 pr-8 flex items-center gap-2">
        {allInstalled ? 'Setup Complete!' : 'Recommended Setup'}
        <Badge variant="secondary" className="text-xs">
          {installedCount}/{suggestions.length}
        </Badge>
      </AlertTitle>

      <AlertDescription>
        <div className="grid grid-cols-2 gap-2 w-full">
          {suggestions.map((item) => (
            <div
              key={item.label}
              className="flex items-center justify-between gap-1.5 px-4 py-2.5 rounded border bg-card text-xs w-full"
            >
              <div className="flex items-center gap-1.5 min-w-0">
                {item.isInstalled ? (
                  <CheckCircle2 className="h-3.5 w-3.5 text-green-600 shrink-0" />
                ) : (
                  <AlertCircle className="h-3.5 w-3.5 text-yellow-600 shrink-0" />
                )}
                <span className="font-medium truncate">{item.label}</span>
              </div>
              {!item.isInstalled && (
                <a
                  href={item.docsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline shrink-0"
                  onClick={(e) => e.stopPropagation()}
                >
                  <ExternalLink className="h-3 w-3" />
                </a>
              )}
            </div>
          ))}
        </div>
      </AlertDescription>
    </Alert>
  );
}
