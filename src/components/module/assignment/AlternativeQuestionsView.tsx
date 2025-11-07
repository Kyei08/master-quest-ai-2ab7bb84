import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CheckCircle, XCircle, TrendingUp, ThumbsUp } from "lucide-react";
import { toast } from "sonner";

interface AlternativeQuestion {
  id: string;
  original_question_index: number;
  suggested_question: string;
  reasoning: string;
  status: "pending_review" | "approved" | "draft" | "flagged";
  upvotes: number;
  created_at: string;
}

interface QuestionMetrics {
  alternative_id: string | null;
  used_original: boolean;
  total_uses: number;
  avg_score: number;
  total_marks: number;
}

interface AlternativeQuestionsViewProps {
  assignmentId: string;
  isInstructor?: boolean;
}

export const AlternativeQuestionsView = ({
  assignmentId,
  isInstructor = false,
}: AlternativeQuestionsViewProps) => {
  const [alternatives, setAlternatives] = useState<AlternativeQuestion[]>([]);
  const [metrics, setMetrics] = useState<QuestionMetrics[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAlternatives();
    if (isInstructor) {
      loadMetrics();
    }
  }, [assignmentId, isInstructor]);

  const loadAlternatives = async () => {
    try {
      const { data, error } = await supabase
        .from("alternative_questions")
        .select("*")
        .eq("assignment_id", assignmentId)
        .order("original_question_index", { ascending: true })
        .order("upvotes", { ascending: false });

      if (error) throw error;
      setAlternatives(data || []);
    } catch (error: any) {
      console.error("Failed to load alternatives:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadMetrics = async () => {
    try {
      const { data, error } = await supabase
        .from("question_usage_metrics")
        .select("alternative_question_id, used_original, score_received, total_marks")
        .eq("assignment_id", assignmentId);

      if (error) throw error;

      // Aggregate metrics
      const metricsMap = new Map<string, QuestionMetrics>();
      
      data?.forEach((record) => {
        const key = record.alternative_question_id || "original";
        const existing = metricsMap.get(key) || {
          alternative_id: record.alternative_question_id,
          used_original: record.used_original,
          total_uses: 0,
          avg_score: 0,
          total_marks: record.total_marks,
        };

        existing.total_uses += 1;
        if (record.score_received !== null) {
          existing.avg_score = (existing.avg_score * (existing.total_uses - 1) + record.score_received) / existing.total_uses;
        }

        metricsMap.set(key, existing);
      });

      setMetrics(Array.from(metricsMap.values()));
    } catch (error: any) {
      console.error("Failed to load metrics:", error);
    }
  };

  const updateStatus = async (id: string, status: "approved" | "flagged") => {
    try {
      const { error } = await supabase
        .from("alternative_questions")
        .update({ status })
        .eq("id", id);

      if (error) throw error;

      toast.success(`Question ${status}`);
      loadAlternatives();
    } catch (error: any) {
      console.error("Failed to update status:", error);
      toast.error("Failed to update question status");
    }
  };

  const getMetricsForQuestion = (alternativeId: string) => {
    return metrics.find((m) => m.alternative_id === alternativeId);
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: any; label: string }> = {
      pending_review: { variant: "secondary", label: "Pending" },
      approved: { variant: "default", label: "Approved" },
      flagged: { variant: "destructive", label: "Flagged" },
      draft: { variant: "outline", label: "Draft" },
    };
    const config = variants[status] || variants.pending_review;
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  if (loading) {
    return <div className="text-center py-8 text-muted-foreground">Loading alternatives...</div>;
  }

  if (alternatives.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          No alternative questions submitted yet.
        </CardContent>
      </Card>
    );
  }

  // Group by question index
  const groupedAlternatives = alternatives.reduce((acc, alt) => {
    const key = alt.original_question_index;
    if (!acc[key]) acc[key] = [];
    acc[key].push(alt);
    return acc;
  }, {} as Record<number, AlternativeQuestion[]>);

  return (
    <div className="space-y-6">
      {Object.entries(groupedAlternatives).map(([index, alts]) => (
        <Card key={index}>
          <CardHeader>
            <CardTitle className="text-lg">Question {index} - Alternative Versions ({alts.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="alternatives" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="alternatives">Alternatives</TabsTrigger>
                {isInstructor && <TabsTrigger value="metrics">Performance Metrics</TabsTrigger>}
              </TabsList>

              <TabsContent value="alternatives" className="space-y-4 mt-4">
                {alts.map((alt) => (
                  <div key={alt.id} className="border rounded-lg p-4 space-y-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2">
                        {getStatusBadge(alt.status)}
                        <div className="flex items-center gap-1 text-sm text-muted-foreground">
                          <ThumbsUp className="h-4 w-4" />
                          {alt.upvotes}
                        </div>
                      </div>
                      {isInstructor && alt.status === "pending_review" && (
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => updateStatus(alt.id, "approved")}
                          >
                            <CheckCircle className="h-4 w-4 mr-1" />
                            Approve
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => updateStatus(alt.id, "flagged")}
                          >
                            <XCircle className="h-4 w-4 mr-1" />
                            Flag
                          </Button>
                        </div>
                      )}
                    </div>
                    <div>
                      <p className="font-medium mb-1">Suggested Question:</p>
                      <p className="text-sm">{alt.suggested_question}</p>
                    </div>
                    <div>
                      <p className="font-medium mb-1">Reasoning:</p>
                      <p className="text-sm text-muted-foreground">{alt.reasoning}</p>
                    </div>
                  </div>
                ))}
              </TabsContent>

              {isInstructor && (
                <TabsContent value="metrics" className="mt-4">
                  <div className="space-y-4">
                    {alts
                      .filter((alt) => alt.status === "approved")
                      .map((alt) => {
                        const metric = getMetricsForQuestion(alt.id);
                        return (
                          <div key={alt.id} className="border rounded-lg p-4">
                            <div className="flex items-start justify-between mb-3">
                              <p className="font-medium text-sm line-clamp-2">{alt.suggested_question}</p>
                            </div>
                            {metric ? (
                              <div className="grid grid-cols-3 gap-4 text-sm">
                                <div>
                                  <p className="text-muted-foreground">Total Uses</p>
                                  <p className="text-lg font-semibold">{metric.total_uses}</p>
                                </div>
                                <div>
                                  <p className="text-muted-foreground">Avg Score</p>
                                  <p className="text-lg font-semibold">
                                    {metric.avg_score.toFixed(1)}/{metric.total_marks}
                                  </p>
                                </div>
                                <div>
                                  <p className="text-muted-foreground">Success Rate</p>
                                  <p className="text-lg font-semibold flex items-center">
                                    <TrendingUp className="h-4 w-4 mr-1 text-green-600" />
                                    {((metric.avg_score / metric.total_marks) * 100).toFixed(0)}%
                                  </p>
                                </div>
                              </div>
                            ) : (
                              <p className="text-sm text-muted-foreground">No usage data yet</p>
                            )}
                          </div>
                        );
                      })}
                    {alts.every((alt) => alt.status !== "approved") && (
                      <p className="text-sm text-muted-foreground text-center py-4">
                        No approved alternatives to show metrics for
                      </p>
                    )}
                  </div>
                </TabsContent>
              )}
            </Tabs>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};
