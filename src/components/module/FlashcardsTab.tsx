import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { ChevronLeft, ChevronRight, RotateCw, Sparkles, Edit2, Save, X, Trash2, Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useSyncQueue } from "@/hooks/useSyncQueue";
import { SyncIndicator } from "./SyncIndicator";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";

interface FlashcardsTabProps {
  moduleId: string;
  moduleTopic: string;
}

interface Flashcard {
  id?: string;
  question: string;
  answer: string;
  created_by?: string;
}

const FlashcardsTab = ({ moduleId, moduleTopic }: FlashcardsTabProps) => {
  const [flashcards, setFlashcards] = useState<Flashcard[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingFlashcards, setLoadingFlashcards] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [editedQuestion, setEditedQuestion] = useState("");
  const [editedAnswer, setEditedAnswer] = useState("");
  const [lastAutoSave, setLastAutoSave] = useState<Date | null>(null);
  const [syncing, setSyncing] = useState(false);
  const { addToQueue, queueSize, getNextRetryTime, processQueue } = useSyncQueue();
  const isOnline = useOnlineStatus();

  useEffect(() => {
    loadFlashcards();
    
    // Subscribe to real-time updates
    const channel = supabase
      .channel('flashcards-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'flashcards',
          filter: `module_id=eq.${moduleId}`
        },
        () => {
          loadFlashcards();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [moduleId]);

  // Auto-retry sync when coming back online
  useEffect(() => {
    if (isOnline && queueSize > 0) {
      toast.info("Connection restored. Syncing pending changes...");
      processQueue();
    }
  }, [isOnline, queueSize]);

  const loadFlashcards = async () => {
    setLoadingFlashcards(true);
    const { data, error } = await supabase
      .from('flashcards')
      .select('*')
      .eq('module_id', moduleId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error loading flashcards:', error);
      setLoadingFlashcards(false);
      return;
    }

    setFlashcards(data || []);
    setLoadingFlashcards(false);
  };

  const generateFlashcards = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-flashcards', {
        body: { topic: moduleTopic }
      });

      if (error) throw error;
      
      if (data.error) {
        toast.error(data.error);
        return;
      }

      const flashcards = data.flashcards || [];
      
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');
      
      // Save to database
      for (const card of flashcards) {
        await supabase.from('flashcards').insert({
          module_id: moduleId,
          question: card.question,
          answer: card.answer,
          created_by: user.id
        });
      }
      
      toast.success("Flashcards generated and saved!");
    } catch (error: any) {
      console.error('Error generating flashcards:', error);
      toast.error(error.message || "Failed to generate flashcards");
    } finally {
      setLoading(false);
    }
  };

  const nextCard = () => {
    setFlipped(false);
    setCurrentIndex((prev) => (prev + 1) % flashcards.length);
  };

  const prevCard = () => {
    setFlipped(false);
    setIsEditing(false);
    setCurrentIndex((prev) => (prev - 1 + flashcards.length) % flashcards.length);
  };

  const startEditing = () => {
    const current = flashcards[currentIndex];
    setEditedQuestion(current.question);
    setEditedAnswer(current.answer);
    setIsEditing(true);
    setFlipped(false);
  };

  const startCreating = () => {
    setEditedQuestion("");
    setEditedAnswer("");
    setIsCreating(true);
    setFlipped(false);
  };

  const syncToCloud = async () => {
    setSyncing(true);
    
    const payload = { 
      flashcards,
      currentIndex,
      editedQuestion,
      editedAnswer,
      isEditing,
      isCreating
    };
    
    try {
      const { error } = await supabase
        .from("module_progress_drafts")
        .upsert([{
          module_id: moduleId,
          draft_type: "flashcards",
          data: payload as any,
        }]);

      if (error) throw error;

      setLastAutoSave(new Date());
      toast.success("✅ Progress synced to cloud", { duration: 3000 });
    } catch (err: any) {
      console.error("Cloud sync failed", err);
      
      // Add to queue for retry when online
      addToQueue({
        moduleId,
        draftType: "flashcards",
        data: payload,
      });
      
      toast.error("Offline - sync queued for retry", { duration: 3000 });
    } finally {
      setSyncing(false);
    }
  };

  const saveEdit = async () => {
    try {
      const current = flashcards[currentIndex];
      
      if (isCreating) {
        // Create new flashcard
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('Not authenticated');
        
        const { error } = await supabase.from('flashcards').insert({
          module_id: moduleId,
          question: editedQuestion,
          answer: editedAnswer,
          created_by: user.id
        });
        
        if (error) throw error;
        toast.success("Flashcard created!");
      } else {
        // Update existing flashcard
        const { error } = await supabase
          .from('flashcards')
          .update({
            question: editedQuestion,
            answer: editedAnswer
          })
          .eq('id', current.id);
        
        if (error) throw error;
        toast.success("Flashcard updated!");
      }
      
      setIsEditing(false);
      setIsCreating(false);
      syncToCloud();
    } catch (error: any) {
      toast.error(error.message || "Failed to save flashcard");
    }
  };

  const cancelEdit = () => {
    setIsEditing(false);
    setIsCreating(false);
  };

  const deleteCard = async () => {
    try {
      const current = flashcards[currentIndex];
      
      const { error } = await supabase
        .from('flashcards')
        .delete()
        .eq('id', current.id);
      
      if (error) throw error;
      
      if (currentIndex >= flashcards.length - 1 && flashcards.length > 1) {
        setCurrentIndex(flashcards.length - 2);
      }
      
      toast.success("Flashcard deleted!");
    } catch (error: any) {
      toast.error(error.message || "Failed to delete flashcard");
    }
  };

  if (loadingFlashcards) {
    return (
      <Card className="shadow-card-custom">
        <CardHeader>
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-4 w-64 mt-2" />
        </CardHeader>
        <CardContent>
          <div className="min-h-[400px] flex items-center justify-center">
            <div className="space-y-4 w-full max-w-md">
              <Skeleton className="h-8 w-3/4 mx-auto" />
              <Skeleton className="h-32 w-full" />
              <Skeleton className="h-4 w-1/2 mx-auto" />
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (flashcards.length === 0 && !isCreating) {
    return (
      <Card className="shadow-card-custom">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            Flashcards
          </CardTitle>
          <CardDescription>
            Generate AI-powered flashcards or create your own to study {moduleTopic}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center justify-center py-12 gap-4">
          <p className="text-muted-foreground mb-6 text-center">
            No flashcards yet. Generate with AI or create your own!
          </p>
          <div className="flex gap-2">
            <Button onClick={generateFlashcards} disabled={loading} size="lg">
              <Sparkles className="w-4 h-4 mr-2" />
              {loading ? "Generating..." : "Generate with AI"}
            </Button>
            <Button onClick={startCreating} variant="outline" size="lg">
              <Plus className="w-4 h-4 mr-2" />
              Create Manually
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h3 className="text-lg font-semibold">Flashcards</h3>
          {!isCreating && (
            <p className="text-sm text-muted-foreground">
              Card {currentIndex + 1} of {flashcards.length}
            </p>
          )}
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          {!isOnline && (
            <div className="text-xs text-warning flex items-center gap-1">
              <span className="w-2 h-2 bg-warning rounded-full animate-pulse" />
              Offline
            </div>
          )}
          <SyncIndicator
            syncing={syncing}
            lastAutoSave={lastAutoSave}
            onSync={syncToCloud}
            queueSize={queueSize}
            nextRetryTime={getNextRetryTime()}
          />
        </div>
      </div>
      
      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          {isEditing || isCreating ? (
            <>
              <Button onClick={saveEdit} size="sm">
                <Save className="w-4 h-4 mr-2" />
                Save
              </Button>
              <Button onClick={cancelEdit} size="sm" variant="outline">
                <X className="w-4 h-4 mr-2" />
                Cancel
              </Button>
            </>
          ) : (
            <>
              <Button onClick={startCreating} size="sm" variant="outline">
                <Plus className="w-4 h-4 mr-2" />
                New
              </Button>
              <Button onClick={startEditing} size="sm" variant="outline">
                <Edit2 className="w-4 h-4 mr-2" />
                Edit
              </Button>
              <Button onClick={deleteCard} size="sm" variant="outline">
                <Trash2 className="w-4 h-4 mr-2" />
                Delete
              </Button>
              <Button onClick={generateFlashcards} disabled={loading} variant="outline">
                <RotateCw className="w-4 h-4 mr-2" />
                AI Generate
              </Button>
            </>
          )}
        </div>
      </div>

      {isEditing || isCreating ? (
        <Card className="shadow-card-custom min-h-[400px]">
          <CardContent className="p-8 space-y-6">
            <div className="space-y-2">
              <label className="text-sm font-semibold text-primary uppercase tracking-wide">
                Question
              </label>
              <Textarea
                value={editedQuestion}
                onChange={(e) => setEditedQuestion(e.target.value)}
                className="min-h-[120px] text-lg"
                placeholder="Enter the question..."
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold text-primary uppercase tracking-wide">
                Answer
              </label>
              <Textarea
                value={editedAnswer}
                onChange={(e) => setEditedAnswer(e.target.value)}
                className="min-h-[120px] text-lg"
                placeholder="Enter the answer..."
              />
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card 
          className="shadow-card-custom cursor-pointer min-h-[400px] flex items-center justify-center"
          onClick={() => setFlipped(!flipped)}
        >
          <CardContent className="p-8 text-center">
            <div className="mb-4">
              <span className="text-xs font-semibold text-primary uppercase tracking-wide">
                {flipped ? "Answer" : "Question"}
              </span>
            </div>
            <p className="text-xl font-medium">
              {flipped ? flashcards[currentIndex]?.answer : flashcards[currentIndex]?.question}
            </p>
            <p className="text-sm text-muted-foreground mt-6">
              Click card to flip
            </p>
          </CardContent>
        </Card>
      )}

      {!isCreating && !isEditing && (
        <div className="flex items-center justify-between">
          <Button
            variant="outline"
            size="icon"
            onClick={prevCard}
            disabled={flashcards.length <= 1}
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <div className="flex gap-2">
            {flashcards.map((_, idx) => (
              <div
                key={idx}
                className={`w-2 h-2 rounded-full ${
                  idx === currentIndex ? "bg-primary" : "bg-muted"
                }`}
              />
            ))}
          </div>
          <Button
            variant="outline"
            size="icon"
            onClick={nextCard}
            disabled={flashcards.length <= 1}
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      )}
    </div>
  );
};

export default FlashcardsTab;
