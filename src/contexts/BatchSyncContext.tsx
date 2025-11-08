import { createContext, useContext, ReactNode } from "react";
import { useBatchSync } from "@/hooks/useBatchSync";

interface QueueItem {
  id: string;
  moduleId: string;
  draftType: "assignment" | "quiz" | "flashcards" | "presentations";
  quizType?: "quiz" | "final_test";
  data: any;
  timestamp: number;
  retryCount: number;
  nextRetryAt: number;
  lastSyncAttempt?: number;
}

interface BatchSyncContextType {
  syncing: boolean;
  lastBatchSync: Date | null;
  syncAll: () => Promise<void>;
  register: (key: string, item: {
    draftType: "assignment" | "quiz" | "flashcards" | "presentations";
    quizType?: "quiz" | "final_test";
    getData: () => any;
  }) => void;
  unregister: (key: string) => void;
  queueSize: number;
  queueItems: QueueItem[];
  nextRetryTime: Date | null;
  registeredCount: number;
  syncStats: { success: number; failed: number; total: number };
  onConflict?: (tabName: string) => void;
}

const BatchSyncContext = createContext<BatchSyncContextType | undefined>(undefined);

const defaultBatchSyncContext: BatchSyncContextType = {
  syncing: false,
  lastBatchSync: null,
  syncAll: async () => {},
  register: () => {},
  unregister: () => {},
  queueSize: 0,
  queueItems: [],
  nextRetryTime: null,
  registeredCount: 0,
  syncStats: { success: 0, failed: 0, total: 0 },
  onConflict: undefined,
};

export const useBatchSyncContext = () => {
  const context = useContext(BatchSyncContext);
  if (!context) {
    console.warn("useBatchSyncContext must be used within BatchSyncProvider - falling back to default context");
    return defaultBatchSyncContext;
  }
  return context;
};

interface BatchSyncProviderProps {
  children: ReactNode;
  moduleId: string;
  onConflict?: (tabName: string) => void;
}

export const BatchSyncProvider = ({ children, moduleId, onConflict }: BatchSyncProviderProps) => {
  const batchSync = useBatchSync(moduleId, onConflict);

  return (
    <BatchSyncContext.Provider value={batchSync}>
      {children}
    </BatchSyncContext.Provider>
  );
};
