import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useOnlineStatus } from "./useOnlineStatus";

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

const MAX_RETRIES = 5;
const BASE_DELAY = 1000; // 1 second

const QUEUE_KEY = "syncQueue";

export const useSyncQueue = () => {
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [processing, setProcessing] = useState(false);
  const isOnline = useOnlineStatus();

  // Load queue from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(QUEUE_KEY);
      if (stored) {
        setQueue(JSON.parse(stored));
      }
    } catch (error) {
      console.error("Failed to load sync queue:", error);
    }
  }, []);

  // Save queue to localStorage whenever it changes
  useEffect(() => {
    try {
      localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
    } catch (error) {
      console.error("Failed to save sync queue:", error);
    }
  }, [queue]);

  // Process queue when coming back online or periodically
  useEffect(() => {
    if (isOnline && queue.length > 0 && !processing) {
      processQueue();
    }

    // Set up periodic retry check (every 5 seconds)
    const retryInterval = setInterval(() => {
      if (isOnline && queue.length > 0 && !processing) {
        processQueue();
      }
    }, 5000);

    return () => clearInterval(retryInterval);
  }, [isOnline, queue.length, processing]);

  const addToQueue = (item: Omit<QueueItem, "id" | "timestamp" | "retryCount" | "nextRetryAt">) => {
    const queueItem: QueueItem = {
      ...item,
      id: crypto.randomUUID(),
      timestamp: Date.now(),
      retryCount: 0,
      nextRetryAt: Date.now(),
    };
    setQueue((prev) => [...prev, queueItem]);
  };

  const calculateBackoff = (retryCount: number): number => {
    // Exponential backoff: 1s, 2s, 4s, 8s, 16s
    return BASE_DELAY * Math.pow(2, retryCount);
  };

  const updateRetryInfo = (id: string) => {
    setQueue((prev) =>
      prev.map((item) => {
        if (item.id === id) {
          const newRetryCount = item.retryCount + 1;
          const backoffDelay = calculateBackoff(newRetryCount);
          return {
            ...item,
            retryCount: newRetryCount,
            nextRetryAt: Date.now() + backoffDelay,
          };
        }
        return item;
      })
    );
  };

  const removeFromQueue = (id: string) => {
    setQueue((prev) => prev.filter((item) => item.id !== id));
  };

  const processQueue = async () => {
    if (processing || queue.length === 0) return;

    const now = Date.now();
    const itemsToProcess = queue.filter(
      (item) => item.nextRetryAt <= now && item.retryCount < MAX_RETRIES
    );

    if (itemsToProcess.length === 0) return;

    setProcessing(true);
    let successCount = 0;
    let failCount = 0;

    for (const item of itemsToProcess) {
      try {
        // Check if there's a newer version on the server to prevent conflicts
        const { data: existingData, error: fetchError } = await supabase
          .from("module_progress_drafts")
          .select("updated_at")
          .eq("module_id", item.moduleId)
          .eq("draft_type", item.draftType)
          .maybeSingle();

        if (fetchError) throw fetchError;

        // If there's a newer version on server, skip this item
        if (existingData?.updated_at) {
          const serverTimestamp = new Date(existingData.updated_at).getTime();
          const localTimestamp = item.timestamp;
          
          if (serverTimestamp > localTimestamp) {
            console.log("Skipping sync - server has newer version");
            removeFromQueue(item.id);
            continue;
          }
        }

        // Perform the upsert with conflict detection
        const { error } = await supabase
          .from("module_progress_drafts")
          .upsert([{
            module_id: item.moduleId,
            draft_type: item.draftType,
            quiz_type: item.quizType,
            data: item.data as any,
          }], {
            onConflict: 'module_id,draft_type,quiz_type',
            ignoreDuplicates: false
          });

        if (error) throw error;

        removeFromQueue(item.id);
        successCount++;
      } catch (error: any) {
        console.error("Failed to sync queued item:", error);
        
        // Check if it's a network error vs other errors
        const isNetworkError = error?.message?.includes("fetch") || 
                               error?.message?.includes("network") ||
                               error?.code === "PGRST301";
        
        if (item.retryCount + 1 >= MAX_RETRIES) {
          // Max retries reached, remove from queue
          removeFromQueue(item.id);
          toast.error(`Sync failed: ${isNetworkError ? 'Connection issue' : 'Server error'}`, {
            description: "Changes could not be saved after multiple attempts",
            duration: 5000,
          });
        } else {
          // Update retry info with exponential backoff
          updateRetryInfo(item.id);
        }
        
        failCount++;
      }
    }

    setProcessing(false);

    if (successCount > 0) {
      toast.success(`✅ Synced ${successCount} ${successCount === 1 ? 'change' : 'changes'}`, {
        duration: 3000,
      });
    }
  };

  const getNextRetryTime = (): Date | null => {
    if (queue.length === 0) return null;
    const nextRetry = Math.min(...queue.map(item => item.nextRetryAt));
    return new Date(nextRetry);
  };

  return {
    queue,
    addToQueue,
    removeFromQueue,
    processQueue,
    queueSize: queue.length,
    processing,
    getNextRetryTime,
  };
};
