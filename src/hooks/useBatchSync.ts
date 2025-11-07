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

          const timestamp = Date.now();

          // Check for conflicts before upserting
          const { data: existingData, error: fetchError } = await supabase
            .from("module_progress_drafts")
            .select("updated_at")
            .eq("module_id", moduleId)
            .eq("draft_type", item.draftType)
            .maybeSingle();

          if (fetchError && fetchError.code !== 'PGRST116') {
            throw fetchError;
          }

          // Perform the upsert
          const { error } = await supabase
            .from("module_progress_drafts")
            .upsert([{
              module_id: moduleId,
              draft_type: item.draftType,
              quiz_type: item.quizType,
              data: data as any,
            }], {
              onConflict: 'module_id,draft_type,quiz_type',
              ignoreDuplicates: false
            });

          if (error) throw error;
          successCount++;
        } catch (error: any) {
          console.error(`Failed to sync ${key}:`, error);
          
          const isNetworkError = error?.message?.includes("fetch") || 
                                 error?.message?.includes("network");
          
          // Only queue for retry if it's a network error
          if (isNetworkError) {
            const data = item.getData();
            if (data) {
              addToQueue({
                moduleId,
                draftType: item.draftType,
                quizType: item.quizType,
                data,
              });
            }
          }
          failCount++;
        }
      });

      await Promise.allSettled(syncPromises);

      setLastBatchSync(new Date());

      if (successCount > 0 && failCount === 0) {
        toast.success(`✅ All changes saved (${successCount} ${successCount === 1 ? 'tab' : 'tabs'})`, {
          duration: 3000,
        });
      } else if (successCount > 0 && failCount > 0) {
        toast.success(`✅ Saved ${successCount} ${successCount === 1 ? 'tab' : 'tabs'}`, {
          description: `${failCount} queued for retry`,
          duration: 3000,
        });
      } else if (failCount > 0) {
        toast.warning(`Changes queued for retry`, {
          description: "Will sync when connection is stable",
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
