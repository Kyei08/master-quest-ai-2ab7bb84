import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CardHeader, CardTitle } from "@/components/ui/card";

interface QuizMetrics {
  practicalityTheoretical: string;
  predictability: string;
  difficulty: string;
  alignment: string;
  learningTime: string;
  proficiency: string;
}

interface QuizHeaderProps {
  moduleTopic: string;
  quizType: "quiz" | "final_test";
  answeredCount: number;
  totalQuestions: number;
  currentQuestionIndex: number;
  questionsPerPage: number;
  metrics?: QuizMetrics;
  onPageChange: (index: number) => void;
}

export const QuizHeader = ({
  moduleTopic,
  quizType,
  answeredCount,
  totalQuestions,
  currentQuestionIndex,
  questionsPerPage,
  metrics,
  onPageChange
}: QuizHeaderProps) => {
  const totalPages = Math.ceil(totalQuestions / questionsPerPage);

  return (
    <CardHeader className="p-4 sm:p-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
        <CardTitle className="text-lg sm:text-xl break-words">
          Module: {moduleTopic} - {quizType === "quiz" ? "Quiz" : "Final Test"}
        </CardTitle>
        <Badge className="self-start sm:self-auto">{answeredCount} / {totalQuestions} answered</Badge>
      </div>
      <p className="text-xs sm:text-sm text-muted-foreground mb-4">
        Test your understanding with a practice {quizType === "quiz" ? "quiz" : "test"} based on the module resources.
      </p>

      {metrics && (
        <div className="bg-purple-50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800 rounded-lg p-3 sm:p-4 mb-4">
          <h4 className="font-semibold text-purple-900 dark:text-purple-100 mb-3 text-sm sm:text-base">
            {quizType === "quiz" ? "Quiz" : "Final Test"} Details (AI Metrics)
          </h4>
          <div className="space-y-1 text-xs sm:text-sm">
            <p>• **Practicality/Theoretical:** {metrics.practicalityTheoretical}</p>
            <p>• **Predictability:** {metrics.predictability}</p>
            <p>• **Difficulty:** {metrics.difficulty}</p>
            <p>• **Alignment:** {metrics.alignment}</p>
            <p>• **Learning Time:** {metrics.learningTime}</p>
            <p>• **Proficiency Required:** {metrics.proficiency}</p>
          </div>
        </div>
      )}

      <div className="flex gap-2 flex-wrap">
        {Array.from({ length: totalPages }, (_, i) => (
          <Button
            key={i}
            variant={Math.floor(currentQuestionIndex / questionsPerPage) === i ? "default" : "outline"}
            onClick={() => onPageChange(i * questionsPerPage)}
            size="sm"
            className="min-w-[90px] touch-manipulation"
          >
            <span className="hidden sm:inline">Question {i * questionsPerPage + 1}</span>
            <span className="sm:hidden">Q{i * questionsPerPage + 1}</span>
          </Button>
        ))}
      </div>
    </CardHeader>
  );
};
