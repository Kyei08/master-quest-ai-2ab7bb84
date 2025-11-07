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
      <AlertDialogContent className="animate-scale-in">
        <AlertDialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 rounded-full bg-warning/10 flex items-center justify-center">
              <AlertTriangle className="w-6 h-6 text-warning" />
            </div>
            <AlertDialogTitle className="text-xl">Unsaved Changes</AlertDialogTitle>
          </div>
          <AlertDialogDescription className="text-base space-y-3">
            <p>
              You have unsaved changes in{" "}
              <span className="font-semibold text-foreground">
                {registeredCount} {registeredCount === 1 ? "tab" : "tabs"}
              </span>
              .
            </p>
            <p className="text-sm text-muted-foreground">
              Would you like to save your progress before continuing?
            </p>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="flex-col sm:flex-row gap-2">
          <AlertDialogCancel className="sm:order-1">Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={onContinueWithoutSaving}
            className="sm:order-2 bg-secondary text-secondary-foreground hover:bg-secondary/80"
          >
            <SkipForward className="w-4 h-4 mr-2" />
            Continue Without Saving
          </AlertDialogAction>
          <AlertDialogAction
            onClick={onSaveAndContinue}
            className="sm:order-3 bg-primary text-primary-foreground hover:bg-primary/90"
          >
            <Save className="w-4 h-4 mr-2" />
            Save & Continue
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
