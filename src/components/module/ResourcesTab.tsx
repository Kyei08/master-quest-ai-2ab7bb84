import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { Plus, ExternalLink, Trash2, BookOpen, Sparkles } from "lucide-react";

interface Resource {
  id: string;
  title: string;
  url: string;
  resource_type: string;
}

interface ResourcesTabProps {
  moduleId: string;
  moduleTopic: string;
}

const ResourcesTab = ({ moduleId, moduleTopic }: ResourcesTabProps) => {
  const [resources, setResources] = useState<Resource[]>([]);
  const [newTitle, setNewTitle] = useState("");
  const [newUrl, setNewUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [loadingResources, setLoadingResources] = useState(true);

  useEffect(() => {
    loadResources();
  }, [moduleId]);

  const loadResources = async () => {
    setLoadingResources(true);
    const { data, error } = await supabase
      .from("resources")
      .select("*")
      .eq("module_id", moduleId)
      .order("created_at", { ascending: true });

    if (error) {
      toast.error("Failed to load resources");
      setLoadingResources(false);
      return;
    }

    setResources(data || []);
    setLoadingResources(false);
  };

  const generateTeacherPicks = async () => {
    setGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-resources", {
        body: { moduleId, topic: moduleTopic },
      });

      if (error) throw error;

      toast.success("Teacher's Picks generated!");
      loadResources();
    } catch (error: any) {
      toast.error(error.message || "Failed to generate resources");
    } finally {
      setGenerating(false);
    }
  };

  const addResource = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newUrl.trim()) return;

    setLoading(true);
    try {
      const { error } = await supabase.from("resources").insert([
        {
          module_id: moduleId,
          title: newTitle,
          url: newUrl,
          resource_type: "user",
        },
      ]);

      if (error) throw error;

      toast.success("Resource added!");
      setNewTitle("");
      setNewUrl("");
      loadResources();
    } catch (error: any) {
      toast.error(error.message || "Failed to add resource");
    } finally {
      setLoading(false);
    }
  };

  const deleteResource = async (id: string) => {
    const { error } = await supabase.from("resources").delete().eq("id", id);

    if (error) {
      toast.error("Failed to delete resource");
      return;
    }

    toast.success("Resource deleted");
    loadResources();
  };

  const teacherPicks = resources.filter((r) => r.resource_type === "teacher_pick");
  const userResources = resources.filter((r) => r.resource_type === "user");

  if (loadingResources) {
    return (
      <div className="space-y-8">
        <Card className="shadow-card-custom">
          <CardHeader>
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-64 mt-2" />
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="p-4 bg-muted/50 rounded-lg">
                  <Skeleton className="h-5 w-3/4 mb-2" />
                  <Skeleton className="h-4 w-1/2" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-card-custom">
          <CardHeader>
            <Skeleton className="h-6 w-40" />
            <Skeleton className="h-4 w-56 mt-2" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-32 w-full mb-4" />
            <div className="space-y-3">
              {[1, 2].map((i) => (
                <div key={i} className="p-4 bg-muted/50 rounded-lg">
                  <Skeleton className="h-5 w-3/4 mb-2" />
                  <Skeleton className="h-4 w-1/2" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <Card className="shadow-card-custom">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-primary" />
                Teacher's Picks
              </CardTitle>
              <CardDescription>AI-curated resources for {moduleTopic}</CardDescription>
            </div>
            <Button onClick={generateTeacherPicks} disabled={generating}>
              {generating ? "Generating..." : "Generate Picks"}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {teacherPicks.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              No teacher's picks yet. Click "Generate Picks" to get AI-curated resources.
            </p>
          ) : (
            <div className="space-y-3">
              {teacherPicks.map((resource) => (
                <div
                  key={resource.id}
                  className="flex items-center justify-between p-4 bg-muted/50 rounded-lg"
                >
                  <div className="flex-1">
                    <h4 className="font-medium">{resource.title}</h4>
                    <a
                      href={resource.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-primary hover:underline flex items-center gap-1"
                    >
                      {resource.url}
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => deleteResource(resource.id)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="shadow-card-custom">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-secondary" />
            Your Resources
          </CardTitle>
          <CardDescription>Add your own learning materials</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={addResource} className="space-y-4 mb-6">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="title">Resource Title</Label>
                <Input
                  id="title"
                  placeholder="e.g., C# Documentation"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="url">URL</Label>
                <Input
                  id="url"
                  type="url"
                  placeholder="https://..."
                  value={newUrl}
                  onChange={(e) => setNewUrl(e.target.value)}
                  required
                />
              </div>
            </div>
            <Button type="submit" disabled={loading}>
              <Plus className="w-4 h-4 mr-2" />
              Add Resource
            </Button>
          </form>

          {userResources.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              No custom resources yet. Add your favorite learning materials above.
            </p>
          ) : (
            <div className="space-y-3">
              {userResources.map((resource) => (
                <div
                  key={resource.id}
                  className="flex items-center justify-between p-4 bg-muted/50 rounded-lg"
                >
                  <div className="flex-1">
                    <h4 className="font-medium">{resource.title}</h4>
                    <a
                      href={resource.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-primary hover:underline flex items-center gap-1"
                    >
                      {resource.url}
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => deleteResource(resource.id)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ResourcesTab;
