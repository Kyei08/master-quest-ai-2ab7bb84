import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Send } from "lucide-react";

interface QuizNavigationProps {
  currentQuestionIndex: number;
  endIndex: number;
  totalQuestions: number;
  questionsPerPage: number;
  quizType: "quiz" | "final_test";
  answeredCount: number;
  onPrevious: () => void;
  onNext: () => void;
  onSubmit: () => void;
}

export const QuizNavigation = ({
  currentQuestionIndex,
  endIndex,
  totalQuestions,
  questionsPerPage,
  quizType,
  answeredCount,
  onPrevious,
  onNext,
  onSubmit
}: QuizNavigationProps) => {
  const isLastPage = endIndex >= totalQuestions;
  const canSubmit = answeredCount === totalQuestions;

  return (
    <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-3 pt-6 mt-6 border-t">
      <Button
        variant="outline"
        onClick={onPrevious}
        disabled={currentQuestionIndex === 0}
        className="transition-all duration-200 hover:scale-105 touch-manipulation w-full sm:w-auto"
        size="lg"
      >
        <ChevronLeft className="w-4 h-4 mr-2" />
        Previous
      </Button>

      <span className="text-xs sm:text-sm text-muted-foreground text-center order-first sm:order-none">
        Question {currentQuestionIndex + 1} of {totalQuestions}
      </span>

      {isLastPage ? (
        <Button
          onClick={onSubmit}
          disabled={!canSubmit}
          className={`transition-all duration-200 hover:scale-105 touch-manipulation w-full sm:w-auto ${quizType === "final_test" ? "bg-red-600 hover:bg-red-700" : ""}`}
          size="lg"
        >
          <span className="hidden sm:inline">Submit {quizType === "quiz" ? "Quiz" : "Final Test"}</span>
          <span className="sm:hidden">Submit</span>
          <Send className="w-4 h-4 ml-2" />
        </Button>
      ) : (
        <Button
          onClick={onNext}
          className="transition-all duration-200 hover:scale-105 touch-manipulation w-full sm:w-auto"
          size="lg"
        >
          Next
          <ChevronRight className="w-4 h-4 ml-2" />
        </Button>
      )}
    </div>
  );
};
