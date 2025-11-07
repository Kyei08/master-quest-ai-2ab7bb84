import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Star, CheckCircle, Flag, Clock, MessageSquare, ThumbsUp } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { QualityRatingDisplay } from "@/components/quality/QualityRatingDisplay";
import { QualityMetricsCard } from "@/components/quality/QualityMetricsCard";

interface ContentItem {
  id: string;
  module_id: string;
  content: any;
  content_status: "approved" | "draft" | "flagged" | "pending_review";
  average_rating?: number | null;
  total_ratings?: number;
  created_at: string;
  reviewed_at?: string;
  reviewed_by?: string;
  modules: {
    topic: string;
  };
  reviews?: {
    id: string;
    feedback: string | null;
    rating: number | null;
    reviewer_profile: {
      full_name: string | null;
    } | null;
  }[];
}

const ContentReview = () => {
  const [assignments, setAssignments] = useState<ContentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedContent, setSelectedContent] = useState<ContentItem | null>(null);
  const [feedback, setFeedback] = useState("");
  const [rating, setRating] = useState(0);
  const [filterStatus, setFilterStatus] = useState<"approved" | "draft" | "flagged" | "pending_review" | "all">("pending_review");
  const [isInstructor, setIsInstructor] = useState(false);
  const [qualityMetrics, setQualityMetrics] = useState({
    total: 0,
    averageRating: 0,
    excellent: 0,
    good: 0,
    fair: 0,
    poor: 0,
    flagged: 0,
    approved: 0,
  });

  useEffect(() => {
    checkRole();
    loadContent();
    loadQualityMetrics();
  }, [filterStatus]);

  const checkRole = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const { data: roles } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id);

    setIsInstructor(
      roles?.some((r) => r.role === "instructor" || r.role === "admin") || false
    );
  };

  const loadContent = async () => {
    try {
      setLoading(true);

      const query = supabase
        .from("assignments")
        .select(
          `
          *,
          modules!inner (
            topic
          )
        `
        )
        .order("created_at", { ascending: false });

      if (filterStatus !== "all") {
        query.eq("content_status", filterStatus);
      }

      const { data, error } = await query;

      if (error) throw error;

      // Load reviews for each assignment
      const contentWithReviews = await Promise.all(
        (data || []).map(async (item) => {
          const { data: reviews } = await supabase
            .from("content_reviews")
            .select(
              `
              id,
              feedback,
              rating,
              profiles!content_reviews_reviewer_id_fkey (
                full_name
              )
            `
            )
            .eq("content_type", "assignment")
            .eq("content_id", item.id);

          return {
            ...item,
            reviews: reviews?.map((r: any) => ({
              id: r.id,
              feedback: r.feedback,
              rating: r.rating,
              reviewer_profile: r.profiles,
            })) || [],
          };
        })
      );

      setAssignments(contentWithReviews as ContentItem[]);
    } catch (error: any) {
      console.error("Error loading content:", error);
      toast.error("Failed to load content for review");
    } finally {
      setLoading(false);
    }
  };

  const loadQualityMetrics = async () => {
    try {
      const { data: allAssignments } = await supabase
        .from("assignments")
        .select("content_status, average_rating, total_ratings");

      if (!allAssignments) return;

      const metrics = {
        total: allAssignments.length,
        averageRating: 0,
        excellent: 0,
        good: 0,
        fair: 0,
        poor: 0,
        flagged: allAssignments.filter((a) => a.content_status === "flagged").length,
        approved: allAssignments.filter((a) => a.content_status === "approved").length,
      };

      // Calculate average rating and distribution
      const ratedAssignments = allAssignments.filter(
        (a) => a.average_rating && a.total_ratings && a.total_ratings > 0
      );

      if (ratedAssignments.length > 0) {
        const totalRating = ratedAssignments.reduce(
          (sum, a) => sum + (a.average_rating || 0),
          0
        );
        metrics.averageRating = totalRating / ratedAssignments.length;

        // Categorize by rating
        ratedAssignments.forEach((a) => {
          const rating = a.average_rating || 0;
          if (rating >= 4.5) metrics.excellent++;
          else if (rating >= 3.5) metrics.good++;
          else if (rating >= 2.5) metrics.fair++;
          else metrics.poor++;
        });
      }

      setQualityMetrics(metrics);
    } catch (error) {
      console.error("Error loading quality metrics:", error);
    }
  };

  const handleReview = async (
    contentId: string,
    status: "approved" | "draft" | "flagged" | "pending_review",
    contentType: string = "assignment"
  ) => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      // Update assignment status
      const { error: updateError } = await supabase
        .from("assignments")
        .update({
          content_status: status,
          reviewed_at: new Date().toISOString(),
          reviewed_by: user.id,
        })
        .eq("id", contentId);

      if (updateError) throw updateError;

      // Create review record
      const { error: reviewError } = await supabase
        .from("content_reviews")
        .insert([{
          content_type: contentType,
          content_id: contentId,
          reviewer_id: user.id,
          status: status,
          feedback: feedback || null,
          rating: rating || null,
        }] as any);

      if (reviewError) throw reviewError;

      toast.success(
        `Content ${status === "approved" ? "approved" : status === "flagged" ? "flagged" : "updated"} successfully`
      );
      setFeedback("");
      setRating(0);
      setSelectedContent(null);
      loadContent();
      loadQualityMetrics();
    } catch (error: any) {
      console.error("Error reviewing content:", error);
      toast.error("Failed to submit review");
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "approved":
        return (
          <Badge className="bg-success">
            <CheckCircle className="w-3 h-3 mr-1" />
            Approved
          </Badge>
        );
      case "flagged":
        return (
          <Badge variant="destructive">
            <Flag className="w-3 h-3 mr-1" />
            Flagged
          </Badge>
        );
      case "pending_review":
        return (
          <Badge variant="secondary">
            <Clock className="w-3 h-3 mr-1" />
            Pending Review
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (!isInstructor) {
    return (
      <div className="min-h-screen bg-gradient-hero flex items-center justify-center">
        <Card className="p-8">
          <CardHeader>
            <CardTitle>Access Denied</CardTitle>
            <CardDescription>
              You need instructor or admin privileges to access content reviews.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-hero">
      <div className="border-b border-border/50 bg-card/50 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-6">
          <h1 className="text-3xl font-bold mb-2">Content Review Queue</h1>
          <p className="text-muted-foreground">
            Review and approve AI-generated assignments and quizzes
          </p>
        </div>
      </div>

      <main className="container mx-auto px-4 py-8">
        {/* Quality Metrics Overview */}
        <div className="mb-6">
          <QualityMetricsCard metrics={qualityMetrics} />
        </div>

        <Tabs
          value={filterStatus} 
          onValueChange={(value) => setFilterStatus(value as typeof filterStatus)} 
          className="mb-6"
        >
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="pending_review">
              <Clock className="w-4 h-4 mr-2" />
              Pending ({assignments.filter((a) => a.content_status === "pending_review").length})
            </TabsTrigger>
            <TabsTrigger value="approved">
              <CheckCircle className="w-4 h-4 mr-2" />
              Approved
            </TabsTrigger>
            <TabsTrigger value="flagged">
              <Flag className="w-4 h-4 mr-2" />
              Flagged
            </TabsTrigger>
            <TabsTrigger value="all">All</TabsTrigger>
          </TabsList>
        </Tabs>

        {loading ? (
          <div className="text-center py-12 text-muted-foreground">
            Loading content...
          </div>
        ) : assignments.length === 0 ? (
          <Card className="p-12 text-center">
            <MessageSquare className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
            <h3 className="text-lg font-semibold mb-2">No content to review</h3>
            <p className="text-muted-foreground">
              {filterStatus === "pending_review"
                ? "All content has been reviewed"
                : `No ${filterStatus} content found`}
            </p>
          </Card>
        ) : (
          <div className="grid gap-6">
            {assignments.map((assignment) => (
              <Card key={assignment.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-xl mb-2">
                        Assignment: {assignment.modules.topic}
                      </CardTitle>
                      <CardDescription>
                        Created {formatDistanceToNow(new Date(assignment.created_at), {
                          addSuffix: true,
                        })}
                      </CardDescription>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      {getStatusBadge(assignment.content_status)}
                      {assignment.average_rating && assignment.total_ratings ? (
                        <QualityRatingDisplay
                          averageRating={assignment.average_rating}
                          totalRatings={assignment.total_ratings}
                          size="sm"
                          showLabel={false}
                        />
                      ) : null}
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="space-y-4">
                  {/* Low quality warning */}
                  {assignment.content_status === "flagged" && 
                   assignment.average_rating && 
                   assignment.average_rating < 2.5 && (
                    <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                      <Flag className="w-4 h-4 text-red-600" />
                      <div className="flex-1">
                        <p className="text-sm font-medium text-red-600">
                          Auto-Flagged: Low Quality Rating
                        </p>
                        <p className="text-xs text-muted-foreground">
                          This content has been automatically flagged due to an average rating below 2.5
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Show assignment questions */}
                  <div className="bg-accent/30 p-4 rounded-lg">
                    <h4 className="font-semibold mb-3">Questions Preview:</h4>
                    {assignment.content?.questions?.slice(0, 2).map((q: any, idx: number) => (
                      <div key={idx} className="mb-3 last:mb-0">
                        <p className="text-sm font-medium mb-1">
                          {idx + 1}. {q.question}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Type: {q.type} | Marks: {q.marks}
                        </p>
                      </div>
                    ))}
                    {assignment.content?.questions?.length > 2 && (
                      <p className="text-xs text-muted-foreground mt-2">
                        ...and {assignment.content.questions.length - 2} more questions
                      </p>
                    )}
                  </div>

                  {/* Show existing reviews */}
                  {assignment.reviews && assignment.reviews.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="font-semibold text-sm">Previous Reviews:</h4>
                      {assignment.reviews.map((review) => (
                        <div key={review.id} className="bg-muted p-3 rounded-md text-sm">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-medium">
                              {review.reviewer_profile?.full_name || "Anonymous"}
                            </span>
                            {review.rating && (
                              <div className="flex items-center gap-1">
                                {Array.from({ length: review.rating }).map((_, i) => (
                                  <Star
                                    key={i}
                                    className="w-3 h-3 fill-primary text-primary"
                                  />
                                ))}
                              </div>
                            )}
                          </div>
                          {review.feedback && (
                            <p className="text-muted-foreground">{review.feedback}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Review form */}
                  {selectedContent?.id === assignment.id ? (
                    <div className="space-y-4 border-t pt-4">
                      <div>
                        <label className="text-sm font-medium mb-2 block">Rating (optional)</label>
                        <div className="flex gap-2">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <button
                              key={star}
                              onClick={() => setRating(star)}
                              className="transition-transform hover:scale-110"
                            >
                              <Star
                                className={`w-6 h-6 ${
                                  star <= rating
                                    ? "fill-primary text-primary"
                                    : "text-muted-foreground"
                                }`}
                              />
                            </button>
                          ))}
                        </div>
                      </div>

                      <div>
                        <label className="text-sm font-medium mb-2 block">Feedback</label>
                        <Textarea
                          value={feedback}
                          onChange={(e) => setFeedback(e.target.value)}
                          placeholder="Provide feedback about this content..."
                          rows={3}
                        />
                      </div>

                      <div className="flex gap-2">
                        <Button
                          onClick={() => handleReview(assignment.id, "approved")}
                          className="bg-success hover:bg-success/90"
                        >
                          <CheckCircle className="w-4 h-4 mr-2" />
                          Approve
                        </Button>
                        <Button
                          onClick={() => handleReview(assignment.id, "flagged")}
                          variant="destructive"
                        >
                          <Flag className="w-4 h-4 mr-2" />
                          Flag for Revision
                        </Button>
                        <Button
                          onClick={() => {
                            setSelectedContent(null);
                            setFeedback("");
                            setRating(0);
                          }}
                          variant="outline"
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <Button
                      onClick={() => setSelectedContent(assignment)}
                      disabled={assignment.content_status !== "pending_review"}
                    >
                      <MessageSquare className="w-4 h-4 mr-2" />
                      Review This Content
                    </Button>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default ContentReview;
