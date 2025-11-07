import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Plus, BookOpen, Trophy, Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { ProgressStats } from "@/components/dashboard/ProgressStats";
import { LearningAnalytics } from "@/components/dashboard/LearningAnalytics";

interface Module {
  id: string;
  topic: string;
  status: string;
  final_score: number | null;
  created_at: string;
}

const Dashboard = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [modules, setModules] = useState<Module[]>([]);
  const [newTopic, setNewTopic] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null);
      if (!session) {
        navigate("/auth");
      }
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (!session) {
        navigate("/auth");
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  useEffect(() => {
    if (user) {
      loadModules();
    }
  }, [user]);

  const loadModules = async () => {
    const { data, error } = await supabase
      .from("modules")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      toast.error("Failed to load modules");
      return;
    }

    setModules(data || []);
  };

  const createModule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTopic.trim()) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("modules")
        .insert([{ topic: newTopic, user_id: user.id }])
        .select()
        .single();

      if (error) throw error;

      toast.success("Module created!");
      setNewTopic("");
      navigate(`/module/${data.id}`);
    } catch (error: any) {
      toast.error(error.message || "Failed to create module");
    } finally {
      setLoading(false);
    }
  };


  const getStatusBadge = (status: string) => {
    switch (status) {
      case "completed":
        return <Badge className="bg-success">Completed</Badge>;
      case "needs_revisit":
        return <Badge variant="destructive">Needs Review</Badge>;
      default:
        return <Badge variant="secondary">In Progress</Badge>;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-hero">
      <main className="container mx-auto px-3 sm:px-4 py-4 sm:py-8">
        <div className="mb-6 sm:mb-8">
          <h2 className="text-2xl sm:text-3xl font-bold mb-2">Welcome back!</h2>
          <p className="text-sm sm:text-base text-muted-foreground">Continue your journey to mastery</p>
          {user && (
            <p className="text-xs text-muted-foreground mt-1">
              Logged in as: {user.email}
            </p>
          )}
        </div>

        {modules.length > 0 && (
          <>
            <ProgressStats modules={modules} />
            <LearningAnalytics modules={modules} />
          </>
        )}

        <div className="grid gap-4 sm:gap-6 md:gap-8 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 mb-8 sm:mb-12">
          <Card className="shadow-card-custom">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-primary" />
                Create New Module
              </CardTitle>
              <CardDescription>Start a new learning journey</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={createModule} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="topic">What do you want to master?</Label>
                  <Input
                    id="topic"
                    placeholder="e.g., Introduction to C#, Quantum Physics"
                    value={newTopic}
                    onChange={(e) => setNewTopic(e.target.value)}
                    required
                  />
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  <Plus className="w-4 h-4 mr-2" />
                  Create Module
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>

        <div>
          <h3 className="text-xl sm:text-2xl font-bold mb-4 sm:mb-6">Your Modules</h3>
          {modules.length === 0 ? (
            <Card className="shadow-card-custom">
              <CardContent className="py-8 sm:py-12 text-center">
                <BookOpen className="w-10 h-10 sm:w-12 sm:h-12 mx-auto mb-3 sm:mb-4 text-muted-foreground" />
                <p className="text-sm sm:text-base text-muted-foreground">
                  No modules yet. Create your first module to get started!
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
              {modules.map((module) => (
                <Card
                  key={module.id}
                  className="shadow-card-custom hover:shadow-glow transition-all cursor-pointer active:scale-[0.98]"
                  onClick={() => navigate(`/module/${module.id}`)}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-2">
                      <CardTitle className="text-base sm:text-lg line-clamp-2">{module.topic}</CardTitle>
                      {getStatusBadge(module.status)}
                    </div>
                    <CardDescription className="flex items-center gap-2 text-xs sm:text-sm">
                      <Clock className="w-3 h-3" />
                      {new Date(module.created_at).toLocaleDateString()}
                    </CardDescription>
                  </CardHeader>
                  {module.final_score !== null && (
                    <CardContent className="pt-0">
                      <div className="flex items-center gap-2">
                        <Trophy className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-primary" />
                        <span className="text-xs sm:text-sm font-medium">
                          Final Score: {module.final_score}%
                        </span>
                      </div>
                    </CardContent>
                  )}
                </Card>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
