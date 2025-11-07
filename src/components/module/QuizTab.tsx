import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import { QuizEmpty } from "./quiz/QuizEmpty";
import { QuizResults } from "./quiz/QuizResults";
import { QuizHeader } from "./quiz/QuizHeader";
import { QuizQuestion } from "./quiz/QuizQuestion";
import { QuizNavigation } from "./quiz/QuizNavigation";

interface Question {
  question: string;
  type: "mcq" | "true_false" | "short_answer" | "case_study" | "essay";
  options?: string[];
  correctAnswer?: number | string;
  marks: number;
  sectionTitle?: string;
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
  quizType: "quiz" | "final_test";
  onComplete: () => void;
}

const QuizTab = ({ moduleId, moduleTopic, quizType, onComplete }: QuizTabProps) => {
  const [quizData, setQuizData] = useState<QuizData | null>(null);
  const [answers, setAnswers] = useState<Record<number, number | string>>({});
  const [generating, setGenerating] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [score, setScore] = useState(0);
  const [totalMarks, setTotalMarks] = useState(0);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [lastAutoSave, setLastAutoSave] = useState<Date | null>(null);
  const [syncing, setSyncing] = useState(false);

  const storageKey = `quizState:${moduleId}:${quizType}`;

  useEffect(() => {
    loadCloudDraft();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storageKey]);

  // Load cloud-saved draft
  const loadCloudDraft = async () => {
    try {
      const { data, error } = await supabase
        .from("module_progress_drafts")
        .select("*")
        .eq("module_id", moduleId)
        .eq("draft_type", "quiz")
        .eq("quiz_type", quizType)
        .maybeSingle();

      if (error) throw error;
      if (data?.data) {
        const saved = data.data as any;
        if (saved.quizData) setQuizData(saved.quizData);
        if (saved.answers) setAnswers(saved.answers);
        setShowResults(!!saved.showResults);
        setScore(saved.score || 0);
        setTotalMarks(saved.totalMarks || 0);
        setCurrentQuestionIndex(saved.currentQuestionIndex || 0);
        setLastAutoSave(new Date(data.updated_at));
      }
    } catch (e) {
      console.error("Failed to load cloud draft", e);
    }
  };

  // Manual sync to cloud
  const syncToCloud = async () => {
    if (!quizData) return;
    setSyncing(true);
    try {
      const payload = { quizData, answers, showResults, score, totalMarks, currentQuestionIndex };
      const { error } = await supabase
        .from("module_progress_drafts")
        .upsert([{
          module_id: moduleId,
          draft_type: "quiz",
          quiz_type: quizType,
          data: payload as any,
        }]);

      if (error) throw error;

      setLastAutoSave(new Date());
      toast.success("✅ Progress synced to cloud", { duration: 3000 });
      localStorage.setItem(storageKey, JSON.stringify(payload));
    } catch (err: any) {
      console.error("Cloud sync failed", err);
      toast.error("Failed to sync. Check your connection.");
    } finally {
      setSyncing(false);
    }
  };

  // Auto-save to cloud every 60 seconds
  useEffect(() => {
    if (!quizData || showResults) return;

    const autoSaveInterval = setInterval(() => {
      syncToCloud();
    }, 60000); // 60 seconds

    return () => clearInterval(autoSaveInterval);
  }, [quizData, answers, showResults, score, totalMarks, currentQuestionIndex]);

  const generateQuiz = async () => {
    setGenerating(true);
    setShowResults(false);
    setAnswers({});
    setCurrentQuestionIndex(0);

    try {
      const { data, error } = await supabase.functions.invoke("generate-quiz", {
        body: { moduleId, topic: moduleTopic, quizType },
      });

      if (error) throw error;

      setQuizData(data);
      toast.success(`${quizType === "quiz" ? "Quiz" : "Final Test"} generated!`);
    } catch (error: any) {
      console.error("Quiz generation error:", error);
      toast.error(error.message || "Failed to generate quiz");
    } finally {
      setGenerating(false);
    }
  };

  const submitQuiz = async () => {
    if (!quizData) return;
    
    let earnedMarks = 0;
    let totalMarks = 0;
    
    quizData.questions.forEach((q, index) => {
      totalMarks += q.marks;
      const userAnswer = answers[index];
      
      if (q.type === "mcq" || q.type === "true_false") {
        if (userAnswer === q.correctAnswer) {
          earnedMarks += q.marks;
        }
      } else if (q.type === "short_answer" || q.type === "case_study" || q.type === "essay") {
        // For written answers, award full marks if answered (manual grading assumed)
        if (userAnswer && String(userAnswer).trim().length > 0) {
          earnedMarks += q.marks;
        }
      }
    });

    const percentage = Math.round((earnedMarks / totalMarks) * 100);
    setScore(percentage);
    setTotalMarks(earnedMarks);
    setShowResults(true);

    try {
      await supabase.from("quiz_attempts").insert([
        {
          module_id: moduleId,
          score: earnedMarks,
          total_questions: totalMarks,
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
      <QuizEmpty
        quizType={quizType}
        generating={generating}
        onGenerate={generateQuiz}
      />
    );
  }

  if (showResults) {
    return (
      <QuizResults
        quizType={quizType}
        score={score}
        totalMarks={totalMarks}
        questions={quizData.questions}
        answers={answers}
        onTryAgain={() => {
          setQuizData(null);
          setShowResults(false);
          try { localStorage.removeItem(storageKey); } catch {}
        }}
      />
    );
  }

  const totalQuestions = quizData.questions.length;
  const questionsPerPage = quizType === "final_test" ? 3 : 5;
  const startIndex = currentQuestionIndex;
  const endIndex = Math.min(startIndex + questionsPerPage, totalQuestions);
  const currentQuestions = quizData.questions.slice(startIndex, endIndex);

  return (
    <Card className="shadow-card-custom animate-fade-in">
      <QuizHeader
        moduleTopic={moduleTopic}
        quizType={quizType}
        answeredCount={Object.keys(answers).length}
        totalQuestions={totalQuestions}
        currentQuestionIndex={currentQuestionIndex}
        questionsPerPage={questionsPerPage}
        metrics={quizData.metrics}
        onPageChange={setCurrentQuestionIndex}
      />
      
      <CardContent className="space-y-6">
        <div className="flex justify-between items-center mb-4">
          {lastAutoSave && (
            <div className="text-xs text-muted-foreground animate-fade-in">
              Last synced: {lastAutoSave.toLocaleTimeString()}
            </div>
          )}
          <button
            onClick={syncToCloud}
            disabled={syncing}
            className="ml-auto text-xs px-3 py-1 rounded bg-primary/10 hover:bg-primary/20 text-primary disabled:opacity-50 transition-colors"
          >
            {syncing ? "Syncing..." : "💾 Sync Progress"}
          </button>
        </div>
        
        <h3 className="text-lg font-semibold">Your {quizType === "quiz" ? "Quiz" : "Test"} Questions</h3>
        
        <div key={currentQuestionIndex} className="space-y-6 animate-fade-in">
          {currentQuestions.map((q, localIndex) => {
            const qIndex = startIndex + localIndex;
            return (
              <QuizQuestion
                key={qIndex}
                question={q}
                questionIndex={qIndex}
                answer={answers[qIndex]}
                onAnswerChange={(value) => setAnswers({ ...answers, [qIndex]: value })}
              />
            );
          })}
        </div>

        <QuizNavigation
          currentQuestionIndex={currentQuestionIndex}
          endIndex={endIndex}
          totalQuestions={totalQuestions}
          questionsPerPage={questionsPerPage}
          quizType={quizType}
          answeredCount={Object.keys(answers).length}
          onPrevious={() => setCurrentQuestionIndex(Math.max(0, currentQuestionIndex - questionsPerPage))}
          onNext={() => setCurrentQuestionIndex(endIndex)}
          onSubmit={submitQuiz}
        />
      </CardContent>
    </Card>
  );
};

export default QuizTab;
