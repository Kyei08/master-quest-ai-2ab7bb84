import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import { useSyncQueue } from "@/hooks/useSyncQueue";
import { AssignmentEmpty } from "./assignment/AssignmentEmpty";
import { AssignmentSubmitted } from "./assignment/AssignmentSubmitted";
import { AssignmentHeader } from "./assignment/AssignmentHeader";
import { AssignmentSection } from "./assignment/AssignmentSection";
import { AssignmentNavigation } from "./assignment/AssignmentNavigation";
import { SyncIndicator } from "./SyncIndicator";
import { ProgressIndicator } from "./ProgressIndicator";
import { exportAssignmentToPDF } from "@/lib/pdfExport";
import { Button } from "@/components/ui/button";
import { FileDown } from "lucide-react";

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
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [lastAutoSave, setLastAutoSave] = useState<Date | null>(null);
  const [syncing, setSyncing] = useState(false);
  const { addToQueue, queueSize, getNextRetryTime } = useSyncQueue();

  const storageKey = `assignmentState:${moduleId}`;

  useEffect(() => {
    loadAssignment();
    loadCloudDraft();
  }, [moduleId]);

  // Load cloud-saved draft
  const loadCloudDraft = async () => {
    try {
      const { data, error } = await supabase
        .from("module_progress_drafts")
        .select("*")
        .eq("module_id", moduleId)
        .eq("draft_type", "assignment")
        .maybeSingle();

      if (error) throw error;
      if (data?.data) {
        const draft = data.data as any;
        if (draft.answers) setAnswers(draft.answers);
        if (draft.currentSection !== undefined) setCurrentSection(draft.currentSection);
        if (draft.submitted !== undefined) setSubmitted(draft.submitted);
        setLastAutoSave(new Date(data.updated_at));
      }
    } catch (err) {
      console.error("Failed to load cloud draft", err);
    }
  };

  // Manual sync to cloud
  const syncToCloud = async () => {
    if (!assignment) return;
    setSyncing(true);
    
    const payload = { answers, currentSection, submitted };
    
    try {
      const { error } = await supabase
        .from("module_progress_drafts")
        .upsert([{
          module_id: moduleId,
          draft_type: "assignment",
          data: payload as any,
        }]);

      if (error) throw error;

      setLastAutoSave(new Date());
      toast.success("✅ Progress synced to cloud", { duration: 3000 });
      localStorage.setItem(storageKey, JSON.stringify(payload));
    } catch (err: any) {
      console.error("Cloud sync failed", err);
      
      // Add to queue for retry when online
      addToQueue({
        moduleId,
        draftType: "assignment",
        data: payload,
      });
      
      toast.error("Offline - sync queued for retry", { duration: 3000 });
    } finally {
      setSyncing(false);
    }
  };

  // Load saved state from localStorage
  useEffect(() => {
    const raw = localStorage.getItem(storageKey);
    if (raw) {
      try {
        const saved = JSON.parse(raw);
        if (saved.answers) setAnswers(saved.answers);
        if (saved.currentSection !== undefined) setCurrentSection(saved.currentSection);
        if (saved.submitted !== undefined) setSubmitted(saved.submitted);
      } catch (e) {
        console.error("Failed to load saved assignment state", e);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storageKey]);

  // Save state to localStorage whenever it changes
  useEffect(() => {
    if (!assignment) return;
    try {
      const payload = { answers, currentSection, submitted };
      localStorage.setItem(storageKey, JSON.stringify(payload));
    } catch (e) {
      // ignore write errors
    }
  }, [answers, currentSection, submitted, assignment, storageKey]);

  // Auto-save to cloud every 60 seconds
  useEffect(() => {
    if (!assignment || submitted) return;

    const autoSaveInterval = setInterval(() => {
      syncToCloud();
    }, 60000); // 60 seconds

    return () => clearInterval(autoSaveInterval);
  }, [assignment, answers, currentSection, submitted]);

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

  const submitAssignment = async () => {
    if (!assignment) return;
    
    setSubmitting(true);
    try {
      // Calculate total marks
      const totalMarks = assignment.content.sections.reduce(
        (sum, section) => sum + section.marks,
        0
      );

      // Submit to database
      const { error } = await supabase
        .from("assignment_submissions")
        .insert({
          module_id: moduleId,
          assignment_id: assignment.id,
          answers,
          total_marks: totalMarks,
          status: "submitted",
        });

      if (error) throw error;

      setSubmitted(true);
      toast.success("Assignment submitted successfully! Your instructor will review it.");
    } catch (error: any) {
      console.error("Assignment submission error:", error);
      toast.error(error.message || "Failed to submit assignment");
    } finally {
      setSubmitting(false);
    }
  };

  if (!assignment) {
    return (
      <AssignmentEmpty
        moduleTopic={moduleTopic}
        generating={generating}
        onGenerate={generateAssignment}
      />
    );
  }

  const currentSectionData = assignment.content.sections[currentSection];

  if (submitted) {
    return (
      <AssignmentSubmitted
        onReset={() => {
          setSubmitted(false);
          setAnswers({});
          setCurrentSection(0);
        }}
      />
    );
  }

  return (
    <Card className="shadow-card-custom animate-fade-in">
      <AssignmentHeader
        moduleTopic={moduleTopic}
        title={assignment.content.title}
        description={assignment.content.description}
        totalMarks={assignment.content.totalMarks}
        sections={assignment.content.sections}
        currentSection={currentSection}
        generating={generating}
        onSectionChange={setCurrentSection}
        onRegenerate={generateAssignment}
      />
      
      <CardContent className="p-4 sm:p-6">
        <div className="flex justify-between items-center mb-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => exportAssignmentToPDF(moduleTopic, assignment.content.sections, answers)}
          >
            <FileDown className="h-4 w-4 mr-2" />
            Export PDF
          </Button>
          <SyncIndicator
            syncing={syncing}
            lastAutoSave={lastAutoSave}
            onSync={syncToCloud}
            queueSize={queueSize}
            nextRetryTime={getNextRetryTime()}
          />
        </div>
        
        <ProgressIndicator
          current={currentSection + 1}
          total={assignment.content.sections.length}
          label="Assignment Progress"
          variant="sections"
        />
        
        <div key={currentSection} className="animate-fade-in mt-6">
          <AssignmentSection
            section={currentSectionData}
            answers={answers}
            onAnswerChange={handleAnswerChange}
          />
        </div>

        <AssignmentNavigation
          currentSection={currentSection}
          totalSections={assignment.content.sections.length}
          submitting={submitting}
          onPrevious={() => setCurrentSection(Math.max(0, currentSection - 1))}
          onNext={() => setCurrentSection(currentSection + 1)}
          onSubmit={submitAssignment}
        />

        <div className="mt-6 sm:mt-8 border-t pt-4 sm:pt-6">
          <h4 className="font-semibold mb-3 sm:mb-4 text-sm sm:text-base">Resources for this Assignment</h4>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Check the Resources tab for curated learning materials.
          </p>
        </div>
      </CardContent>
    </Card>
  );
};

export default AssignmentTab;
