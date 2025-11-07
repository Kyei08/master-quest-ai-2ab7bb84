import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { AlertTriangle, Save, SkipForward } from "lucide-react";

interface UnsavedChangesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaveAndContinue: () => void;
  onContinueWithoutSaving: () => void;
  registeredCount: number;
}

export const UnsavedChangesDialog = ({
  open,
  onOpenChange,
  onSaveAndContinue,
  onContinueWithoutSaving,
  registeredCount,
}: UnsavedChangesDialogProps) => {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="animate-scale-in max-w-[calc(100%-2rem)] sm:max-w-lg">
        <AlertDialogHeader>
          <div className="flex items-center gap-2 sm:gap-3 mb-2">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-warning/10 flex items-center justify-center flex-shrink-0">
              <AlertTriangle className="w-5 h-5 sm:w-6 sm:h-6 text-warning" />
            </div>
            <AlertDialogTitle className="text-lg sm:text-xl">Unsaved Changes</AlertDialogTitle>
          </div>
          <AlertDialogDescription className="text-sm sm:text-base space-y-2 sm:space-y-3">
            <p>
              You have unsaved changes in{" "}
              <span className="font-semibold text-foreground">
                {registeredCount} {registeredCount === 1 ? "tab" : "tabs"}
              </span>
              .
            </p>
            <p className="text-xs sm:text-sm text-muted-foreground">
              Would you like to save your progress before continuing?
            </p>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="flex-col gap-2 sm:flex-row sm:gap-2">
          <AlertDialogCancel className="w-full sm:w-auto sm:order-1 h-11">Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={onContinueWithoutSaving}
            className="w-full sm:w-auto sm:order-2 bg-secondary text-secondary-foreground hover:bg-secondary/80 h-11"
          >
            <SkipForward className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-2" />
            <span className="hidden sm:inline">Continue Without Saving</span>
            <span className="sm:hidden">Skip</span>
          </AlertDialogAction>
          <AlertDialogAction
            onClick={onSaveAndContinue}
            className="w-full sm:w-auto sm:order-3 bg-primary text-primary-foreground hover:bg-primary/90 h-11"
          >
            <Save className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-2" />
            Save & Continue
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
