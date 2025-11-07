import { useEffect, useState } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { ArrowLeft, Sparkles, BookOpen, GraduationCap, FileText, RotateCcw, MessageCircle, Share2, Users, CreditCard, Presentation } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import ResourcesTab from "@/components/module/ResourcesTab";
import AssignmentTab from "@/components/module/AssignmentTab";
import QuizTab from "@/components/module/QuizTab";
import ResultsTab from "@/components/module/ResultsTab";
import { DiscussionsTab } from "@/components/module/DiscussionsTab";
import FlashcardsTab from "@/components/module/FlashcardsTab";
import PresentationsTab from "@/components/module/PresentationsTab";
import { ShareModuleDialog } from "@/components/module/ShareModuleDialog";
import { useModulePresence } from "@/hooks/useModulePresence";
import { ModulePresence } from "@/components/module/ModulePresence";

interface Module {
  id: string;
  topic: string;
  status: string;
  final_score: number | null;
}

const Module = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [module, setModule] = useState<Module | null>(null);
  const [activeTab, setActiveTab] = useState("resources");
  const [loading, setLoading] = useState(false);
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [isOwner, setIsOwner] = useState(false);
  const [memberCount, setMemberCount] = useState(0);
  const { presenceUsers, onlineCount } = useModulePresence(id);

  useEffect(() => {
    if (id) {
      handleShareToken();
      loadModule();
      loadMemberCount();
    }
  }, [id]);

  const handleShareToken = async () => {
    const shareToken = searchParams.get('share');
    if (!shareToken) return;

    try {
      const { data: share, error: shareError } = await supabase
        .from('module_shares')
        .select('module_id')
        .eq('share_token', shareToken)
        .eq('is_active', true)
        .single();

      if (shareError) throw shareError;

      if (!share) {
        toast.error('Invalid or expired share link', {
          description: 'This share link is no longer valid.',
        });
        return;
      }

      // Check if already a member
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) {
        toast.error('Please sign in to join this module', {
          description: 'You need to be logged in to access shared modules.',
        });
        return;
      }

      const { data: existingMember } = await supabase
        .from('module_members')
        .select('id')
        .eq('module_id', share.module_id)
        .eq('user_id', user.user.id)
        .maybeSingle();

      if (!existingMember) {
        // Add as member
        const { error } = await supabase
          .from('module_members')
          .insert({
            module_id: share.module_id,
            user_id: user.user.id
          });

        if (error) throw error;
        toast.success('Successfully joined the module!', {
          description: 'You can now collaborate with other members.',
        });
        loadMemberCount();
      }

      // Remove share param from URL
      navigate(`/module/${id}`, { replace: true });
    } catch (error) {
      console.error('Error handling share token:', error);
      toast.error('Failed to join module', {
        description: 'Unable to process the share link. Please try again.',
        action: {
          label: "Retry",
          onClick: () => handleShareToken(),
        },
      });
    }
  };

  const loadMemberCount = async () => {
    if (!id) return;
    
    try {
      const { count, error } = await supabase
        .from('module_members')
        .select('*', { count: 'exact', head: true })
        .eq('module_id', id);
      
      if (error) throw error;
      setMemberCount(count || 0);
    } catch (error) {
      console.error("Failed to load member count:", error);
      toast.error("Failed to load member count", {
        description: "Unable to fetch collaboration data.",
        action: {
          label: "Retry",
          onClick: () => loadMemberCount(),
        },
      });
    }
  };

  const loadModule = async () => {
    if (!id) return;

    try {
      const { data, error } = await supabase
        .from("modules")
        .select("*")
        .eq("id", id)
        .single();

      if (error) throw error;

      setModule(data);
      
      // Check if current user is owner
      const { data: user } = await supabase.auth.getUser();
      if (user.user) {
        setIsOwner(data.user_id === user.user.id);
      }
    } catch (error) {
      console.error("Failed to load module:", error);
      toast.error("Failed to load module data", {
        description: "Unable to fetch module information. Please try again.",
        action: {
          label: "Retry",
          onClick: () => loadModule(),
        },
        cancel: {
          label: "Go Back",
          onClick: () => navigate("/dashboard"),
        },
      });
    }
  };

  const handleResetModule = async () => {
    if (!id) return;
    
    setLoading(true);
    try {
      // Delete quiz attempts
      await supabase.from("quiz_attempts").delete().eq("module_id", id);
      
      // Reset module status
      const { error } = await supabase
        .from("modules")
        .update({ status: "in_progress", final_score: null })
        .eq("id", id);

      if (error) throw error;

      toast.success("Module reset successfully!", {
        description: "You can now start fresh with all content.",
      });
      
      // Clear any saved assessment sessions for this module
      try {
        localStorage.removeItem(`quizState:${id}:quiz`);
        localStorage.removeItem(`quizState:${id}:final_test`);
        localStorage.removeItem(`assignmentState:${id}`);
      } catch {}
      
      loadModule();
      setActiveTab("resources");
    } catch (error: any) {
      console.error("Failed to reset module:", error);
      toast.error("Failed to reset module", {
        description: error.message || "Unable to reset the module. Please try again.",
        action: {
          label: "Retry",
          onClick: () => handleResetModule(),
        },
      });
    } finally {
      setLoading(false);
    }
  };

  if (!module) {
    return (
      <div className="min-h-screen bg-gradient-hero flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <div className="w-2 h-2 bg-warning rounded-full animate-pulse" />
              Loading Module Data
            </CardTitle>
            <CardDescription>
              Please wait while we load your module content...
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-hero">
      <div className="border-b border-border/50 bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">{module.topic}</h1>
              <p className="text-sm text-muted-foreground">
                Status: {module.status.replace("_", " ").toUpperCase()}
              </p>
            </div>
            <div className="flex items-center gap-2">
              {onlineCount > 0 && (
                <ModulePresence users={presenceUsers} variant="compact" />
              )}
              {memberCount > 0 && (
                <div className="flex items-center gap-1 text-sm text-muted-foreground">
                  <Users className="w-4 h-4" />
                  <span className="hidden sm:inline">{memberCount + 1} total</span>
                </div>
              )}
              {isOwner && (
                <Button 
                  variant="outline" 
                  onClick={() => setShareDialogOpen(true)}
                >
                  <Share2 className="w-4 h-4 mr-2" />
                  <span className="hidden sm:inline">Share</span>
                </Button>
              )}
              <Button 
                variant={activeTab === "discussions" ? "default" : "outline"} 
                onClick={() => setActiveTab("discussions")}
              >
                <MessageCircle className="w-4 h-4 mr-2" />
                <span className="hidden sm:inline">Discuss</span>
              </Button>
              {isOwner && (
                <Button variant="outline" onClick={handleResetModule} disabled={loading}>
                  <RotateCcw className="w-4 h-4 mr-2" />
                  <span className="hidden sm:inline">Reset Module</span>
                  <span className="sm:hidden">Reset</span>
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      <main className="container mx-auto px-4 py-8">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-7 mb-8 h-auto gap-1 p-1">
            <TabsTrigger value="resources" className="flex-col sm:flex-row gap-1 sm:gap-2 px-2 sm:px-3 py-2">
              <BookOpen className="w-4 h-4 sm:mr-0" />
              <span className="text-xs sm:text-sm">Resources</span>
            </TabsTrigger>
            <TabsTrigger value="flashcards" className="flex-col sm:flex-row gap-1 sm:gap-2 px-2 sm:px-3 py-2">
              <CreditCard className="w-4 h-4 sm:mr-0" />
              <span className="text-xs sm:text-sm">Flashcards</span>
            </TabsTrigger>
            <TabsTrigger value="presentations" className="flex-col sm:flex-row gap-1 sm:gap-2 px-2 sm:px-3 py-2">
              <Presentation className="w-4 h-4 sm:mr-0" />
              <span className="text-xs sm:text-sm hidden sm:inline">Presentations</span>
              <span className="text-xs sm:hidden">Slides</span>
            </TabsTrigger>
            <TabsTrigger value="assignment" className="flex-col sm:flex-row gap-1 sm:gap-2 px-2 sm:px-3 py-2">
              <FileText className="w-4 h-4 sm:mr-0" />
              <span className="text-xs sm:text-sm">Assignment</span>
            </TabsTrigger>
            <TabsTrigger value="quiz" className="flex-col sm:flex-row gap-1 sm:gap-2 px-2 sm:px-3 py-2">
              <Sparkles className="w-4 h-4 sm:mr-0" />
              <span className="text-xs sm:text-sm hidden sm:inline">Practice Quiz</span>
              <span className="text-xs sm:hidden">Quiz</span>
            </TabsTrigger>
            <TabsTrigger value="final-test" className="flex-col sm:flex-row gap-1 sm:gap-2 px-2 sm:px-3 py-2">
              <GraduationCap className="w-4 h-4 sm:mr-0" />
              <span className="text-xs sm:text-sm hidden sm:inline">Final Test</span>
              <span className="text-xs sm:hidden">Test</span>
            </TabsTrigger>
            <TabsTrigger value="results" className="flex-col sm:flex-row gap-1 sm:gap-2 px-2 sm:px-3 py-2">
              <GraduationCap className="w-4 h-4 sm:mr-0" />
              <span className="text-xs sm:text-sm">Results</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="resources">
            <ResourcesTab moduleId={id!} moduleTopic={module.topic} />
          </TabsContent>

          <TabsContent value="flashcards">
            <FlashcardsTab moduleId={id!} moduleTopic={module.topic} />
          </TabsContent>

          <TabsContent value="presentations">
            <PresentationsTab moduleId={id!} moduleTopic={module.topic} />
          </TabsContent>

          <TabsContent value="assignment">
            <AssignmentTab moduleId={id!} moduleTopic={module.topic} />
          </TabsContent>

          <TabsContent value="discussions">
            <DiscussionsTab moduleId={id!} />
          </TabsContent>

          <TabsContent value="quiz">
            <QuizTab moduleId={id!} moduleTopic={module.topic} quizType="quiz" onComplete={() => setActiveTab("results")} />
          </TabsContent>

          <TabsContent value="final-test">
            <QuizTab moduleId={id!} moduleTopic={module.topic} quizType="final_test" onComplete={() => setActiveTab("results")} />
          </TabsContent>

          <TabsContent value="results">
            <ResultsTab moduleId={id!} module={module} onReload={loadModule} />
          </TabsContent>
        </Tabs>
      </main>

      {isOwner && (
        <ShareModuleDialog
          open={shareDialogOpen}
          onOpenChange={setShareDialogOpen}
          moduleId={id!}
          moduleTopic={module?.topic || ''}
        />
      )}
    </div>
  );
};

export default Module;
