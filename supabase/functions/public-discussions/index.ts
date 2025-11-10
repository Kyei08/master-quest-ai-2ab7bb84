// Public Discussions Edge Function
// Read-only access to discussions and replies when a valid share token is provided.
// Route examples:
// - GET /functions/v1/public-discussions?moduleId=...&token=...
// - GET /functions/v1/public-discussions?moduleId=...&token=...&discussionId=...

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.58.0";

serve(async (req) => {
  try {
    const url = new URL(req.url);
    const moduleId = url.searchParams.get("moduleId");
    const token = url.searchParams.get("token");
    const discussionId = url.searchParams.get("discussionId");

    if (!moduleId || !token) {
      return new Response(JSON.stringify({ error: "Missing moduleId or token" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !serviceRoleKey) {
      return new Response(JSON.stringify({ error: "Server not configured" }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Validate token belongs to this module and is active
    const { data: share, error: shareError } = await supabase
      .from("module_shares")
      .select("module_id, is_active")
      .eq("share_token", token)
      .single();

    if (shareError || !share || !share.is_active || share.module_id !== moduleId) {
      return new Response(JSON.stringify({ error: "Invalid or expired share token" }), {
        status: 403,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (discussionId) {
      // Return single discussion with replies
      const { data: discussion, error: discussionError } = await supabase
        .from("discussions")
        .select(
          `*, profiles!discussions_user_id_fkey(full_name)`
        )
        .eq("id", discussionId)
        .maybeSingle();

      if (discussionError || !discussion) {
        return new Response(JSON.stringify({ error: "Discussion not found" }), {
          status: 404,
          headers: { "Content-Type": "application/json" },
        });
      }

      // Ensure discussion belongs to the shared module
      if (discussion.module_id !== moduleId) {
        return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403 });
      }

      const { data: replies, error: repliesError } = await supabase
        .from("discussion_replies")
        .select(`*, profiles!discussion_replies_user_id_fkey(full_name)`) 
        .eq("discussion_id", discussionId)
        .order("is_best_answer", { ascending: false })
        .order("upvotes", { ascending: false });

      if (repliesError) {
        return new Response(JSON.stringify({ error: "Failed to load replies" }), { status: 500 });
      }

      return new Response(
        JSON.stringify({ discussion, replies, user_upvoted: false, reply_upvotes: [] }),
        { headers: { "Content-Type": "application/json" } }
      );
    }

    // List discussions for the module
    const { data: discussions, error: discussionsError } = await supabase
      .from("discussions")
      .select(`*, profiles!discussions_user_id_fkey(full_name)`) 
      .eq("module_id", moduleId)
      .order("created_at", { ascending: false });

    if (discussionsError) {
      return new Response(JSON.stringify({ error: "Failed to load discussions" }), { status: 500 });
    }

    // Compute reply counts
    const ids = discussions.map((d) => d.id);
    let replyCounts: Record<string, number> = {};
    if (ids.length > 0) {
      const { data: replies } = await supabase
        .from("discussion_replies")
        .select("discussion_id")
        .in("discussion_id", ids);
      if (replies) {
        replyCounts = replies.reduce((acc: Record<string, number>, r: any) => {
          acc[r.discussion_id] = (acc[r.discussion_id] || 0) + 1;
          return acc;
        }, {});
      }
    }

    const formatted = discussions.map((d: any) => ({
      ...d,
      _count: { replies: replyCounts[d.id] || 0 },
      user_upvoted: false, // public viewer
    }));

    return new Response(JSON.stringify({ discussions: formatted }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ error: "Unexpected error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});
