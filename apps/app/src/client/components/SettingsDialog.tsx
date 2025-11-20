/**
 * Settings Dialog Component
 * Allows users to configure default permission mode, theme, and agent
 */

import { useState, useEffect } from 'react';
import { BaseDialog } from '@/client/components/BaseDialog';
import { DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/client/components/ui/dialog';
import { Button } from '@/client/components/ui/button';
import { Label } from '@/client/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/client/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/client/components/ui/radio-group';
import { Loader2, Sun, Moon, Monitor } from 'lucide-react';
import { useSettings, useUpdateSettings } from '@/client/hooks/useSettings';
import { PERMISSION_MODES } from '@/client/utils/permissionModes';
import { useTheme } from 'next-themes';

export interface SettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SettingsDialog({ open, onOpenChange }: SettingsDialogProps) {
  const { data: settings, isLoading } = useSettings();
  const updateSettings = useUpdateSettings();
  const { setTheme } = useTheme();

  // Form state
  const [permissionMode, setPermissionMode] = useState<string>('acceptEdits');
  const [theme, setThemeValue] = useState<string>('dark');
  const [sessionTheme, setSessionTheme] = useState<string>('default');
  const [agent, setAgent] = useState<string>('claude');

  // Initialize form values from settings
  useEffect(() => {
    if (settings?.userPreferences) {
      setPermissionMode(settings.userPreferences.default_permission_mode);
      setThemeValue(settings.userPreferences.default_theme);
      setSessionTheme(settings.userPreferences.session_theme);
      setAgent(settings.userPreferences.default_agent);

      // Apply color theme on mount
      const root = document.documentElement;
      if (settings.userPreferences.session_theme === 'nature') {
        root.setAttribute('data-theme', 'nature');
      } else if (settings.userPreferences.session_theme === 'monospace') {
        root.setAttribute('data-theme', 'monospace');
      } else {
        root.removeAttribute('data-theme');
      }
    }
  }, [settings]);

  const handleSave = async () => {
    try {
      await updateSettings.mutateAsync({
        default_permission_mode: permissionMode as 'default' | 'plan' | 'acceptEdits' | 'bypassPermissions',
        default_theme: theme as 'light' | 'dark' | 'system',
        session_theme: sessionTheme as 'default' | 'nature' | 'monospace',
        default_agent: agent as 'claude' | 'codex' | 'cursor' | 'gemini',
      });

      // Apply theme immediately
      setTheme(theme as 'light' | 'dark' | 'system');

      // Apply color theme to :root
      const root = document.documentElement;
      if (sessionTheme === 'nature') {
        root.setAttribute('data-theme', 'nature');
      } else if (sessionTheme === 'monospace') {
        root.setAttribute('data-theme', 'monospace');
      } else {
        root.removeAttribute('data-theme');
      }

      onOpenChange(false);
    } catch (error) {
      console.error('Failed to update settings:', error);
    }
  };

  const handleCancel = () => {
    // Reset form values to current settings
    if (settings?.userPreferences) {
      setPermissionMode(settings.userPreferences.default_permission_mode);
      setThemeValue(settings.userPreferences.default_theme);
      setSessionTheme(settings.userPreferences.session_theme);
      setAgent(settings.userPreferences.default_agent);
    }
    onOpenChange(false);
  };

  // Get installed agents
  const installedAgents = settings?.agents
    ? Object.entries(settings.agents)
        .filter(([, capabilities]) => capabilities.installed)
        .map(([key]) => key)
    : [];

  return (
    <BaseDialog
      open={open}
      onOpenChange={onOpenChange}
      contentProps={{ className: "sm:max-w-md" }}
    >
      <DialogHeader>
        <DialogTitle>Settings</DialogTitle>
        <DialogDescription>
          Configure your default preferences for new sessions
        </DialogDescription>
      </DialogHeader>

      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="space-y-6 py-4">
          {/* Permission Mode Selector */}
          <div className="space-y-2">
            <Label htmlFor="permission-mode">Default Permission Mode</Label>
            <Select value={permissionMode} onValueChange={setPermissionMode}>
              <SelectTrigger id="permission-mode">
                <SelectValue placeholder="Select permission mode" />
              </SelectTrigger>
              <SelectContent>
                {PERMISSION_MODES.map((mode) => (
                  <SelectItem key={mode.id} value={mode.id}>
                    <div className="flex items-center gap-2">
                      <div className={`h-2 w-2 rounded-full ${mode.color}`} />
                      <span>{mode.name}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-sm text-muted-foreground">
              New sessions will start with this permission mode
            </p>
          </div>

          {/* Theme Selector */}
          <div className="space-y-2">
            <Label>Theme</Label>
            <RadioGroup value={theme} onValueChange={setThemeValue}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="light" id="theme-light" />
                <Label htmlFor="theme-light" className="flex items-center gap-2 font-normal cursor-pointer">
                  <Sun className="h-4 w-4" />
                  Light
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="dark" id="theme-dark" />
                <Label htmlFor="theme-dark" className="flex items-center gap-2 font-normal cursor-pointer">
                  <Moon className="h-4 w-4" />
                  Dark
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="system" id="theme-system" />
                <Label htmlFor="theme-system" className="flex items-center gap-2 font-normal cursor-pointer">
                  <Monitor className="h-4 w-4" />
                  System
                </Label>
              </div>
            </RadioGroup>
            <p className="text-sm text-muted-foreground">
              Theme changes apply immediately
            </p>
          </div>

          {/* Session Theme Selector */}
          <div className="space-y-2">
            <Label htmlFor="session-theme">Session Theme</Label>
            <Select value={sessionTheme} onValueChange={setSessionTheme}>
              <SelectTrigger id="session-theme">
                <SelectValue placeholder="Select session theme" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="default">Default</SelectItem>
                <SelectItem value="nature">Nature</SelectItem>
                <SelectItem value="monospace">Monospace</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-sm text-muted-foreground">
              Visual style for session messages
            </p>
          </div>

          {/* Agent Selector */}
          <div className="space-y-2">
            <Label htmlFor="agent">Default Agent</Label>
            <Select value={agent} onValueChange={setAgent}>
              <SelectTrigger id="agent">
                <SelectValue placeholder="Select agent" />
              </SelectTrigger>
              <SelectContent>
                {installedAgents.map((agentKey) => (
                  <SelectItem key={agentKey} value={agentKey}>
                    <span className="capitalize">{agentKey}</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-sm text-muted-foreground">
              New sessions will use this agent by default
            </p>
          </div>
        </div>
      )}

      <DialogFooter>
        <Button variant="outline" onClick={handleCancel} disabled={updateSettings.isPending}>
          Cancel
        </Button>
        <Button onClick={handleSave} disabled={updateSettings.isPending || isLoading}>
          {updateSettings.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Save
        </Button>
      </DialogFooter>
    </BaseDialog>
  );
}
