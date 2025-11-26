/**
 * Debug panel type definitions
 */

export type TabId = 'websocket' | 'messages' | 'store';

export interface Tab {
  id: TabId;
  label: string;
  component: React.ComponentType;
}
