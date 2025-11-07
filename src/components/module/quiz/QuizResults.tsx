import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { RotateCcw, FileDown } from "lucide-react";
import { exportQuizToPDF } from "@/lib/pdfExport";

interface Question {
  question: string;
  type: string;
  options?: string[];
  marks: number;
  correctAnswer?: number | string;
  section?: string;
}

interface QuizResultsProps {
  quizType: "quiz" | "final_test";
  score: number;
  totalMarks: number;
  questions: Question[];
  answers: Record<number, number | string>;
  onTryAgain: () => void;
  moduleTopic: string;
}

export const QuizResults = ({ 
  quizType, 
  score, 
  totalMarks, 
  questions, 
  answers, 
  onTryAgain,
  moduleTopic
}: QuizResultsProps) => {
  const totalPossibleMarks = questions.reduce((sum, q) => sum + q.marks, 0);
  const correctAnswers = Object.values(answers).filter(
    (a, i) => a === questions[i].correctAnswer
  ).length;

  return (
    <Card className="shadow-card-custom animate-fade-in">
      <CardHeader className="p-4 sm:p-6">
        <CardTitle className="text-lg sm:text-xl">
          {quizType === "quiz" ? "Quiz Results" : "Final Test Results"}
        </CardTitle>
      </CardHeader>
      <CardContent className="text-center p-4 sm:p-6">
        <div className="mb-6">
          <div className="text-5xl sm:text-6xl font-bold mb-2 animate-scale-in">{score}%</div>
          <Badge 
            variant={score >= 80 ? "default" : "destructive"} 
            className="mb-4 animate-fade-in text-xs sm:text-sm"
          >
            {score >= 80 ? "Passed!" : "Keep Practicing"}
          </Badge>
          <p className="text-sm sm:text-base text-muted-foreground animate-fade-in">
            {quizType === "final_test" 
              ? `You scored ${totalMarks} out of ${totalPossibleMarks} marks`
              : `You got ${correctAnswers} out of ${questions.length} correct`
            }
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button
            variant="outline"
            onClick={() => exportQuizToPDF(moduleTopic, quizType, questions, answers, score)}
            className="transition-all duration-200 hover:scale-105 touch-manipulation"
            size="lg"
          >
            <FileDown className="w-4 h-4 mr-2" />
            Export PDF
          </Button>
          <Button 
            onClick={onTryAgain}
            className="transition-all duration-200 hover:scale-105 touch-manipulation"
            size="lg"
          >
            <RotateCcw className="w-4 h-4 mr-2" />
            Try Again
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
