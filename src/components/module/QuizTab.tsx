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

interface QuizMetrics {
  practicalityTheoretical: string;
  predictability: string;
  difficulty: string;
  alignment: string;
  learningTime: string;
  proficiency: string;
}

interface QuizData {
  questions: Question[];
  metrics?: QuizMetrics;
}

interface QuizTabProps {
  moduleId: string;
  moduleTopic: string;
  onComplete: () => void;
}

const QuizTab = ({ moduleId, moduleTopic, onComplete }: QuizTabProps) => {
  const [quizData, setQuizData] = useState<QuizData | null>(null);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [generating, setGenerating] = useState(false);
  const [quizType, setQuizType] = useState<"quiz" | "final_test" | null>(null);
  const [showResults, setShowResults] = useState(false);
  const [score, setScore] = useState(0);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);

  const generateQuiz = async (type: "quiz" | "final_test") => {
    setGenerating(true);
    setQuizType(type);
    setShowResults(false);
    setAnswers({});
    setCurrentQuestionIndex(0);

    try {
      const { data, error } = await supabase.functions.invoke("generate-quiz", {
        body: { moduleId, topic: moduleTopic, quizType: type },
      });

      if (error) throw error;

      setQuizData(data);
      toast.success(`${type === "quiz" ? "Quiz" : "Final Test"} generated!`);
    } catch (error: any) {
      console.error("Quiz generation error:", error);
      toast.error(error.message || "Failed to generate quiz");
    } finally {
      setGenerating(false);
    }
  };

  const submitQuiz = async () => {
    if (!quizData) return;
    
    let correctCount = 0;
    quizData.questions.forEach((q, index) => {
      if (answers[index] === q.correctAnswer) {
        correctCount++;
      }
    });

    const percentage = Math.round((correctCount / quizData.questions.length) * 100);
    setScore(percentage);
    setShowResults(true);

    try {
      await supabase.from("quiz_attempts").insert([
        {
          module_id: moduleId,
          score: correctCount,
          total_questions: quizData.questions.length,
          attempt_type: quizType,
        },
      ]);

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

  if (!quizData) {
    return (
      <div className="grid gap-4 md:grid-cols-2">
        <Card className="shadow-card-custom">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-primary" />
              Practice Quiz
            </CardTitle>
            <CardDescription>
              Test your understanding with a practice quiz (25 questions)
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
              className="w-full bg-red-600 hover:bg-red-700"
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
          <CardTitle>
            {quizType === "quiz" ? "Quiz Results" : "Final Test Results"}
          </CardTitle>
        </CardHeader>
        <CardContent className="text-center">
          <div className="mb-6">
            <div className="text-6xl font-bold mb-2">{score}%</div>
            <Badge variant={score >= 80 ? "default" : "destructive"} className="mb-4">
              {score >= 80 ? "Passed!" : "Keep Practicing"}
            </Badge>
            <p className="text-muted-foreground">
              You got {Object.values(answers).filter((a, i) => a === quizData!.questions[i].correctAnswer).length} out of{" "}
              {quizData!.questions.length} correct
            </p>
          </div>
          <Button onClick={() => { setQuizData(null); setShowResults(false); }}>
            <RotateCcw className="w-4 h-4 mr-2" />
            Try Again
          </Button>
        </CardContent>
      </Card>
    );
  }

  const totalQuestions = quizData.questions.length;
  const questionsPerPage = 5;
  const startIndex = currentQuestionIndex;
  const endIndex = Math.min(startIndex + questionsPerPage, totalQuestions);
  const currentQuestions = quizData.questions.slice(startIndex, endIndex);

  return (
    <Card className="shadow-card-custom">
      <CardHeader>
        <div className="flex items-center justify-between mb-4">
          <CardTitle>
            Module: {moduleTopic} - {quizType === "quiz" ? "Quiz" : "Final Test"}
          </CardTitle>
          <Badge>{Object.keys(answers).length} / {totalQuestions} answered</Badge>
        </div>
        <p className="text-sm text-muted-foreground mb-4">
          Test your understanding with a practice {quizType === "quiz" ? "quiz" : "test"} based on the module resources.
        </p>

        {quizData.metrics && (
          <div className="bg-purple-50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800 rounded-lg p-4 mb-4">
            <h4 className="font-semibold text-purple-900 dark:text-purple-100 mb-3">
              {quizType === "quiz" ? "Quiz" : "Final Test"} Details (AI Metrics)
            </h4>
            <div className="space-y-1 text-sm">
              <p>• **Practicality/Theoretical:** {quizData.metrics.practicalityTheoretical}</p>
              <p>• **Predictability:** {quizData.metrics.predictability}</p>
              <p>• **Difficulty:** {quizData.metrics.difficulty}</p>
              <p>• **Alignment:** {quizData.metrics.alignment}</p>
              <p>• **Learning Time:** {quizData.metrics.learningTime}</p>
              <p>• **Proficiency Required:** {quizData.metrics.proficiency}</p>
            </div>
          </div>
        )}

        <div className="flex gap-2 flex-wrap">
          {Array.from({ length: Math.ceil(totalQuestions / questionsPerPage) }, (_, i) => (
            <Button
              key={i}
              variant={Math.floor(currentQuestionIndex / questionsPerPage) === i ? "default" : "outline"}
              onClick={() => setCurrentQuestionIndex(i * questionsPerPage)}
              size="sm"
            >
              Question {i * questionsPerPage + 1}
            </Button>
          ))}
        </div>
      </CardHeader>
      
      <CardContent className="space-y-6">
        <h3 className="text-lg font-semibold">Your {quizType === "quiz" ? "Quiz" : "Test"} Questions</h3>
        
        {currentQuestions.map((q, localIndex) => {
          const qIndex = startIndex + localIndex;
          return (
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
          );
        })}

        <div className="flex justify-between items-center pt-4">
          <Button
            variant="outline"
            onClick={() => setCurrentQuestionIndex(Math.max(0, currentQuestionIndex - questionsPerPage))}
            disabled={currentQuestionIndex === 0}
          >
            Previous
          </Button>
          
          {endIndex < totalQuestions ? (
            <Button onClick={() => setCurrentQuestionIndex(endIndex)}>
              Next
            </Button>
          ) : (
            <Button
              onClick={submitQuiz}
              disabled={Object.keys(answers).length !== totalQuestions}
              className={quizType === "final_test" ? "bg-red-600 hover:bg-red-700" : ""}
            >
              Submit {quizType === "quiz" ? "Quiz" : "Final Test"}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default QuizTab;
