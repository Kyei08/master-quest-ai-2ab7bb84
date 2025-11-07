import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { RealtimeChannel } from "@supabase/supabase-js";

interface PresenceUser {
  user_id: string;
  full_name: string | null;
  online_at: string;
}

interface PresenceState {
  [key: string]: PresenceUser[];
}

export const useModulePresence = (moduleId: string | undefined) => {
  const [presenceUsers, setPresenceUsers] = useState<PresenceUser[]>([]);
  const [channel, setChannel] = useState<RealtimeChannel | null>(null);

  useEffect(() => {
    if (!moduleId) return;

    let presenceChannel: RealtimeChannel;

    const setupPresence = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      // Get user profile
      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", user.id)
        .single();

      // Create channel for this specific module
      presenceChannel = supabase.channel(`module:${moduleId}`, {
        config: {
          presence: {
            key: user.id,
          },
        },
      });

      // Listen to presence sync
      presenceChannel.on("presence", { event: "sync" }, () => {
        const state = presenceChannel.presenceState<PresenceUser>();
        console.log("Presence sync:", state);
        
        // Flatten presence state to array of unique users
        const users = Object.values(state).flat();
        setPresenceUsers(users);
      });

      // Listen to joins
      presenceChannel.on("presence", { event: "join" }, ({ key, newPresences }) => {
        console.log("User joined:", key, newPresences);
      });

      // Listen to leaves
      presenceChannel.on("presence", { event: "leave" }, ({ key, leftPresences }) => {
        console.log("User left:", key, leftPresences);
      });

      // Subscribe and track presence
      presenceChannel.subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          const presenceTrackStatus = await presenceChannel.track({
            user_id: user.id,
            full_name: profile?.full_name || "Anonymous",
            online_at: new Date().toISOString(),
          });
          console.log("Presence track status:", presenceTrackStatus);
        }
      });

      setChannel(presenceChannel);
    };

    setupPresence();

    return () => {
      if (presenceChannel) {
        presenceChannel.unsubscribe();
        supabase.removeChannel(presenceChannel);
      }
    };
  }, [moduleId]);

  return { presenceUsers, onlineCount: presenceUsers.length };
};
