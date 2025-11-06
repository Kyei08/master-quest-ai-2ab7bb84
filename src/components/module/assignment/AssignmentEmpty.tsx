import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText, Sparkles } from "lucide-react";

interface AssignmentEmptyProps {
  moduleTopic: string;
  generating: boolean;
  onGenerate: () => void;
}

export const AssignmentEmpty = ({ moduleTopic, generating, onGenerate }: AssignmentEmptyProps) => {
  return (
    <Card className="shadow-card-custom animate-fade-in">
      <CardHeader className="p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex-1 min-w-0">
            <CardTitle className="flex items-center gap-2 text-lg sm:text-xl break-words">
              <FileText className="w-5 h-5 text-primary shrink-0" />
              Module Assignment
            </CardTitle>
            <CardDescription className="text-xs sm:text-sm break-words">
              AI-generated practical tasks for {moduleTopic}
            </CardDescription>
          </div>
          <Button 
            onClick={onGenerate} 
            disabled={generating}
            className="transition-all duration-200 hover:scale-105 w-full sm:w-auto touch-manipulation"
            size="sm"
          >
            <Sparkles className="w-4 h-4 mr-2" />
            <span className="hidden sm:inline">{generating ? "Generating..." : "Generate Assignment"}</span>
            <span className="sm:hidden">{generating ? "Generating..." : "Generate"}</span>
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-4 sm:p-6">
        <div className="text-center py-8 sm:py-12">
          <FileText className="w-10 h-10 sm:w-12 sm:h-12 mx-auto mb-4 text-muted-foreground animate-pulse" />
          <p className="text-sm sm:text-base text-muted-foreground">
            No assignment yet. Click "Generate" to create one.
          </p>
        </div>
      </CardContent>
    </Card>
  );
};
