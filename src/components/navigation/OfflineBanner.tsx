import { WifiOff } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";

export const OfflineBanner = () => {
  const isOnline = useOnlineStatus();

  if (isOnline) return null;

  return (
    <Alert 
      variant="destructive" 
      className="fixed top-0 left-0 right-0 z-50 rounded-none border-0 border-b animate-fade-in"
    >
      <WifiOff className="h-4 w-4 animate-pulse" />
      <AlertDescription className="ml-2">
        <strong>No internet connection.</strong> Your progress will sync automatically when you're back online.
      </AlertDescription>
    </Alert>
  );
};
