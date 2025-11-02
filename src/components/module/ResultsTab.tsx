import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Trophy, Download, Clock, Target, Eye, FileText, CheckCircle, AlertCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";

interface QuizAttempt {
  id: string;
  score: number;
  total_questions: number;
  attempt_type: string;
  created_at: string;
}

interface AssignmentSubmission {
  id: string;
  submitted_at: string;
  status: string;
  score: number | null;
  total_marks: number;
  feedback: string | null;
}

interface ResultsTabProps {
  moduleId: string;
  module: any;
  onReload: () => void;
}

const ResultsTab = ({ moduleId, module, onReload }: ResultsTabProps) => {
  const [attempts, setAttempts] = useState<QuizAttempt[]>([]);
  const [assignmentSubmissions, setAssignmentSubmissions] = useState<AssignmentSubmission[]>([]);
  const [selectedSubmission, setSelectedSubmission] = useState<AssignmentSubmission | null>(null);
  const [submissionAnswers, setSubmissionAnswers] = useState<Record<string, string>>({});

  useEffect(() => {
    loadAttempts();
    loadAssignmentSubmissions();
  }, [moduleId]);

  const loadAttempts = async () => {
    const { data, error } = await supabase
      .from("quiz_attempts")
      .select("*")
      .eq("module_id", moduleId)
      .order("created_at", { ascending: false });

    if (error) {
      toast.error("Failed to load attempts");
      return;
    }

    setAttempts(data || []);
  };

  const loadAssignmentSubmissions = async () => {
    const { data, error } = await supabase
      .from("assignment_submissions")
      .select("*")
      .eq("module_id", moduleId)
      .order("submitted_at", { ascending: false });

    if (error) {
      console.error("Failed to load assignment submissions:", error);
      return;
    }

    setAssignmentSubmissions(data || []);
  };

  const downloadCertificate = () => {
    toast.success("Certificate download coming soon!");
  };

  const viewSubmission = async (submission: AssignmentSubmission) => {
    setSelectedSubmission(submission);
    // Fetch the submission details to get answers
    const { data, error } = await supabase
      .from("assignment_submissions")
      .select("answers")
      .eq("id", submission.id)
      .single();

    if (error) {
      toast.error("Failed to load submission details");
      return;
    }

    setSubmissionAnswers(data.answers as Record<string, string>);
  };

  const quizAttempts = attempts.filter((a) => a.attempt_type === "quiz");
  const finalAttempts = attempts.filter((a) => a.attempt_type === "final_test");

  return (
    <div className="space-y-6">
      {/* Module Status */}
      <Card className="shadow-card-custom border-primary/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="w-5 h-5 text-primary" />
            Module Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="text-center p-4 bg-muted/50 rounded-lg">
              <div className="text-sm text-muted-foreground mb-1">Status</div>
              <Badge
                variant={module.status === "completed" ? "default" : "secondary"}
                className="text-lg"
              >
                {module.status.replace("_", " ").toUpperCase()}
              </Badge>
            </div>
            <div className="text-center p-4 bg-muted/50 rounded-lg">
              <div className="text-sm text-muted-foreground mb-1">Final Score</div>
              <div className="text-2xl font-bold">
                {module.final_score !== null ? `${module.final_score}%` : "—"}
              </div>
            </div>
            <div className="text-center p-4 bg-muted/50 rounded-lg">
              <div className="text-sm text-muted-foreground mb-1">Attempts</div>
              <div className="text-2xl font-bold">{attempts.length + assignmentSubmissions.length}</div>
            </div>
          </div>
          {module.status === "completed" && (
            <Button onClick={downloadCertificate} className="w-full mt-4">
              <Download className="w-4 h-4 mr-2" />
              Download Certificate
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Assignment Submissions */}
      {assignmentSubmissions.length > 0 && (
        <Card className="shadow-card-custom">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-primary" />
              Assignment Submissions
            </CardTitle>
            <CardDescription>Track your assignment submissions and view details</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {assignmentSubmissions.map((submission) => {
                const percentage = submission.score !== null 
                  ? Math.round((submission.score / submission.total_marks) * 100) 
                  : null;
                
                return (
                  <div key={submission.id} className="p-4 bg-muted/50 rounded-lg border-l-4 border-primary">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center gap-3">
                          <Clock className="w-4 h-4 text-muted-foreground" />
                          <span className="text-sm font-medium">
                            {new Date(submission.submitted_at).toLocaleString()}
                          </span>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          {submission.status === "graded" ? (
                            <CheckCircle className="w-4 h-4 text-green-500" />
                          ) : (
                            <AlertCircle className="w-4 h-4 text-yellow-500" />
                          )}
                          <Badge variant={
                            submission.status === "graded" 
                              ? "default" 
                              : submission.status === "submitted" 
                                ? "secondary" 
                                : "outline"
                          }>
                            {submission.status.toUpperCase()}
                          </Badge>
                        </div>

                        {submission.feedback && (
                          <div className="mt-3 p-3 bg-background rounded border border-border">
                            <p className="text-sm font-semibold mb-1">Instructor Feedback:</p>
                            <p className="text-sm text-muted-foreground">{submission.feedback}</p>
                          </div>
                        )}
                      </div>

                      <div className="flex flex-col items-end gap-3">
                        {submission.score !== null ? (
                          <div className="text-right">
                            <div className="text-2xl font-bold">{percentage}%</div>
                            <div className="text-sm text-muted-foreground">
                              {submission.score}/{submission.total_marks} marks
                            </div>
                          </div>
                        ) : (
                          <div className="text-right">
                            <div className="text-sm text-muted-foreground">Awaiting grade</div>
                            <div className="text-xs text-muted-foreground">
                              Total: {submission.total_marks} marks
                            </div>
                          </div>
                        )}

                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => viewSubmission(submission)}
                        >
                          <Eye className="w-4 h-4 mr-2" />
                          View Answers
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Assignment Submission Details Dialog */}
      <Dialog open={!!selectedSubmission} onOpenChange={() => setSelectedSubmission(null)}>
        <DialogContent className="max-w-4xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>Assignment Submission Details</DialogTitle>
            <DialogDescription>
              Submitted on {selectedSubmission && new Date(selectedSubmission.submitted_at).toLocaleString()}
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="h-[60vh] pr-4">
            <div className="space-y-4">
              {Object.entries(submissionAnswers).map(([taskId, answer]) => (
                <Card key={taskId}>
                  <CardHeader>
                    <CardTitle className="text-base">{taskId}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="whitespace-pre-wrap text-sm bg-muted/50 p-3 rounded">
                      {answer || <span className="text-muted-foreground italic">No answer provided</span>}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* Final Test Attempts */}
      {finalAttempts.length > 0 && (
        <Card className="shadow-card-custom">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="w-5 h-5 text-accent" />
              Final Test History
            </CardTitle>
            <CardDescription>Track your progress on final tests</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {finalAttempts.map((attempt) => {
                const percentage = Math.round((attempt.score / attempt.total_questions) * 100);
                return (
                  <div key={attempt.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <Clock className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm">{new Date(attempt.created_at).toLocaleString()}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm">
                        {attempt.score}/{attempt.total_questions}
                      </span>
                      <Badge variant={percentage >= 80 ? "default" : "destructive"}>
                        {percentage}%
                      </Badge>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Practice Quiz History */}
      {quizAttempts.length > 0 && (
        <Card className="shadow-card-custom">
          <CardHeader>
            <CardTitle>Practice Quiz History</CardTitle>
            <CardDescription>Your practice attempts</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {quizAttempts.slice(0, 10).map((attempt) => {
                const percentage = Math.round((attempt.score / attempt.total_questions) * 100);
                return (
                  <div key={attempt.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <Clock className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm">{new Date(attempt.created_at).toLocaleString()}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm">
                        {attempt.score}/{attempt.total_questions}
                      </span>
                      <Badge variant="secondary">{percentage}%</Badge>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {attempts.length === 0 && assignmentSubmissions.length === 0 && (
        <Card className="shadow-card-custom">
          <CardContent className="py-12 text-center">
            <Trophy className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground">
              No attempts yet. Complete assignments, quizzes, or final tests to see results here.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default ResultsTab;
