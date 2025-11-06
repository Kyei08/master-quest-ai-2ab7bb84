import { Textarea } from "@/components/ui/textarea";

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
}

export const AssignmentSection = ({ section, answers, onAnswerChange }: AssignmentSectionProps) => {
  return (
    <div className="mb-6">
      <h3 className="text-lg sm:text-xl font-bold text-primary mb-2 break-words">
        {section.title} ({section.marks} Marks)
      </h3>
      <p className="text-xs sm:text-sm mb-4 break-words">{section.description}</p>
      
      <div className="space-y-4 sm:space-y-6">
        {section.tasks.map((task) => (
          <div key={task.id} className="border border-primary/20 rounded-lg p-3 sm:p-4 bg-card">
            <p className="font-semibold mb-3 text-sm sm:text-base break-words">
              {task.id}. {task.question} ({task.marks} Marks)
            </p>
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
