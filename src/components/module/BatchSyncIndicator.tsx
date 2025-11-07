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
}

export const BatchSyncIndicator = ({ 
  syncing, 
  lastBatchSync, 
  onSyncAll, 
  queueSize = 0, 
  nextRetryTime,
  registeredCount = 0 
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

  if (!isOnline && queueSize === 0) {
    return null;
  }

  return (
    <div className="space-y-3">
      {queueSize > 0 && (
        <Alert variant="default" className="border-warning/50 bg-warning/5">
          <AlertTriangle className="h-4 w-4 text-warning" />
          <AlertTitle className="text-warning">Pending Changes Across Tabs</AlertTitle>
          <AlertDescription className="text-sm">
            You have {queueSize} unsaved change{queueSize > 1 ? 's' : ''} across all tabs.
            {nextRetryTime && ` ${formatRetryTime(nextRetryTime)}.`}
            {!isOnline && " You're offline - changes will sync when reconnected."}
          </AlertDescription>
        </Alert>
      )}
      
      <div className="flex items-center gap-3 flex-wrap">
        {!isOnline && (
          <div className="text-xs text-warning flex items-center gap-1">
            <span className="w-2 h-2 bg-warning rounded-full animate-pulse" />
            Offline
          </div>
        )}
        
        {lastBatchSync && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Cloud className={cn(
              "w-4 h-4 transition-all duration-300",
              syncing && "animate-pulse text-primary"
            )} />
            <span>Last synced: {lastBatchSync.toLocaleTimeString()}</span>
          </div>
        )}
        
        <Button
          onClick={onSyncAll}
          disabled={syncing || !isOnline}
          size="sm"
          variant="outline"
          className={cn(
            "gap-2",
            syncing && "opacity-70"
          )}
        >
          <RefreshCw className={cn(
            "w-3.5 h-3.5 transition-transform duration-500",
            syncing && "animate-spin"
          )} />
          <span>{syncing ? "Syncing All..." : "Sync All Tabs"}</span>
          {registeredCount > 0 && !syncing && (
            <span className="text-xs text-muted-foreground">
              ({registeredCount})
            </span>
          )}
        </Button>
      </div>
    </div>
  );
};
