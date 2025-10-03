import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Sparkles, Plus, BookOpen, LogOut, Trophy, Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";

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

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate("/auth");
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
      <header className="border-b border-border/50 bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-primary" />
            <h1 className="text-2xl font-bold bg-gradient-primary bg-clip-text text-transparent">
              Quantum Leap
            </h1>
          </div>
          <Button variant="outline" onClick={handleSignOut}>
            <LogOut className="w-4 h-4 mr-2" />
            Sign Out
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h2 className="text-3xl font-bold mb-2">Welcome back!</h2>
          <p className="text-muted-foreground">Continue your journey to mastery</p>
        </div>

        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3 mb-12">
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
          <h3 className="text-2xl font-bold mb-6">Your Modules</h3>
          {modules.length === 0 ? (
            <Card className="shadow-card-custom">
              <CardContent className="py-12 text-center">
                <BookOpen className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground">
                  No modules yet. Create your first module to get started!
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {modules.map((module) => (
                <Card
                  key={module.id}
                  className="shadow-card-custom hover:shadow-glow transition-shadow cursor-pointer"
                  onClick={() => navigate(`/module/${module.id}`)}
                >
                  <CardHeader>
                    <div className="flex items-start justify-between gap-2">
                      <CardTitle className="text-lg">{module.topic}</CardTitle>
                      {getStatusBadge(module.status)}
                    </div>
                    <CardDescription className="flex items-center gap-2 text-sm">
                      <Clock className="w-3 h-3" />
                      {new Date(module.created_at).toLocaleDateString()}
                    </CardDescription>
                  </CardHeader>
                  {module.final_score !== null && (
                    <CardContent>
                      <div className="flex items-center gap-2">
                        <Trophy className="w-4 h-4 text-primary" />
                        <span className="text-sm font-medium">
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
