import { createContext, useContext, ReactNode } from "react";
import { useBatchSync } from "@/hooks/useBatchSync";

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
  nextRetryTime: Date | null;
  registeredCount: number;
}

const BatchSyncContext = createContext<BatchSyncContextType | undefined>(undefined);

export const useBatchSyncContext = () => {
  const context = useContext(BatchSyncContext);
  if (!context) {
    throw new Error("useBatchSyncContext must be used within BatchSyncProvider");
  }
  return context;
};

interface BatchSyncProviderProps {
  children: ReactNode;
  moduleId: string;
}

export const BatchSyncProvider = ({ children, moduleId }: BatchSyncProviderProps) => {
  const batchSync = useBatchSync(moduleId);

  return (
    <BatchSyncContext.Provider value={batchSync}>
      {children}
    </BatchSyncContext.Provider>
  );
};
