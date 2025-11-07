import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export const useOnlineStatus = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isServerReachable, setIsServerReachable] = useState(true);

  // Check browser online status
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  // Actively check server reachability
  useEffect(() => {
    const checkServerConnection = async () => {
      try {
        const { error } = await supabase
          .from("modules")
          .select("id")
          .limit(1)
          .single();
        
        // Even if the query returns no data or error, if we get a response, server is reachable
        setIsServerReachable(true);
      } catch (error) {
        console.error("Server unreachable:", error);
        setIsServerReachable(false);
      }
    };

    // Check immediately
    checkServerConnection();

    // Check every 10 seconds
    const interval = setInterval(checkServerConnection, 10000);

    return () => clearInterval(interval);
  }, []);

  // Return true only if both browser is online AND server is reachable
  return isOnline && isServerReachable;
};
