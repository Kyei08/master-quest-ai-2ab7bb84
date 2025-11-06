import { Button } from "@/components/ui/button";
import { CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Sparkles } from "lucide-react";

interface Section {
  id: number;
  title: string;
  marks: number;
  description: string;
}

interface AssignmentHeaderProps {
  moduleTopic: string;
  title: string;
  description: string;
  totalMarks: number;
  sections: Section[];
  currentSection: number;
  generating: boolean;
  onSectionChange: (index: number) => void;
  onRegenerate: () => void;
}

export const AssignmentHeader = ({
  moduleTopic,
  title,
  description,
  totalMarks,
  sections,
  currentSection,
  generating,
  onSectionChange,
  onRegenerate
}: AssignmentHeaderProps) => {
  return (
    <CardHeader className="p-4 sm:p-6">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-4">
        <div className="flex-1 min-w-0">
          <CardTitle className="text-xl sm:text-2xl mb-2 break-words">
            Module: {moduleTopic} - Assignment
          </CardTitle>
          <CardDescription className="mb-2 text-sm">
            **{title}** (Total Marks: {totalMarks})
          </CardDescription>
          <p className="text-xs sm:text-sm break-words">{description}</p>
        </div>
        <Button 
          onClick={onRegenerate} 
          disabled={generating} 
          variant="outline"
          className="w-full sm:w-auto shrink-0"
          size="sm"
        >
          <Sparkles className="w-4 h-4 mr-2" />
          <span className="hidden sm:inline">Regenerate</span>
          <span className="sm:hidden">Regen</span>
        </Button>
      </div>
      
      <div className="flex gap-2 flex-wrap">
        {sections.map((section, index) => (
          <Button
            key={section.id}
            variant={currentSection === index ? "default" : "outline"}
            onClick={() => onSectionChange(index)}
            size="sm"
            className="min-w-[80px] touch-manipulation"
          >
            Section {section.id}
          </Button>
        ))}
      </div>
    </CardHeader>
  );
};
