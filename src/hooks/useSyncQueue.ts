import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useOnlineStatus } from "./useOnlineStatus";

interface QueueItem {
  id: string;
  moduleId: string;
  draftType: "assignment" | "quiz";
  quizType?: "quiz" | "final_test";
  data: any;
  timestamp: number;
  retryCount: number;
  nextRetryAt: number;
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
        const { error } = await supabase
          .from("module_progress_drafts")
          .upsert([{
            module_id: item.moduleId,
            draft_type: item.draftType,
            quiz_type: item.quizType,
            data: item.data as any,
          }]);

        if (error) throw error;

        removeFromQueue(item.id);
        successCount++;
      } catch (error) {
        console.error("Failed to sync queued item:", error);
        
        if (item.retryCount + 1 >= MAX_RETRIES) {
          // Max retries reached, remove from queue
          removeFromQueue(item.id);
          toast.error(`Sync failed after ${MAX_RETRIES} attempts`, {
            duration: 4000,
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
      toast.success(`✅ Saved ${successCount} ${successCount === 1 ? 'item' : 'items'} successfully`, {
        duration: 3000,
      });
    }
  };

  return {
    queue,
    addToQueue,
    removeFromQueue,
    processQueue,
    queueSize: queue.length,
    processing,
  };
};
