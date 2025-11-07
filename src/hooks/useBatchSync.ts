import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useSyncQueue } from "./useSyncQueue";

interface BatchSyncItem {
  draftType: "assignment" | "quiz" | "flashcards" | "presentations";
  quizType?: "quiz" | "final_test";
  getData: () => any;
}

export const useBatchSync = (moduleId: string) => {
  const [syncing, setSyncing] = useState(false);
  const [lastBatchSync, setLastBatchSync] = useState<Date | null>(null);
  const { addToQueue, queueSize, getNextRetryTime, processQueue } = useSyncQueue();
  const [registeredItems, setRegisteredItems] = useState<Map<string, BatchSyncItem>>(new Map());

  // Register a tab's sync function
  const register = useCallback((key: string, item: BatchSyncItem) => {
    setRegisteredItems((prev) => {
      const newMap = new Map(prev);
      newMap.set(key, item);
      return newMap;
    });
  }, []);

  // Unregister a tab's sync function
  const unregister = useCallback((key: string) => {
    setRegisteredItems((prev) => {
      const newMap = new Map(prev);
      newMap.delete(key);
      return newMap;
    });
  }, []);

  // Sync all registered items
  const syncAll = useCallback(async () => {
    if (syncing) return;

    setSyncing(true);
    let successCount = 0;
    let failCount = 0;

    try {
      // First, process any queued items
      await processQueue();

      // Then sync current state from all registered tabs
      const syncPromises = Array.from(registeredItems.entries()).map(async ([key, item]) => {
        try {
          const data = item.getData();
          
          // Skip if no data to sync
          if (!data) return;

          const { error } = await supabase
            .from("module_progress_drafts")
            .upsert([{
              module_id: moduleId,
              draft_type: item.draftType,
              quiz_type: item.quizType,
              data: data as any,
            }]);

          if (error) throw error;
          successCount++;
        } catch (error) {
          console.error(`Failed to sync ${key}:`, error);
          
          // Add to queue for retry
          const data = item.getData();
          if (data) {
            addToQueue({
              moduleId,
              draftType: item.draftType,
              quizType: item.quizType,
              data,
            });
          }
          failCount++;
        }
      });

      await Promise.allSettled(syncPromises);

      setLastBatchSync(new Date());

      if (successCount > 0) {
        toast.success(`✅ Synced ${successCount} ${successCount === 1 ? 'tab' : 'tabs'} successfully`, {
          duration: 3000,
        });
      }

      if (failCount > 0) {
        toast.warning(`${failCount} ${failCount === 1 ? 'tab' : 'tabs'} queued for retry`, {
          duration: 3000,
        });
      }
    } catch (error) {
      console.error("Batch sync failed:", error);
      toast.error("Batch sync failed", {
        description: "Some changes may not have been saved.",
      });
    } finally {
      setSyncing(false);
    }
  }, [syncing, moduleId, registeredItems, addToQueue, processQueue]);

  return {
    syncing,
    lastBatchSync,
    syncAll,
    register,
    unregister,
    queueSize,
    nextRetryTime: getNextRetryTime(),
    registeredCount: registeredItems.size,
  };
};
