import { Cloud, RefreshCw, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";

interface BatchSyncIndicatorProps {
  syncing: boolean;
  lastBatchSync: Date | null;
  onSyncAll: () => void;
  queueSize?: number;
  nextRetryTime?: Date | null;
  registeredCount?: number;
  autoSyncing?: boolean;
}

export const BatchSyncIndicator = ({ 
  syncing, 
  lastBatchSync, 
  onSyncAll, 
  queueSize = 0, 
  nextRetryTime,
  registeredCount = 0,
  autoSyncing = false
}: BatchSyncIndicatorProps) => {
  const isOnline = useOnlineStatus();

  const formatRetryTime = (date: Date) => {
    const now = new Date();
    const diff = date.getTime() - now.getTime();
    const seconds = Math.ceil(diff / 1000);
    
    if (seconds <= 0) return "retrying now...";
    if (seconds < 60) return `retry in ${seconds}s`;
    const minutes = Math.ceil(seconds / 60);
    return `retry in ${minutes}m`;
  };

  if (!isOnline && queueSize === 0 && registeredCount === 0) {
    return null;
  }

  return (
    <div className="space-y-3">
      {queueSize > 0 && (
        <Alert variant="default" className="border-warning/50 bg-warning/5">
          <AlertTriangle className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-warning" />
          <AlertTitle className="text-warning text-sm sm:text-base">Pending Changes</AlertTitle>
          <AlertDescription className="text-xs sm:text-sm">
            {queueSize} {queueSize === 1 ? 'change' : 'changes'} queued for sync.
            {nextRetryTime && ` ${formatRetryTime(nextRetryTime)}.`}
            {!isOnline && " Waiting for stable connection..."}
          </AlertDescription>
        </Alert>
      )}
      
      <div className="flex items-center gap-3 flex-wrap">
        {!isOnline && (
          <div className="text-xs text-warning flex items-center gap-1.5 px-2 py-1 bg-warning/10 rounded-md">
            <span className="w-2 h-2 bg-warning rounded-full animate-pulse" />
            <span className="hidden xs:inline">Connection unstable</span>
            <span className="xs:hidden">Offline</span>
          </div>
        )}
        
        {lastBatchSync && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground animate-fade-in">
            <Cloud className={cn(
              "w-3.5 h-3.5 sm:w-4 sm:h-4 transition-all duration-300",
              (syncing || autoSyncing) && "animate-pulse text-primary"
            )} />
            <span className="hidden xs:inline">
              {autoSyncing ? "Auto-saving..." : `Last synced: ${lastBatchSync.toLocaleTimeString()}`}
            </span>
            <span className="xs:hidden">
              {autoSyncing ? "Saving..." : lastBatchSync.toLocaleTimeString()}
            </span>
          </div>
        )}
        
        <Button
          onClick={onSyncAll}
          disabled={syncing || !isOnline || autoSyncing}
          size="sm"
          variant="outline"
          className={cn(
            "gap-1.5 sm:gap-2 h-8 sm:h-9 text-xs sm:text-sm",
            (syncing || autoSyncing) && "opacity-70"
          )}
        >
          <RefreshCw className={cn(
            "w-3 h-3 sm:w-3.5 sm:h-3.5 transition-transform duration-500",
            (syncing || autoSyncing) && "animate-spin"
          )} />
          <span className="hidden xs:inline">
            {autoSyncing 
              ? "Auto-saving..." 
              : syncing 
                ? "Syncing..." 
                : registeredCount === 0 
                  ? "No changes" 
                  : "Sync All Tabs"}
          </span>
          <span className="xs:hidden">
            {autoSyncing || syncing ? "Saving..." : "Sync"}
          </span>
          {registeredCount > 0 && !syncing && !autoSyncing && (
            <span className="text-xs text-muted-foreground hidden sm:inline">
              ({registeredCount})
            </span>
          )}
        </Button>
      </div>
    </div>
  );
};
