import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Bug } from 'lucide-react';
import { useDebugMode } from '@/client/hooks/useDebugMode';
import { setDebugMode } from '@/client/utils/isDebugMode';
import { WebSocketTab } from './tabs/WebSocketTab';
import { MessagesTab } from './tabs/MessagesTab';
import { StoreTab } from './tabs/StoreTab';
import type { TabId, Tab } from './types';

const STORAGE_KEY = 'debug-panel-active-tab';

const tabs: Tab[] = [
  { id: 'websocket', label: 'WebSocket', component: WebSocketTab },
  { id: 'messages', label: 'Messages', component: MessagesTab },
  { id: 'store', label: 'Store', component: StoreTab },
];

/**
 * Consolidated debug panel with WebSocket, Messages, and Store tabs.
 * Activated via ?debug=true query parameter and Ctrl+Shift+W keyboard shortcut.
 */
export function DebugPanel() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const debugMode = useDebugMode();
  const [isMinimized, setIsMinimized] = useState(true);
  const [activeTabId, setActiveTabId] = useState<TabId>(() => {
    const saved = sessionStorage.getItem(STORAGE_KEY);
    return (saved as TabId) || 'websocket';
  });

  // Save active tab to sessionStorage
  useEffect(() => {
    sessionStorage.setItem(STORAGE_KEY, activeTabId);
  }, [activeTabId]);

  // Keyboard shortcut: Ctrl+Shift+W (Cmd+Shift+W on Mac)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
      const modifierKey = isMac ? e.metaKey : e.ctrlKey;

      if (modifierKey && e.shiftKey && e.key === 'W') {
        e.preventDefault();
        setIsMinimized((prev) => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Don't render if debug mode is off
  if (!debugMode) return null;

  const ActiveTabComponent = tabs.find((tab) => tab.id === activeTabId)?.component;

  if (isMinimized) {
    return (
      <button
        onClick={() => setIsMinimized(false)}
        className="fixed bottom-4 right-4 z-50 px-3 py-2 bg-blue-600 text-white rounded-lg shadow-lg hover:bg-blue-700 transition-colors border border-blue-500 flex items-center gap-2"
      >
        <Bug className="w-4 h-4" />
        <span className="text-base">Debug</span>
      </button>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 w-[700px] h-[600px] bg-gray-900 text-white rounded-lg shadow-2xl flex flex-col border border-gray-700 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-700 bg-gray-800">
        <h2 className="text-lg font-semibold">Debug Panel</h2>
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-400">Ctrl+Shift+W</span>
          <button
            onClick={() => {
              setDebugMode(false);
              // Remove ?debug from URL
              const newParams = new URLSearchParams(searchParams);
              newParams.delete('debug');
              const newSearch = newParams.toString();
              navigate({
                pathname: window.location.pathname,
                search: newSearch ? `?${newSearch}` : '',
              }, { replace: true });
            }}
            className="px-3 py-1 text-sm bg-red-700 hover:bg-red-600 rounded transition-colors"
            title="Disable debug mode"
          >
            Disable Debug
          </button>
          <button
            onClick={() => setIsMinimized(true)}
            className="px-3 py-1 text-sm bg-gray-700 hover:bg-gray-600 rounded transition-colors"
          >
            Minimize
          </button>
        </div>
      </div>

      {/* Tab Switcher */}
      <div className="flex border-b border-gray-700 bg-gray-800">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTabId(tab.id)}
            className={`px-6 py-3 text-sm font-medium transition-colors ${
              activeTabId === tab.id
                ? 'bg-gray-900 text-white border-b-2 border-blue-500'
                : 'text-gray-400 hover:text-white hover:bg-gray-700'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-auto p-4">
        {ActiveTabComponent && <ActiveTabComponent />}
      </div>
    </div>
  );
}
