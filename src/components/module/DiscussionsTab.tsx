import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  MessageCircle,
  Plus,
  ThumbsUp,
  CheckCircle,
  Clock,
  TrendingUp,
  Star,
  Calendar,
} from "lucide-react";
import { DiscussionCard } from "./discussion/DiscussionCard";
import { NewDiscussionDialog } from "./discussion/NewDiscussionDialog";
import { DiscussionDetailDialog } from "./discussion/DiscussionDetailDialog";
import { useModulePresence } from "@/hooks/useModulePresence";
import { ModulePresence } from "./ModulePresence";

interface Discussion {
  id: string;
  title: string;
  content: string;
  upvotes: number;
  is_resolved: boolean;
  created_at: string;
  user_id: string;
  profiles: {
    full_name: string | null;
  };
  _count: {
    replies: number;
  };
  user_upvoted: boolean;
}

interface DiscussionsTabProps {
  moduleId: string;
}

export const DiscussionsTab = ({ moduleId }: DiscussionsTabProps) => {
  const [discussions, setDiscussions] = useState<Discussion[]>([]);
  const [loading, setLoading] = useState(true);
  const [newDialogOpen, setNewDialogOpen] = useState(false);
  const [selectedDiscussion, setSelectedDiscussion] = useState<string | null>(
    null
  );
  const [sortBy, setSortBy] = useState<"hot" | "top" | "new" | "resolved">("hot");
  const { presenceUsers } = useModulePresence(moduleId);

  useEffect(() => {
    loadDiscussions();
  }, [moduleId]);

  const loadDiscussions = async () => {
    try {
      setLoading(true);

      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      // Get discussions with profile data
      const { data: discussionsData, error: discussionsError } = await supabase
        .from("discussions")
        .select(
          `
          *,
          profiles!discussions_user_id_fkey (
            full_name
          )
        `
        )
        .eq("module_id", moduleId)
        .order("created_at", { ascending: false });

      if (discussionsError) throw discussionsError;

      // Get reply counts for each discussion
      const discussionIds = discussionsData.map((d) => d.id);
      const { data: replyCounts } = await supabase
        .from("discussion_replies")
        .select("discussion_id")
        .in("discussion_id", discussionIds);

      // Get user's upvotes
      const { data: userUpvotes } = await supabase
        .from("discussion_upvotes")
        .select("discussion_id")
        .in("discussion_id", discussionIds)
        .eq("user_id", user.id);

      const upvotedIds = new Set(userUpvotes?.map((u) => u.discussion_id) || []);

      // Count replies for each discussion
      const replyCountMap = replyCounts?.reduce((acc, reply) => {
        acc[reply.discussion_id] = (acc[reply.discussion_id] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      const formattedDiscussions = discussionsData.map((d) => ({
        ...d,
        _count: {
          replies: replyCountMap?.[d.id] || 0,
        },
        user_upvoted: upvotedIds.has(d.id),
      }));

      setDiscussions(formattedDiscussions);
    } catch (error) {
      console.error("Error loading discussions:", error);
      toast.error("Failed to load discussions");
    } finally {
      setLoading(false);
    }
  };

  const getSortedDiscussions = () => {
    let sorted = [...discussions];
    
    switch (sortBy) {
      case "hot":
        // Hot: Recent activity + upvotes (decay factor for time)
        sorted.sort((a, b) => {
          const now = Date.now();
          const aAge = (now - new Date(a.created_at).getTime()) / (1000 * 60 * 60); // hours
          const bAge = (now - new Date(b.created_at).getTime()) / (1000 * 60 * 60);
          const aScore = (a.upvotes + a._count.replies * 0.5) / Math.pow(aAge + 2, 1.5);
          const bScore = (b.upvotes + b._count.replies * 0.5) / Math.pow(bAge + 2, 1.5);
          return bScore - aScore;
        });
        break;
      case "top":
        // Top: Most upvotes
        sorted.sort((a, b) => b.upvotes - a.upvotes);
        break;
      case "new":
        // New: Most recent
        sorted.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        break;
      case "resolved":
        // Resolved first, then by hot
        sorted.sort((a, b) => {
          if (a.is_resolved !== b.is_resolved) {
            return a.is_resolved ? -1 : 1;
          }
          const now = Date.now();
          const aAge = (now - new Date(a.created_at).getTime()) / (1000 * 60 * 60);
          const bAge = (now - new Date(b.created_at).getTime()) / (1000 * 60 * 60);
          const aScore = (a.upvotes + a._count.replies * 0.5) / Math.pow(aAge + 2, 1.5);
          const bScore = (b.upvotes + b._count.replies * 0.5) / Math.pow(bAge + 2, 1.5);
          return bScore - aScore;
        });
        break;
    }
    
    return sorted;
  };

  const handleUpvote = async (discussionId: string) => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const discussion = discussions.find((d) => d.id === discussionId);
      if (!discussion) return;

      if (discussion.user_upvoted) {
        // Remove upvote
        const { error } = await supabase
          .from("discussion_upvotes")
          .delete()
          .eq("discussion_id", discussionId)
          .eq("user_id", user.id);

        if (error) throw error;
      } else {
        // Add upvote
        const { error } = await supabase
          .from("discussion_upvotes")
          .insert({ discussion_id: discussionId, user_id: user.id });

        if (error) throw error;
      }

      await loadDiscussions();
    } catch (error) {
      console.error("Error toggling upvote:", error);
      toast.error("Failed to update upvote");
    }
  };

  if (loading) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        Loading discussions...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row gap-6">
        <div className="flex-1 space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <MessageCircle className="w-6 h-6 text-primary" />
              <div>
                <h2 className="text-2xl font-bold">Discussions</h2>
                <p className="text-sm text-muted-foreground">
                  Ask questions and discuss this module
                </p>
              </div>
            </div>
            <Button onClick={() => setNewDialogOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              New Discussion
            </Button>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
            <div className="flex gap-2">
              <Badge variant="secondary" className="flex items-center gap-1">
                <MessageCircle className="w-3 h-3" />
                {discussions.length} discussions
              </Badge>
              <Badge variant="secondary" className="flex items-center gap-1">
                <CheckCircle className="w-3 h-3" />
                {discussions.filter((d) => d.is_resolved).length} resolved
              </Badge>
            </div>

            <Tabs value={sortBy} onValueChange={(v) => setSortBy(v as typeof sortBy)} className="w-full sm:w-auto">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="hot" className="flex items-center gap-1 text-xs sm:text-sm">
                  <TrendingUp className="w-3 h-3" />
                  <span className="hidden sm:inline">Hot</span>
                </TabsTrigger>
                <TabsTrigger value="top" className="flex items-center gap-1 text-xs sm:text-sm">
                  <Star className="w-3 h-3" />
                  <span className="hidden sm:inline">Top</span>
                </TabsTrigger>
                <TabsTrigger value="new" className="flex items-center gap-1 text-xs sm:text-sm">
                  <Calendar className="w-3 h-3" />
                  <span className="hidden sm:inline">New</span>
                </TabsTrigger>
                <TabsTrigger value="resolved" className="flex items-center gap-1 text-xs sm:text-sm">
                  <CheckCircle className="w-3 h-3" />
                  <span className="hidden sm:inline">Solved</span>
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          <Separator />

          {discussions.length === 0 ? (
            <Card className="p-12 text-center">
              <MessageCircle className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
              <h3 className="text-lg font-semibold mb-2">No discussions yet</h3>
              <p className="text-muted-foreground mb-4">
                Be the first to start a discussion about this module
              </p>
              <Button onClick={() => setNewDialogOpen(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Start Discussion
              </Button>
            </Card>
          ) : (
            <div className="space-y-4">
              {getSortedDiscussions().map((discussion) => (
                <DiscussionCard
                  key={discussion.id}
                  discussion={discussion}
                  onUpvote={handleUpvote}
                  onClick={() => setSelectedDiscussion(discussion.id)}
                />
              ))}
            </div>
          )}
        </div>

        {/* Sidebar with presence */}
        <div className="lg:w-64 space-y-4">
          <Card className="p-4">
            <ModulePresence users={presenceUsers} variant="full" />
          </Card>
        </div>
      </div>

      <NewDiscussionDialog
        open={newDialogOpen}
        onOpenChange={setNewDialogOpen}
        moduleId={moduleId}
        onSuccess={loadDiscussions}
      />

      {selectedDiscussion && (
        <DiscussionDetailDialog
          discussionId={selectedDiscussion}
          open={!!selectedDiscussion}
          onOpenChange={(open) => !open && setSelectedDiscussion(null)}
          onUpdate={loadDiscussions}
        />
      )}
    </div>
  );
};
