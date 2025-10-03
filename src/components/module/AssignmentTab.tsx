import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Sparkles, FileText } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";

interface AssignmentPart {
  part: number;
  task: string;
  completed?: boolean;
}

interface Assignment {
  id: string;
  content: AssignmentPart[];
}

interface AssignmentTabProps {
  moduleId: string;
  moduleTopic: string;
}

const AssignmentTab = ({ moduleId, moduleTopic }: AssignmentTabProps) => {
  const [assignment, setAssignment] = useState<Assignment | null>(null);
  const [generating, setGenerating] = useState(false);

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
        content: data.content as unknown as AssignmentPart[],
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
      toast.error(error.message || "Failed to generate assignment");
    } finally {
      setGenerating(false);
    }
  };

  const toggleTask = (partIndex: number) => {
    if (!assignment) return;

    const updatedContent = assignment.content.map((part, index) => {
      if (index === partIndex) {
        return { ...part, completed: !part.completed };
      }
      return part;
    });

    setAssignment({ ...assignment, content: updatedContent });
  };

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
            {generating ? "Generating..." : assignment ? "Regenerate" : "Generate Assignment"}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {!assignment ? (
          <div className="text-center py-12">
            <FileText className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground">
              No assignment yet. Click "Generate Assignment" to create one.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {assignment.content.map((part, index) => (
              <div key={index} className="flex items-start gap-3 p-4 bg-muted/50 rounded-lg">
                <Checkbox
                  checked={part.completed || false}
                  onCheckedChange={() => toggleTask(index)}
                  className="mt-1"
                />
                <div className="flex-1">
                  <h4 className="font-medium mb-1">Part {part.part}</h4>
                  <p className="text-sm text-muted-foreground">{part.task}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default AssignmentTab;
