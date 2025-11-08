import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

interface ConnectionQuality {
  status: "excellent" | "good" | "poor" | "offline";
  latency: number | null;
  lastChecked: Date | null;
  isServerReachable: boolean;
  errorDetails: string | null;
}

export const useConnectionQuality = () => {
  const [quality, setQuality] = useState<ConnectionQuality>({
    status: "good",
    latency: null,
    lastChecked: null,
    isServerReachable: true,
    errorDetails: null,
  });

  useEffect(() => {
    const checkConnection = async () => {
      // Check browser online status first
      if (!navigator.onLine) {
        setQuality({
          status: "offline",
          latency: null,
          lastChecked: new Date(),
          isServerReachable: false,
          errorDetails: "Browser is offline",
        });
        return;
      }

      const startTime = performance.now();
      
      try {
        const { data, error } = await supabase
          .from("modules")
          .select("id")
          .limit(1);
        
        const endTime = performance.now();
        const latency = Math.round(endTime - startTime);

        if (error) {
          // Server responded but with an error - this is a SERVER issue
          setQuality({
            status: "good", // Internet is working
            latency,
            lastChecked: new Date(),
            isServerReachable: true,
            errorDetails: `Server error: ${error.code || error.message}`,
          });
          return;
        }

        // Determine quality based on latency
        let status: "excellent" | "good" | "poor" = "excellent";
        if (latency > 2000) status = "poor";
        else if (latency > 1000) status = "good";

        setQuality({
          status,
          latency,
          lastChecked: new Date(),
          isServerReachable: true,
          errorDetails: null,
        });
      } catch (error: any) {
        // Network error - could be internet or server down
        const isNetworkError = error.message?.includes("fetch") || 
                               error.message?.includes("network") ||
                               !error.code;

        setQuality({
          status: "offline",
          latency: null,
          lastChecked: new Date(),
          isServerReachable: false,
          errorDetails: isNetworkError 
            ? "Cannot reach server - check your internet connection"
            : `Server error: ${error.message}`,
        });
      }
    };

    // Check immediately
    checkConnection();

    // Check every 15 seconds
    const interval = setInterval(checkConnection, 15000);

    return () => clearInterval(interval);
  }, []);

  return quality;
};
