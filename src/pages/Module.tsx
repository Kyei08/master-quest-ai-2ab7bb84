import { useEffect, useState, useRef } from "react";
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
import { BatchSyncProvider, useBatchSyncContext } from "@/contexts/BatchSyncContext";
import { BatchSyncIndicator } from "@/components/module/BatchSyncIndicator";
import { UnsavedChangesDialog } from "@/components/module/UnsavedChangesDialog";
import { ConflictAlert } from "@/components/module/ConflictAlert";

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
  const [conflictedTabs, setConflictedTabs] = useState<string[]>([]);
  const { presenceUsers, onlineCount } = useModulePresence(id);
  const [needsAuth, setNeedsAuth] = useState(false);

  useEffect(() => {
    if (id) {
      const shareToken = searchParams.get('share');
      if (shareToken) {
        handleShareToken().then((joined) => {
          if (joined) {
            loadModule();
            loadMemberCount();
          }
        });
      } else {
        loadModule();
        loadMemberCount();
      }
    }
  }, [id]);

  const handleConflict = (tabName: string) => {
    setConflictedTabs((prev) => {
      if (prev.includes(tabName)) return prev;
      return [...prev, tabName];
    });
  };

  const handleDismissConflicts = () => {
    setConflictedTabs([]);
  };

  const handleRefreshModule = () => {
    setConflictedTabs([]);
    loadModule();
    toast.success("Module data refreshed", {
      description: "Latest version loaded from server",
    });
  };

  const handleSignInToJoin = () => {
    const redirect = encodeURIComponent(window.location.pathname + window.location.search);
    navigate(`/auth?redirect=${redirect}`);
  };

  const handleShareToken = async (): Promise<boolean> => {
    const shareToken = searchParams.get('share');
    if (!shareToken) return false;

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
        return false;
      }

      // Check if user is signed in
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) {
        setNeedsAuth(true);
        return false;
      }

      // Check if already a member
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
      return true;
    } catch (error) {
      console.error('Error handling share token:', error);
      toast.error('Failed to join module', {
        description: 'Unable to process the share link. Please try again.',
        action: {
          label: "Retry",
          onClick: () => handleShareToken(),
        },
      });
      return false;
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
        .maybeSingle();

      if (error) throw error;

      if (!data) {
        toast.error("Module not found", {
          description: "This module doesn't exist or you don't have access to it.",
          cancel: {
            label: "Go Back",
            onClick: () => navigate("/dashboard"),
          },
        });
        navigate("/dashboard");
        return;
      }

      setModule(data);
      
      // Check if current user is owner
      const { data: user } = await supabase.auth.getUser();
      if (user.user) {
        setIsOwner(data.user_id === user.user.id);
      }
    } catch (error: any) {
      console.error("Failed to load module:", error);
      
      // Check if it's a permission error
      const isPermissionError = error?.code === 'PGRST116' || error?.message?.includes('row-level security');
      
      toast.error("Failed to load module data", {
        description: isPermissionError 
          ? "You don't have permission to access this module. Please request access from the module creator."
          : "Unable to fetch module information. Please try again.",
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

  if (needsAuth) {
    return (
      <div className="min-h-screen bg-gradient-hero flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Join this module</CardTitle>
            <CardDescription>
              Sign in to view discussions and participate.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex gap-2">
            <Button onClick={handleSignInToJoin} className="flex-1">Sign in to join</Button>
            <Button variant="outline" onClick={() => navigate("/")} className="flex-1">Back to Home</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

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
        <div className="container mx-auto px-2 sm:px-4 py-3 sm:py-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="w-full sm:w-auto">
              <h1 className="text-xl sm:text-2xl font-bold truncate">{module.topic}</h1>
              <p className="text-xs sm:text-sm text-muted-foreground">
                Status: {module.status.replace("_", " ").toUpperCase()}
              </p>
            </div>
            <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap w-full sm:w-auto justify-end">
              {onlineCount > 0 && (
                <ModulePresence users={presenceUsers} variant="compact" />
              )}
              {memberCount > 0 && (
                <div className="flex items-center gap-1 text-xs sm:text-sm text-muted-foreground">
                  <Users className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  <span className="hidden sm:inline">{memberCount + 1} total</span>
                  <span className="sm:hidden">{memberCount + 1}</span>
                </div>
              )}
              {isOwner && (
                <Button 
                  variant="outline"
                  size="sm"
                  onClick={() => setShareDialogOpen(true)}
                  className="h-8 sm:h-9"
                >
                  <Share2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 sm:mr-2" />
                  <span className="hidden sm:inline">Share</span>
                </Button>
              )}
              <Button 
                variant={activeTab === "discussions" ? "default" : "outline"}
                size="sm"
                onClick={() => setActiveTab("discussions")}
                className="h-8 sm:h-9"
              >
                <MessageCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4 sm:mr-2" />
                <span className="hidden sm:inline">Discuss</span>
              </Button>
              {isOwner && (
                <Button 
                  variant="outline"
                  size="sm"
                  onClick={handleResetModule} 
                  disabled={loading}
                  className="h-8 sm:h-9"
                >
                  <RotateCcw className="w-3.5 h-3.5 sm:w-4 sm:h-4 sm:mr-2" />
                  <span className="hidden lg:inline">Reset Module</span>
                  <span className="lg:hidden hidden sm:inline">Reset</span>
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      <main className="container mx-auto px-2 sm:px-4 py-4 sm:py-8">
        <BatchSyncProvider moduleId={id!} onConflict={handleConflict}>
          <ModuleContent 
            module={module} 
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            id={id!}
            loadModule={loadModule}
            conflictedTabs={conflictedTabs}
            onDismissConflicts={handleDismissConflicts}
            onRefreshModule={handleRefreshModule}
          />
        </BatchSyncProvider>
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

// Separate component to use batch sync context
const ModuleContent = ({ 
  module, 
  activeTab, 
  setActiveTab, 
  id,
  loadModule,
  conflictedTabs,
  onDismissConflicts,
  onRefreshModule
}: { 
  module: Module; 
  activeTab: string; 
  setActiveTab: (tab: string) => void;
  id: string;
  loadModule: () => void;
  conflictedTabs: string[];
  onDismissConflicts: () => void;
  onRefreshModule: () => void;
}) => {
  const { syncing, lastBatchSync, syncAll, queueSize, queueItems, nextRetryTime, registeredCount, syncStats, retryItem } = useBatchSyncContext();
  const previousTabRef = useRef(activeTab);
  const [autoSyncInProgress, setAutoSyncInProgress] = useState(false);
  const [showUnsavedDialog, setShowUnsavedDialog] = useState(false);
  const [pendingTab, setPendingTab] = useState<string | null>(null);
  const isInitialMount = useRef(true);

  // Handle tab change with unsaved changes check
  const handleTabChange = (newTab: string) => {
    // Skip confirmation on initial mount or if no changes
    if (isInitialMount.current || registeredCount === 0 || syncing || autoSyncInProgress) {
      setActiveTab(newTab);
      return;
    }

    // Show confirmation dialog if there are unsaved changes
    setPendingTab(newTab);
    setShowUnsavedDialog(true);
  };

  const handleSaveAndContinue = async () => {
    if (!pendingTab) return;

    setShowUnsavedDialog(false);
    setAutoSyncInProgress(true);

    try {
      await syncAll();
      toast.success("💾 Changes saved successfully", {
        duration: 2000,
      });
      setActiveTab(pendingTab);
      previousTabRef.current = pendingTab;
    } catch (error) {
      console.error("Save failed:", error);
      toast.error("Failed to save changes", {
        description: "Please try again or continue without saving",
      });
    } finally {
      setAutoSyncInProgress(false);
      setPendingTab(null);
    }
  };

  const handleContinueWithoutSaving = () => {
    if (!pendingTab) return;

    toast.info("⚠️ Switched without saving changes", {
      duration: 2000,
    });
    setActiveTab(pendingTab);
    previousTabRef.current = pendingTab;
    setShowUnsavedDialog(false);
    setPendingTab(null);
  };

  const handleCancelTabSwitch = () => {
    setShowUnsavedDialog(false);
    setPendingTab(null);
  };

  // Mark initial mount as complete after first render
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
    }
  }, []);

  // Warn when leaving page with unsaved changes
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (registeredCount > 0) {
        e.preventDefault();
        e.returnValue = "";
        return "";
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [registeredCount]);

  return (
    <>
      <UnsavedChangesDialog
        open={showUnsavedDialog}
        onOpenChange={handleCancelTabSwitch}
        onSaveAndContinue={handleSaveAndContinue}
        onContinueWithoutSaving={handleContinueWithoutSaving}
        registeredCount={registeredCount}
      />

      <ConflictAlert
        conflictedTabs={conflictedTabs}
        onRefresh={onRefreshModule}
        onDismiss={onDismissConflicts}
      />

      <BatchSyncIndicator
        syncing={syncing || autoSyncInProgress}
        lastBatchSync={lastBatchSync}
        onSyncAll={syncAll}
        queueSize={queueSize}
        queueItems={queueItems}
        nextRetryTime={nextRetryTime}
        registeredCount={registeredCount}
        syncStats={syncStats}
        autoSyncing={autoSyncInProgress}
        onRetryItem={retryItem}
      />
      
      <Tabs value={activeTab} onValueChange={handleTabChange} className="mt-3 sm:mt-4">
        <TabsList className="grid w-full grid-cols-7 mb-4 sm:mb-8 h-auto gap-0.5 sm:gap-1 p-0.5 sm:p-1 overflow-x-auto">
          <TabsTrigger value="resources" className="flex-col gap-0.5 sm:gap-1 px-1 sm:px-2 py-1.5 sm:py-2 min-w-[60px]">
            <BookOpen className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            <span className="text-[10px] sm:text-xs leading-tight">Resources</span>
          </TabsTrigger>
          <TabsTrigger value="flashcards" className="flex-col gap-0.5 sm:gap-1 px-1 sm:px-2 py-1.5 sm:py-2 min-w-[60px]">
            <CreditCard className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            <span className="text-[10px] sm:text-xs leading-tight">Flashcards</span>
          </TabsTrigger>
          <TabsTrigger value="presentations" className="flex-col gap-0.5 sm:gap-1 px-1 sm:px-2 py-1.5 sm:py-2 min-w-[60px]">
            <Presentation className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            <span className="text-[10px] sm:text-xs leading-tight hidden xs:inline">Presentations</span>
            <span className="text-[10px] xs:hidden leading-tight">Slides</span>
          </TabsTrigger>
          <TabsTrigger value="assignment" className="flex-col gap-0.5 sm:gap-1 px-1 sm:px-2 py-1.5 sm:py-2 min-w-[60px]">
            <FileText className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            <span className="text-[10px] sm:text-xs leading-tight">Assignment</span>
          </TabsTrigger>
          <TabsTrigger value="quiz" className="flex-col gap-0.5 sm:gap-1 px-1 sm:px-2 py-1.5 sm:py-2 min-w-[60px]">
            <Sparkles className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            <span className="text-[10px] sm:text-xs leading-tight hidden xs:inline">Practice Quiz</span>
            <span className="text-[10px] xs:hidden leading-tight">Quiz</span>
          </TabsTrigger>
          <TabsTrigger value="final-test" className="flex-col gap-0.5 sm:gap-1 px-1 sm:px-2 py-1.5 sm:py-2 min-w-[60px]">
            <GraduationCap className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            <span className="text-[10px] sm:text-xs leading-tight hidden xs:inline">Final Test</span>
            <span className="text-[10px] xs:hidden leading-tight">Test</span>
          </TabsTrigger>
          <TabsTrigger value="results" className="flex-col gap-0.5 sm:gap-1 px-1 sm:px-2 py-1.5 sm:py-2 min-w-[60px]">
            <GraduationCap className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            <span className="text-[10px] sm:text-xs leading-tight">Results</span>
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
    </>
  );
};

export default Module;
