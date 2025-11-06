import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Send, Loader2 } from "lucide-react";

interface AssignmentNavigationProps {
  currentSection: number;
  totalSections: number;
  submitting: boolean;
  onPrevious: () => void;
  onNext: () => void;
  onSubmit: () => void;
}

export const AssignmentNavigation = ({
  currentSection,
  totalSections,
  submitting,
  onPrevious,
  onNext,
  onSubmit
}: AssignmentNavigationProps) => {
  const isLastSection = currentSection === totalSections - 1;

  return (
    <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-3 pt-6 mt-6 border-t">
      <Button
        variant="outline"
        onClick={onPrevious}
        disabled={currentSection === 0}
        className="transition-all duration-200 hover:scale-105 touch-manipulation w-full sm:w-auto"
        size="lg"
      >
        <ChevronLeft className="w-4 h-4 mr-2" />
        Previous
      </Button>

      <span className="text-xs sm:text-sm text-muted-foreground text-center order-first sm:order-none">
        Section {currentSection + 1} of {totalSections}
      </span>

      {isLastSection ? (
        <Button
          onClick={onSubmit}
          disabled={submitting}
          className="transition-all duration-200 hover:scale-105 touch-manipulation w-full sm:w-auto"
          size="lg"
        >
          {submitting ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Submitting...
            </>
          ) : (
            <>
              <span className="hidden sm:inline">Submit Assignment</span>
              <span className="sm:hidden">Submit</span>
              <Send className="w-4 h-4 ml-2" />
            </>
          )}
        </Button>
      ) : (
        <Button
          onClick={onNext}
          className="transition-all duration-200 hover:scale-105 touch-manipulation w-full sm:w-auto"
          size="lg"
        >
          Next
          <ChevronRight className="w-4 h-4 ml-2" />
        </Button>
      )}
    </div>
  );
};
