import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  ThumbsUp,
  MessageCircle,
  CheckCircle,
  Clock,
  Check,
  ArrowUp,
  ArrowDown,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { z } from "zod";

const replySchema = z.object({
  content: z
    .string()
    .trim()
    .min(1, "Reply cannot be empty")
    .max(5000, "Reply must be less than 5000 characters"),
});

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
  user_upvoted: boolean;
}

interface Reply {
  id: string;
  content: string;
  upvotes: number;
  is_best_answer: boolean;
  created_at: string;
  user_id: string;
  profiles: {
    full_name: string | null;
  };
  user_upvoted: boolean;
}

interface DiscussionDetailDialogProps {
  discussionId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdate: () => void;
}

export const DiscussionDetailDialog = ({
  discussionId,
  open,
  onOpenChange,
  onUpdate,
}: DiscussionDetailDialogProps) => {
  const [discussion, setDiscussion] = useState<Discussion | null>(null);
  const [replies, setReplies] = useState<Reply[]>([]);
  const [loading, setLoading] = useState(true);
  const [replyContent, setReplyContent] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [isInstructor, setIsInstructor] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (open) {
      loadDiscussion();
      checkInstructorRole();
    }
  }, [discussionId, open]);

  const checkInstructorRole = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data: roles } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id);

      setIsInstructor(
        roles?.some((r) => r.role === "instructor" || r.role === "admin") ||
          false
      );
    } catch (error) {
      console.error("Error checking role:", error);
    }
  };

  const loadDiscussion = async () => {
    try {
      setLoading(true);

      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }

      // Load discussion
      const { data: discussionData, error: discussionError } = await supabase
        .from("discussions")
        .select(
          `
          *,
          profiles!discussions_user_id_fkey (
            full_name
          )
        `
        )
        .eq("id", discussionId)
        .single();

      if (discussionError) throw discussionError;

      // Check if user upvoted discussion
      const { data: userDiscussionUpvote } = await supabase
        .from("discussion_upvotes")
        .select("id")
        .eq("discussion_id", discussionId)
        .eq("user_id", user.id)
        .maybeSingle();

      setDiscussion({
        ...discussionData,
        user_upvoted: !!userDiscussionUpvote,
      });

      // Load replies
      const { data: repliesData, error: repliesError } = await supabase
        .from("discussion_replies")
        .select(
          `
          *,
          profiles!discussion_replies_user_id_fkey (
            full_name
          )
        `
        )
        .eq("discussion_id", discussionId)
        .order("is_best_answer", { ascending: false })
        .order("upvotes", { ascending: false });

      if (repliesError) throw repliesError;

      // Get user's reply upvotes
      const replyIds = repliesData.map((r) => r.id);
      const { data: userReplyUpvotes } = await supabase
        .from("reply_upvotes")
        .select("reply_id")
        .in("reply_id", replyIds)
        .eq("user_id", user.id);

      const upvotedReplyIds = new Set(
        userReplyUpvotes?.map((u) => u.reply_id) || []
      );

      setReplies(
        repliesData.map((r) => ({
          ...r,
          user_upvoted: upvotedReplyIds.has(r.id),
        }))
      );
    } catch (error) {
      console.error("Error loading discussion:", error);
      toast.error("Failed to load discussion");
    } finally {
      setLoading(false);
    }
  };

  const handleUpvoteDiscussion = async () => {
    if (!discussion) return;

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      if (discussion.user_upvoted) {
        await supabase
          .from("discussion_upvotes")
          .delete()
          .eq("discussion_id", discussionId)
          .eq("user_id", user.id);
      } else {
        await supabase
          .from("discussion_upvotes")
          .insert({ discussion_id: discussionId, user_id: user.id });
      }

      await loadDiscussion();
      onUpdate();
    } catch (error) {
      console.error("Error toggling upvote:", error);
      toast.error("Failed to update upvote");
    }
  };

  const handleUpvoteReply = async (replyId: string) => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const reply = replies.find((r) => r.id === replyId);
      if (!reply) return;

      if (reply.user_upvoted) {
        await supabase
          .from("reply_upvotes")
          .delete()
          .eq("reply_id", replyId)
          .eq("user_id", user.id);
      } else {
        await supabase
          .from("reply_upvotes")
          .insert({ reply_id: replyId, user_id: user.id });
      }

      await loadDiscussion();
    } catch (error) {
      console.error("Error toggling reply upvote:", error);
      toast.error("Failed to update upvote");
    }
  };

  const handleMarkBestAnswer = async (replyId: string) => {
    if (!isInstructor) return;

    try {
      // Unmark all other answers
      await supabase
        .from("discussion_replies")
        .update({ is_best_answer: false })
        .eq("discussion_id", discussionId);

      // Mark this as best answer
      await supabase
        .from("discussion_replies")
        .update({ is_best_answer: true })
        .eq("id", replyId);

      // Mark discussion as resolved
      await supabase
        .from("discussions")
        .update({ is_resolved: true })
        .eq("id", discussionId);

      toast.success("Marked as best answer");
      await loadDiscussion();
      onUpdate();
    } catch (error) {
      console.error("Error marking best answer:", error);
      toast.error("Failed to mark as best answer");
    }
  };

  const handleSubmitReply = async () => {
    try {
      setError("");

      // Validate input
      const result = replySchema.safeParse({ content: replyContent });
      if (!result.success) {
        setError(result.error.errors[0].message);
        return;
      }

      setSubmitting(true);

      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        toast.error("You must be logged in to reply");
        return;
      }

      const { error: replyError } = await supabase
        .from("discussion_replies")
        .insert({
          discussion_id: discussionId,
          user_id: user.id,
          content: result.data.content,
        });

      if (replyError) throw replyError;

      toast.success("Reply posted successfully");
      setReplyContent("");
      await loadDiscussion();
    } catch (error) {
      console.error("Error submitting reply:", error);
      toast.error("Failed to post reply");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading || !discussion) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <div className="text-center py-12 text-muted-foreground">
            Loading discussion...
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl pr-8">{discussion.title}</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Discussion Details */}
          <div className="flex gap-6">
            {/* Vote sidebar */}
            <div className="flex flex-col items-center gap-2 pt-2">
              <button
                onClick={handleUpvoteDiscussion}
                className="p-2 hover:bg-accent rounded-md transition-colors"
              >
                <ArrowUp
                  className={`w-6 h-6 ${
                    discussion.user_upvoted
                      ? "text-primary fill-primary"
                      : "text-muted-foreground"
                  }`}
                />
              </button>
              <span
                className={`text-2xl font-bold ${
                  discussion.upvotes > 0 ? "text-foreground" : "text-muted-foreground"
                }`}
              >
                {discussion.upvotes}
              </span>
              <ArrowDown className="w-6 h-6 text-muted-foreground opacity-30" />
              {discussion.is_resolved && (
                <CheckCircle className="w-6 h-6 text-success mt-2" />
              )}
            </div>

            {/* Content */}
            <div className="flex-1 space-y-4">
              <p className="text-base whitespace-pre-wrap leading-relaxed">
                {discussion.content}
              </p>

              <div className="flex items-center justify-between pt-2 border-t">
                <div className="text-xs text-muted-foreground">
                  asked {formatDistanceToNow(new Date(discussion.created_at), {
                    addSuffix: true,
                  })}
                </div>
                <div className="flex items-center gap-2 text-sm bg-accent/50 p-2 rounded-md">
                  <span className="text-muted-foreground text-xs">asked by</span>
                  <span className="font-medium">
                    {discussion.profiles.full_name || "Anonymous"}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <Separator />

          {/* Replies */}
          <div className="space-y-4">
            <h3 className="text-xl font-bold">
              {replies.length} {replies.length === 1 ? "Answer" : "Answers"}
            </h3>

            {replies.map((reply) => (
              <div
                key={reply.id}
                className={`border rounded-lg ${
                  reply.is_best_answer
                    ? "border-success bg-success/5"
                    : "border-border"
                }`}
              >
                <div className="flex gap-6 p-6">
                  {/* Vote sidebar */}
                  <div className="flex flex-col items-center gap-2">
                    <button
                      onClick={() => handleUpvoteReply(reply.id)}
                      className="p-2 hover:bg-accent rounded-md transition-colors"
                    >
                      <ArrowUp
                        className={`w-5 h-5 ${
                          reply.user_upvoted
                            ? "text-primary fill-primary"
                            : "text-muted-foreground"
                        }`}
                      />
                    </button>
                    <span
                      className={`text-xl font-bold ${
                        reply.upvotes > 0 ? "text-foreground" : "text-muted-foreground"
                      }`}
                    >
                      {reply.upvotes}
                    </span>
                    <ArrowDown className="w-5 h-5 text-muted-foreground opacity-30" />
                    {reply.is_best_answer && (
                      <CheckCircle className="w-5 h-5 text-success mt-2 fill-current" />
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex-1 space-y-3">
                    <p className="text-base whitespace-pre-wrap leading-relaxed">
                      {reply.content}
                    </p>

                    <div className="flex items-center justify-between pt-3 border-t">
                      <div className="flex items-center gap-3">
                        {isInstructor && !reply.is_best_answer && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleMarkBestAnswer(reply.id)}
                            className="border-success text-success hover:bg-success hover:text-success-foreground"
                          >
                            <Check className="w-4 h-4 mr-1" />
                            Accept Answer
                          </Button>
                        )}
                        {reply.is_best_answer && (
                          <Badge className="bg-success">
                            <Check className="w-3 h-3 mr-1" />
                            Best Answer
                          </Badge>
                        )}
                      </div>

                      <div className="flex items-center gap-2 text-sm bg-accent/50 p-2 rounded-md">
                        <span className="text-muted-foreground text-xs">
                          answered {formatDistanceToNow(new Date(reply.created_at), {
                            addSuffix: true,
                          })}
                        </span>
                        <span className="text-muted-foreground">by</span>
                        <span className="font-medium">
                          {reply.profiles.full_name || "Anonymous"}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <Separator />

          {/* Reply Form */}
          <div className="space-y-3">
            <h3 className="font-semibold">Your Reply</h3>
            <Textarea
              placeholder="Write your reply..."
              value={replyContent}
              onChange={(e) => {
                setReplyContent(e.target.value);
                setError("");
              }}
              rows={4}
              maxLength={5000}
            />
            {error && <p className="text-sm text-destructive">{error}</p>}
            <div className="flex justify-between items-center">
              <p className="text-xs text-muted-foreground">
                {replyContent.length}/5000 characters
              </p>
              <Button onClick={handleSubmitReply} disabled={submitting}>
                {submitting ? "Posting..." : "Post Reply"}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
