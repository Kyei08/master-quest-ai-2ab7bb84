import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Lightbulb } from "lucide-react";

interface AlternativeQuestionDialogProps {
  assignmentId: string;
  originalQuestionIndex: number;
  originalQuestion: string;
  onSubmitSuccess: () => void;
}

export const AlternativeQuestionDialog = ({
  assignmentId,
  originalQuestionIndex,
  originalQuestion,
  onSubmitSuccess,
}: AlternativeQuestionDialogProps) => {
  const [open, setOpen] = useState(false);
  const [suggestedQuestion, setSuggestedQuestion] = useState("");
  const [reasoning, setReasoning] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!suggestedQuestion.trim() || !reasoning.trim()) {
      toast.error("Please provide both a suggested question and reasoning");
      return;
    }

    setSubmitting(true);
    try {
      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError) throw userError;

      const { error } = await supabase
        .from("alternative_questions")
        .insert({
          assignment_id: assignmentId,
          original_question_index: originalQuestionIndex,
          suggested_by: userData.user.id,
          suggested_question: suggestedQuestion,
          reasoning: reasoning,
          status: "pending_review",
        });

      if (error) throw error;

      toast.success("Alternative question submitted for review");
      setSuggestedQuestion("");
      setReasoning("");
      setOpen(false);
      onSubmitSuccess();
    } catch (error: any) {
      console.error("Failed to submit alternative question:", error);
      toast.error(error.message || "Failed to submit alternative question");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="h-8">
          <Lightbulb className="h-4 w-4 mr-1" />
          Suggest Alternative
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Suggest Alternative Question</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 mt-4">
          <div>
            <Label className="text-sm font-semibold mb-2">Original Question</Label>
            <div className="p-3 bg-muted rounded-md text-sm">
              {originalQuestion}
            </div>
          </div>

          <div>
            <Label htmlFor="suggested-question">Suggested Alternative Question *</Label>
            <Textarea
              id="suggested-question"
              placeholder="Enter your improved version of the question..."
              value={suggestedQuestion}
              onChange={(e) => setSuggestedQuestion(e.target.value)}
              className="min-h-[120px] mt-2"
            />
          </div>

          <div>
            <Label htmlFor="reasoning">Reasoning / Improvement Explanation *</Label>
            <Textarea
              id="reasoning"
              placeholder="Explain why this alternative is better (e.g., clearer wording, better aligns with learning objectives, reduces ambiguity...)"
              value={reasoning}
              onChange={(e) => setReasoning(e.target.value)}
              className="min-h-[100px] mt-2"
            />
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={() => setOpen(false)} disabled={submitting}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={submitting}>
              {submitting ? "Submitting..." : "Submit for Review"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
