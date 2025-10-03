import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Sparkles, GraduationCap, RotateCcw } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface Question {
  question: string;
  options: string[];
  correctAnswer: number;
}

interface QuizTabProps {
  moduleId: string;
  moduleTopic: string;
  onComplete: () => void;
}

const QuizTab = ({ moduleId, moduleTopic, onComplete }: QuizTabProps) => {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [generating, setGenerating] = useState(false);
  const [quizType, setQuizType] = useState<"quiz" | "final_test" | null>(null);
  const [showResults, setShowResults] = useState(false);
  const [score, setScore] = useState(0);

  const generateQuiz = async (type: "quiz" | "final_test") => {
    setGenerating(true);
    setQuizType(type);
    setShowResults(false);
    setAnswers({});

    try {
      const { data, error } = await supabase.functions.invoke("generate-quiz", {
        body: { moduleId, topic: moduleTopic, quizType: type },
      });

      if (error) throw error;

      setQuestions(data.questions);
      toast.success(`${type === "quiz" ? "Quiz" : "Final Test"} generated!`);
    } catch (error: any) {
      toast.error(error.message || "Failed to generate quiz");
    } finally {
      setGenerating(false);
    }
  };

  const submitQuiz = async () => {
    let correctCount = 0;
    questions.forEach((q, index) => {
      if (answers[index] === q.correctAnswer) {
        correctCount++;
      }
    });

    const percentage = Math.round((correctCount / questions.length) * 100);
    setScore(percentage);
    setShowResults(true);

    // Save attempt
    try {
      await supabase.from("quiz_attempts").insert([
        {
          module_id: moduleId,
          score: correctCount,
          total_questions: questions.length,
          attempt_type: quizType,
        },
      ]);

      // Update module status if final test
      if (quizType === "final_test") {
        const status = percentage >= 80 ? "completed" : "needs_revisit";
        await supabase
          .from("modules")
          .update({ status, final_score: percentage })
          .eq("id", moduleId);

        if (percentage >= 80) {
          toast.success("🎉 Congratulations! Module completed!");
        } else {
          toast.error("Keep practicing! You need 80% to pass.");
        }

        onComplete();
      }
    } catch (error: any) {
      console.error("Failed to save attempt:", error);
    }
  };

  if (questions.length === 0) {
    return (
      <div className="grid gap-4 md:grid-cols-2">
        <Card className="shadow-card-custom">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-primary" />
              Practice Quiz
            </CardTitle>
            <CardDescription>
              Test your knowledge with unlimited practice quizzes
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => generateQuiz("quiz")} disabled={generating} className="w-full">
              {generating ? "Generating..." : "Generate Practice Quiz"}
            </Button>
          </CardContent>
        </Card>

        <Card className="shadow-card-custom border-primary/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <GraduationCap className="w-5 h-5 text-accent" />
              Final Test
            </CardTitle>
            <CardDescription>
              Take the final test to complete this module (80% required)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              onClick={() => generateQuiz("final_test")}
              disabled={generating}
              variant="default"
              className="w-full"
            >
              {generating ? "Generating..." : "Take Final Test"}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (showResults) {
    return (
      <Card className="shadow-card-custom">
        <CardHeader>
          <CardTitle>Quiz Results</CardTitle>
        </CardHeader>
        <CardContent className="text-center">
          <div className="mb-6">
            <div className="text-6xl font-bold mb-2">{score}%</div>
            <Badge variant={score >= 80 ? "default" : "destructive"} className="mb-4">
              {score >= 80 ? "Passed!" : "Keep Practicing"}
            </Badge>
            <p className="text-muted-foreground">
              You got {Object.values(answers).filter((a, i) => a === questions[i].correctAnswer).length} out of{" "}
              {questions.length} correct
            </p>
          </div>
          <Button onClick={() => { setQuestions([]); setShowResults(false); }}>
            <RotateCcw className="w-4 h-4 mr-2" />
            Try Again
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-card-custom">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>
            {quizType === "quiz" ? "Practice Quiz" : "Final Test"}
          </CardTitle>
          <Badge>{Object.keys(answers).length} / {questions.length} answered</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {questions.map((q, qIndex) => (
          <div key={qIndex} className="p-4 bg-muted/50 rounded-lg">
            <h4 className="font-medium mb-4">
              {qIndex + 1}. {q.question}
            </h4>
            <RadioGroup
              value={answers[qIndex]?.toString()}
              onValueChange={(value) => setAnswers({ ...answers, [qIndex]: parseInt(value) })}
            >
              {q.options.map((option, oIndex) => (
                <div key={oIndex} className="flex items-center space-x-2">
                  <RadioGroupItem value={oIndex.toString()} id={`q${qIndex}-o${oIndex}`} />
                  <Label htmlFor={`q${qIndex}-o${oIndex}`} className="cursor-pointer">
                    {option}
                  </Label>
                </div>
              ))}
            </RadioGroup>
          </div>
        ))}
        <Button
          onClick={submitQuiz}
          disabled={Object.keys(answers).length !== questions.length}
          className="w-full"
        >
          Submit {quizType === "quiz" ? "Quiz" : "Final Test"}
        </Button>
      </CardContent>
    </Card>
  );
};

export default QuizTab;
