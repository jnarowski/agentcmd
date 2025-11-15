import { useState, useEffect } from "react";

const STORAGE_KEY = "workflowRunDetail.activeTab";
const DEFAULT_TAB = "details";

export type WorkflowTab = "details" | "session" | "logs" | "artifacts";

export function useWorkflowDetailPanel() {
  const [activeTab, setActiveTabState] = useState<WorkflowTab>(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    return (stored as WorkflowTab) || DEFAULT_TAB;
  });

  const [selectedSessionId, setSelectedSessionIdState] = useState<string | null>(null);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, activeTab);
  }, [activeTab]);

  const setActiveTab = (tab: WorkflowTab) => {
    setActiveTabState(tab);
  };

  const setSelectedSession = (sessionId: string | null) => {
    setSelectedSessionIdState(sessionId);
  };

  const clearSelection = () => {
    setSelectedSessionIdState(null);
  };

  return {
    activeTab,
    setActiveTab,
    selectedSessionId,
    setSelectedSession,
    clearSelection,
  };
}
