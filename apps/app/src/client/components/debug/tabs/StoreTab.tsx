import { useState } from 'react';
import { Copy, Check } from 'lucide-react';
import { useSessionStore } from '@/client/pages/projects/sessions/stores/sessionStore';
import { useFilesStore } from '@/client/pages/projects/files/stores/filesStore';
import { useAuthStore } from '@/client/stores/authStore';
import { useNavigationStore } from '@/client/stores/navigationStore';
import { useCopy } from '@/client/hooks/useCopy';

interface StoreSection {
  name: string;
  data: unknown;
}

/**
 * Zustand state viewer - shows all stores with live updates
 */
export function StoreTab() {
  const [expandedStores, setExpandedStores] = useState<Set<string>>(new Set(['session']));
  const { copied: copiedStore, copy: copyStore } = useCopy();

  // Subscribe to all stores (auto-updates on state changes)
  const sessionState = useSessionStore();
  const filesState = useFilesStore();
  const authState = useAuthStore();
  const navState = useNavigationStore();

  const stores: StoreSection[] = [
    { name: 'session', data: sessionState },
    { name: 'files', data: filesState },
    { name: 'auth', data: authState },
    { name: 'navigation', data: navState },
  ];

  const toggleStore = (storeName: string) => {
    setExpandedStores((prev) => {
      const next = new Set(prev);
      if (next.has(storeName)) {
        next.delete(storeName);
      } else {
        next.add(storeName);
      }
      return next;
    });
  };

  // Calculate field count for each store
  const getFieldCount = (data: unknown): number => {
    if (data === null || data === undefined) return 0;
    if (typeof data !== 'object') return 0;
    return Object.keys(data).length;
  };

  return (
    <div className="space-y-3">
      {/* Info Banner */}
      <div className="p-3 bg-blue-900/30 border border-blue-700 rounded-lg text-sm text-blue-200">
        <div className="font-medium mb-1">Live Zustand State Inspection</div>
        <div className="text-xs text-blue-300">
          State updates automatically as stores change. Click store names to expand/collapse.
        </div>
      </div>

      {/* Stores List */}
      <div className="space-y-2">
        {stores.map((store) => {
          const isExpanded = expandedStores.has(store.name);
          const fieldCount = getFieldCount(store.data);

          return (
            <div
              key={store.name}
              className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden"
            >
              {/* Store Header */}
              <button
                onClick={() => toggleStore(store.name)}
                className="w-full px-3 py-2 flex items-center justify-between hover:bg-gray-700 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <span className="font-medium capitalize">{store.name} Store</span>
                  <span className="text-xs text-gray-400">({fieldCount} fields)</span>
                </div>
                <div className="flex items-center gap-2">
                  {isExpanded && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        copyStore(JSON.stringify(store.data, null, 2));
                      }}
                      className="p-1.5 rounded bg-gray-700 hover:bg-gray-600 transition-colors"
                      title="Copy store state"
                    >
                      {copiedStore ? (
                        <Check className="h-3 w-3 text-green-400" />
                      ) : (
                        <Copy className="h-3 w-3 text-gray-300" />
                      )}
                    </button>
                  )}
                  <span className="text-gray-400">{isExpanded ? '▼' : '▶'}</span>
                </div>
              </button>

              {/* Store Content */}
              {isExpanded && (
                <div className="p-3 border-t border-gray-700 bg-gray-950">
                  <pre className="text-xs font-mono text-gray-300 overflow-x-auto max-h-96 overflow-y-auto">
                    {JSON.stringify(store.data, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        <button
          onClick={() => setExpandedStores(new Set(stores.map((s) => s.name)))}
          className="flex-1 px-3 py-2 bg-gray-800 hover:bg-gray-700 rounded text-sm transition-colors"
        >
          Expand All
        </button>
        <button
          onClick={() => setExpandedStores(new Set())}
          className="flex-1 px-3 py-2 bg-gray-800 hover:bg-gray-700 rounded text-sm transition-colors"
        >
          Collapse All
        </button>
      </div>
    </div>
  );
}
