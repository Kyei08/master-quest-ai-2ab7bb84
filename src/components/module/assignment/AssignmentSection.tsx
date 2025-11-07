import { Textarea } from "@/components/ui/textarea";
import { AlternativeQuestionDialog } from "./AlternativeQuestionDialog";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

interface Task {
  id: string;
  question: string;
  marks: number;
  type: "essay" | "code" | "analysis";
}

interface Section {
  id: number;
  title: string;
  marks: number;
  description: string;
  tasks: Task[];
}

interface AssignmentSectionProps {
  section: Section;
  answers: Record<string, string>;
  onAnswerChange: (taskId: string, value: string) => void;
  assignmentId?: string;
}

export const AssignmentSection = ({ section, answers, onAnswerChange, assignmentId }: AssignmentSectionProps) => {
  const [isInstructor, setIsInstructor] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    checkRole();
  }, []);

  const checkRole = async () => {
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) return;

      const { data: roles } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", userData.user.id);

      const hasInstructorRole = roles?.some(
        (r) => r.role === "instructor" || r.role === "admin"
      );
      setIsInstructor(!!hasInstructorRole);
    } catch (error) {
      console.error("Failed to check role:", error);
    }
  };
  return (
    <div className="mb-6">
      <h3 className="text-lg sm:text-xl font-bold text-primary mb-2 break-words">
        {section.title} ({section.marks} Marks)
      </h3>
      <p className="text-xs sm:text-sm mb-4 break-words">{section.description}</p>
      
      <div className="space-y-4 sm:space-y-6">
        {section.tasks.map((task, index) => (
          <div key={task.id} className="border border-primary/20 rounded-lg p-3 sm:p-4 bg-card">
            <div className="flex items-start justify-between mb-3">
              <p className="font-semibold text-sm sm:text-base break-words flex-1">
                {task.id}. {task.question} ({task.marks} Marks)
              </p>
              {isInstructor && assignmentId && (
                <AlternativeQuestionDialog
                  assignmentId={assignmentId}
                  originalQuestionIndex={parseInt(task.id)}
                  originalQuestion={task.question}
                  onSubmitSuccess={() => setRefreshKey(prev => prev + 1)}
                />
              )}
            </div>
            <Textarea
              placeholder={`Enter your response for Task ${task.id} here...`}
              value={answers[task.id] || ""}
              onChange={(e) => onAnswerChange(task.id, e.target.value)}
              className={task.type === "code" 
                ? "font-mono bg-slate-900 text-slate-100 min-h-[180px] sm:min-h-[200px] text-sm" 
                : "min-h-[120px] sm:min-h-[150px] text-sm sm:text-base"}
            />
          </div>
        ))}
      </div>
    </div>
  );
};
