import { WifiOff } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";

export const OfflineBanner = () => {
  const isOnline = useOnlineStatus();

  if (isOnline) return null;

  return (
    <Alert 
      variant="destructive" 
      className="fixed top-0 left-0 right-0 z-50 rounded-none border-0 border-b animate-fade-in py-2 sm:py-3"
    >
      <WifiOff className="h-3.5 w-3.5 sm:h-4 sm:w-4 animate-pulse" />
      <AlertDescription className="ml-2 text-xs sm:text-sm">
        <strong className="hidden xs:inline">No internet connection.</strong>
        <strong className="xs:hidden">Offline.</strong>
        <span className="hidden sm:inline"> Your progress will sync automatically when you're back online.</span>
        <span className="sm:hidden"> Changes saved locally.</span>
      </AlertDescription>
    </Alert>
  );
};
