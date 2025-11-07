import { Cloud, CloudOff, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";

interface SyncIndicatorProps {
  syncing: boolean;
  lastAutoSave: Date | null;
  onSync: () => void;
  disabled?: boolean;
  queueSize?: number;
}

export const SyncIndicator = ({ syncing, lastAutoSave, onSync, disabled, queueSize = 0 }: SyncIndicatorProps) => {
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
            <span className="ml-1 px-1.5 py-0.5 rounded-full bg-warning/20 text-warning text-xs font-medium">
              {queueSize} pending
            </span>
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
