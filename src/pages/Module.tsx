import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { ArrowLeft, Sparkles, BookOpen, GraduationCap, FileText, RotateCcw } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import ResourcesTab from "@/components/module/ResourcesTab";
import AssignmentTab from "@/components/module/AssignmentTab";
import QuizTab from "@/components/module/QuizTab";
import ResultsTab from "@/components/module/ResultsTab";

interface Module {
  id: string;
  topic: string;
  status: string;
  final_score: number | null;
}

const Module = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [module, setModule] = useState<Module | null>(null);
  const [activeTab, setActiveTab] = useState("resources");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadModule();
  }, [id]);

  const loadModule = async () => {
    if (!id) return;

    const { data, error } = await supabase
      .from("modules")
      .select("*")
      .eq("id", id)
      .single();

    if (error) {
      toast.error("Failed to load module");
      navigate("/dashboard");
      return;
    }

    setModule(data);
  };

  const handleResetModule = async () => {
    if (!id) return;
    
    setLoading(true);
    try {
      // Delete quiz attempts
      await supabase.from("quiz_attempts").delete().eq("module_id", id);
      
      // Reset module status
      const { error } = await supabase
        .from("modules")
        .update({ status: "in_progress", final_score: null })
        .eq("id", id);

      if (error) throw error;

      toast.success("Module reset! You can start fresh.");
      // Clear any saved assessment sessions for this module
      try {
        localStorage.removeItem(`quizState:${id}:quiz`);
        localStorage.removeItem(`quizState:${id}:final_test`);
        localStorage.removeItem(`assignmentState:${id}`);
      } catch {}
      loadModule();
      setActiveTab("resources");
    } catch (error: any) {
      toast.error(error.message || "Failed to reset module");
    } finally {
      setLoading(false);
    }
  };

  if (!module) {
    return (
      <div className="min-h-screen bg-gradient-hero flex items-center justify-center">
        <div className="animate-pulse">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-hero">
      <div className="border-b border-border/50 bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">{module.topic}</h1>
              <p className="text-sm text-muted-foreground">
                Status: {module.status.replace("_", " ").toUpperCase()}
              </p>
            </div>
            <Button variant="outline" onClick={handleResetModule} disabled={loading}>
              <RotateCcw className="w-4 h-4 mr-2" />
              Reset Module
            </Button>
          </div>
        </div>
      </div>

      <main className="container mx-auto px-4 py-8">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-5 mb-8 h-auto gap-1 p-1">
            <TabsTrigger value="resources" className="flex-col sm:flex-row gap-1 sm:gap-2 px-2 sm:px-3 py-2">
              <BookOpen className="w-4 h-4 sm:mr-0" />
              <span className="text-xs sm:text-sm">Resources</span>
            </TabsTrigger>
            <TabsTrigger value="assignment" className="flex-col sm:flex-row gap-1 sm:gap-2 px-2 sm:px-3 py-2">
              <FileText className="w-4 h-4 sm:mr-0" />
              <span className="text-xs sm:text-sm">Assignment</span>
            </TabsTrigger>
            <TabsTrigger value="quiz" className="flex-col sm:flex-row gap-1 sm:gap-2 px-2 sm:px-3 py-2">
              <Sparkles className="w-4 h-4 sm:mr-0" />
              <span className="text-xs sm:text-sm hidden sm:inline">Practice Quiz</span>
              <span className="text-xs sm:hidden">Quiz</span>
            </TabsTrigger>
            <TabsTrigger value="final-test" className="flex-col sm:flex-row gap-1 sm:gap-2 px-2 sm:px-3 py-2">
              <GraduationCap className="w-4 h-4 sm:mr-0" />
              <span className="text-xs sm:text-sm hidden sm:inline">Final Test</span>
              <span className="text-xs sm:hidden">Test</span>
            </TabsTrigger>
            <TabsTrigger value="results" className="flex-col sm:flex-row gap-1 sm:gap-2 px-2 sm:px-3 py-2">
              <GraduationCap className="w-4 h-4 sm:mr-0" />
              <span className="text-xs sm:text-sm">Results</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="resources">
            <ResourcesTab moduleId={id!} moduleTopic={module.topic} />
          </TabsContent>

          <TabsContent value="assignment">
            <AssignmentTab moduleId={id!} moduleTopic={module.topic} />
          </TabsContent>

          <TabsContent value="quiz">
            <QuizTab moduleId={id!} moduleTopic={module.topic} quizType="quiz" onComplete={() => setActiveTab("results")} />
          </TabsContent>

          <TabsContent value="final-test">
            <QuizTab moduleId={id!} moduleTopic={module.topic} quizType="final_test" onComplete={() => setActiveTab("results")} />
          </TabsContent>

          <TabsContent value="results">
            <ResultsTab moduleId={id!} module={module} onReload={loadModule} />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default Module;
