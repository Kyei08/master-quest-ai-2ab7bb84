import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Sparkles, FileText } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";

interface Task {
  id: string;
  question: string;
  marks: number;
  type: "essay" | "code" | "analysis";
  answer?: string;
}

interface Section {
  id: number;
  title: string;
  marks: number;
  description: string;
  tasks: Task[];
}

interface AssignmentContent {
  title: string;
  totalMarks: number;
  description: string;
  sections: Section[];
}

interface Assignment {
  id: string;
  content: AssignmentContent;
}

interface AssignmentTabProps {
  moduleId: string;
  moduleTopic: string;
}

const AssignmentTab = ({ moduleId, moduleTopic }: AssignmentTabProps) => {
  const [assignment, setAssignment] = useState<Assignment | null>(null);
  const [generating, setGenerating] = useState(false);
  const [currentSection, setCurrentSection] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});

  useEffect(() => {
    loadAssignment();
  }, [moduleId]);

  const loadAssignment = async () => {
    const { data, error } = await supabase
      .from("assignments")
      .select("*")
      .eq("module_id", moduleId)
      .maybeSingle();

    if (error) {
      toast.error("Failed to load assignment");
      return;
    }

    if (data) {
      setAssignment({
        id: data.id,
        content: data.content as unknown as AssignmentContent,
      });
    }
  };

  const generateAssignment = async () => {
    setGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-assignment", {
        body: { moduleId, topic: moduleTopic },
      });

      if (error) throw error;

      toast.success("Assignment generated!");
      loadAssignment();
    } catch (error: any) {
      console.error("Assignment generation error:", error);
      toast.error(error.message || "Failed to generate assignment");
    } finally {
      setGenerating(false);
    }
  };

  const handleAnswerChange = (taskId: string, value: string) => {
    setAnswers({ ...answers, [taskId]: value });
  };

  if (!assignment) {
    return (
      <Card className="shadow-card-custom">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-primary" />
                Module Assignment
              </CardTitle>
              <CardDescription>AI-generated practical tasks for {moduleTopic}</CardDescription>
            </div>
            <Button onClick={generateAssignment} disabled={generating}>
              <Sparkles className="w-4 h-4 mr-2" />
              {generating ? "Generating..." : "Generate Assignment"}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12">
            <FileText className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground">
              No assignment yet. Click "Generate Assignment" to create one.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const currentSectionData = assignment.content.sections[currentSection];

  return (
    <Card className="shadow-card-custom">
      <CardHeader>
        <div className="flex items-center justify-between mb-4">
          <div className="flex-1">
            <CardTitle className="text-2xl mb-2">
              Module: {moduleTopic} - Assignment
            </CardTitle>
            <p className="text-sm text-muted-foreground mb-2">
              **{assignment.content.title}** (Total Marks: {assignment.content.totalMarks})
            </p>
            <p className="text-sm">{assignment.content.description}</p>
          </div>
          <Button onClick={generateAssignment} disabled={generating} variant="outline">
            <Sparkles className="w-4 h-4 mr-2" />
            Regenerate
          </Button>
        </div>
        
        <div className="flex gap-2 flex-wrap">
          {assignment.content.sections.map((section, index) => (
            <Button
              key={section.id}
              variant={currentSection === index ? "default" : "outline"}
              onClick={() => setCurrentSection(index)}
              size="sm"
            >
              Section {section.id}
            </Button>
          ))}
        </div>
      </CardHeader>
      
      <CardContent>
        <div className="mb-6">
          <h3 className="text-xl font-bold text-primary mb-2">
            {currentSectionData.title} ({currentSectionData.marks} Marks)
          </h3>
          <p className="text-sm mb-4">{currentSectionData.description}</p>
          
          <div className="space-y-6">
            {currentSectionData.tasks.map((task) => (
              <div key={task.id} className="border border-primary/20 rounded-lg p-4 bg-card">
                <p className="font-semibold mb-2">
                  {task.id}. {task.question} ({task.marks} Marks)
                </p>
                <Textarea
                  placeholder={`Enter your response for Task ${task.id} here...`}
                  value={answers[task.id] || ""}
                  onChange={(e) => handleAnswerChange(task.id, e.target.value)}
                  className={task.type === "code" ? "font-mono bg-slate-900 text-slate-100 min-h-[200px]" : "min-h-[150px]"}
                />
              </div>
            ))}
          </div>
        </div>

        <div className="flex justify-between mt-6">
          <Button
            variant="outline"
            onClick={() => setCurrentSection(Math.max(0, currentSection - 1))}
            disabled={currentSection === 0}
          >
            Previous Section
          </Button>
          
          {currentSection < assignment.content.sections.length - 1 ? (
            <Button onClick={() => setCurrentSection(currentSection + 1)}>
              Next Section
            </Button>
          ) : (
            <Button className="bg-green-600 hover:bg-green-700">
              Submit Assignment
            </Button>
          )}
        </div>

        <div className="mt-8 border-t pt-6">
          <h4 className="font-semibold mb-4">Resources for this Assignment</h4>
          <p className="text-sm text-muted-foreground">
            Check the Resources tab for curated learning materials.
          </p>
        </div>
      </CardContent>
    </Card>
  );
};

export default AssignmentTab;
