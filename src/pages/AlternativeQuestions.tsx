import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { AlternativeQuestionsView } from "@/components/module/assignment/AlternativeQuestionsView";
import { toast } from "sonner";

const AlternativeQuestions = () => {
  const navigate = useNavigate();
  const [isInstructor, setIsInstructor] = useState(false);
  const [assignments, setAssignments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkRole();
    loadAssignments();
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

  const loadAssignments = async () => {
    try {
      const { data, error } = await supabase
        .from("assignments")
        .select(`
          id,
          module_id,
          content,
          modules (
            topic
          )
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setAssignments(data || []);
    } catch (error: any) {
      console.error("Failed to load assignments:", error);
      toast.error("Failed to load assignments");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto py-8">
        <div className="text-center">Loading...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="mb-6">
        <Button variant="ghost" onClick={() => navigate(-1)} className="mb-4">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <h1 className="text-3xl font-bold">Alternative Questions Bank</h1>
        <p className="text-muted-foreground mt-2">
          {isInstructor
            ? "Review and approve alternative questions submitted by instructors"
            : "View alternative questions for assignments"}
        </p>
      </div>

      {assignments.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            No assignments found
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-8">
          {assignments.map((assignment) => (
            <Card key={assignment.id}>
              <CardHeader>
                <CardTitle>
                  {(assignment.modules as any)?.topic || "Assignment"}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <AlternativeQuestionsView
                  assignmentId={assignment.id}
                  isInstructor={isInstructor}
                />
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default AlternativeQuestions;
