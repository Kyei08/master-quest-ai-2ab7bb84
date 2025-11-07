import { AlertCircle, RefreshCw } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

interface ConflictAlertProps {
  conflictedTabs: string[];
  onRefresh: () => void;
  onDismiss: () => void;
}

export const ConflictAlert = ({ conflictedTabs, onRefresh, onDismiss }: ConflictAlertProps) => {
  if (conflictedTabs.length === 0) return null;

  return (
    <Alert variant="default" className="border-info/50 bg-info/5">
      <AlertCircle className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-info" />
      <AlertTitle className="text-info text-sm sm:text-base">Sync Conflict Resolved</AlertTitle>
      <AlertDescription className="text-xs sm:text-sm space-y-2 sm:space-y-3">
        <div>
          Your local changes to{" "}
          <strong>
            {conflictedTabs.length === 1
              ? conflictedTabs[0]
              : conflictedTabs.length === 2
              ? `${conflictedTabs[0]} and ${conflictedTabs[1]}`
              : `${conflictedTabs.slice(0, -1).join(", ")}, and ${conflictedTabs[conflictedTabs.length - 1]}`}
          </strong>{" "}
          were not saved because a newer version exists from another device.
        </div>
        <div className="flex flex-col xs:flex-row gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={onRefresh}
            className="gap-1.5 sm:gap-2 h-8 text-xs sm:text-sm"
          >
            <RefreshCw className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
            <span className="hidden xs:inline">Reload Latest Version</span>
            <span className="xs:hidden">Reload</span>
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={onDismiss}
            className="h-8 text-xs sm:text-sm"
          >
            Dismiss
          </Button>
        </div>
      </AlertDescription>
    </Alert>
  );
};
