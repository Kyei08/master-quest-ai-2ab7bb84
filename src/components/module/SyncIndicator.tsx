import { Cloud, CloudOff, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";

interface SyncIndicatorProps {
  syncing: boolean;
  lastAutoSave: Date | null;
  onSync: () => void;
  disabled?: boolean;
  queueSize?: number;
  nextRetryTime?: Date | null;
}

export const SyncIndicator = ({ syncing, lastAutoSave, onSync, disabled, queueSize = 0, nextRetryTime }: SyncIndicatorProps) => {
  const formatRetryTime = (date: Date) => {
    const now = new Date();
    const diff = date.getTime() - now.getTime();
    const seconds = Math.ceil(diff / 1000);
    
    if (seconds <= 0) return "retrying now...";
    if (seconds < 60) return `retry in ${seconds}s`;
    const minutes = Math.ceil(seconds / 60);
    return `retry in ${minutes}m`;
  };
  return (
    <div className="flex items-center gap-3">
      {lastAutoSave && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground animate-fade-in">
          <Cloud className={cn(
            "w-4 h-4 transition-all duration-300",
            syncing && "animate-pulse text-primary"
          )} />
          <span>Last saved: {lastAutoSave.toLocaleTimeString()}</span>
          {queueSize > 0 && (
            <div className="flex items-center gap-1.5">
              <span className="px-1.5 py-0.5 rounded-full bg-warning/20 text-warning text-xs font-medium">
                {queueSize} pending
              </span>
              {nextRetryTime && (
                <span className="text-muted-foreground/70 animate-pulse">
                  • {formatRetryTime(nextRetryTime)}
                </span>
              )}
            </div>
          )}
        </div>
      )}
      
      <button
        onClick={onSync}
        disabled={disabled || syncing}
        className={cn(
          "flex items-center gap-2 text-xs px-3 py-1.5 rounded-md transition-all duration-300",
          "bg-primary/10 hover:bg-primary/20 text-primary",
          "disabled:opacity-50 disabled:cursor-not-allowed",
          syncing && "bg-primary/20"
        )}
      >
        <RefreshCw className={cn(
          "w-3.5 h-3.5 transition-transform duration-500",
          syncing && "animate-spin"
        )} />
        <span>{syncing ? "Saving..." : "Save"}</span>
      </button>
    </div>
  );
};
