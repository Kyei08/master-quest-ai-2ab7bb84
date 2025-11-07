import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Presentation, Download, Sparkles, Edit2, Save, X, Trash2, Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface PresentationsTabProps {
  moduleId: string;
  moduleTopic: string;
}

interface Slide {
  id?: string;
  title: string;
  content: string;
  slide_order?: number;
}

interface PresentationData {
  id: string;
  title: string;
  module_id: string;
  created_by: string;
}

const PresentationsTab = ({ moduleId, moduleTopic }: PresentationsTabProps) => {
  const [presentations, setPresentations] = useState<PresentationData[]>([]);
  const [currentPresentationId, setCurrentPresentationId] = useState<string | null>(null);
  const [slides, setSlides] = useState<Slide[]>([]);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [loading, setLoading] = useState(false);
  const [loadingPresentations, setLoadingPresentations] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [editedTitle, setEditedTitle] = useState("");
  const [editedContent, setEditedContent] = useState("");

  useEffect(() => {
    loadPresentations();
    
    // Subscribe to real-time updates for presentations
    const presentationsChannel = supabase
      .channel('presentations-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'presentations',
          filter: `module_id=eq.${moduleId}`
        },
        () => {
          loadPresentations();
        }
      )
      .subscribe();

    // Subscribe to real-time updates for slides
    const slidesChannel = supabase
      .channel('slides-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'presentation_slides'
        },
        () => {
          if (currentPresentationId) {
            loadSlides(currentPresentationId);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(presentationsChannel);
      supabase.removeChannel(slidesChannel);
    };
  }, [moduleId, currentPresentationId]);

  const loadPresentations = async () => {
    setLoadingPresentations(true);
    const { data, error } = await supabase
      .from('presentations')
      .select('*')
      .eq('module_id', moduleId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error loading presentations:', error);
      setLoadingPresentations(false);
      return;
    }

    setPresentations(data || []);
    
    // Load the first presentation if available
    if (data && data.length > 0 && !currentPresentationId) {
      setCurrentPresentationId(data[0].id);
      loadSlides(data[0].id);
    }
    setLoadingPresentations(false);
  };

  const loadSlides = async (presentationId: string) => {
    const { data, error } = await supabase
      .from('presentation_slides')
      .select('*')
      .eq('presentation_id', presentationId)
      .order('slide_order', { ascending: true });

    if (error) {
      console.error('Error loading slides:', error);
      return;
    }

    setSlides(data || []);
  };

  const generatePresentation = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-presentations', {
        body: { topic: moduleTopic }
      });

      if (error) throw error;
      
      if (data.error) {
        toast.error(data.error);
        return;
      }

      const slidesData = data.slides || [];
      
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');
      
      // Create presentation
      const { data: presentation, error: presentationError } = await supabase
        .from('presentations')
        .insert({
          module_id: moduleId,
          title: `${moduleTopic} Presentation`,
          created_by: user.id
        })
        .select()
        .single();
      
      if (presentationError) throw presentationError;
      
      // Save slides
      for (let i = 0; i < slidesData.length; i++) {
        await supabase.from('presentation_slides').insert({
          presentation_id: presentation.id,
          slide_order: i,
          title: slidesData[i].title,
          content: slidesData[i].content
        });
      }
      
      setCurrentPresentationId(presentation.id);
      toast.success("Presentation generated and saved!");
    } catch (error: any) {
      console.error('Error generating presentation:', error);
      toast.error(error.message || "Failed to generate presentation");
    } finally {
      setLoading(false);
    }
  };

  const downloadPresentation = () => {
    toast.info("Download feature coming soon!");
  };

  const startEditing = () => {
    const current = slides[currentSlide];
    setEditedTitle(current.title);
    setEditedContent(current.content);
    setIsEditing(true);
  };

  const startCreating = () => {
    setEditedTitle("");
    setEditedContent("");
    setIsCreating(true);
  };

  const saveEdit = async () => {
    try {
      if (isCreating) {
        // Create new slide
        if (!currentPresentationId) {
          // Need to create a presentation first
          const { data: { user } } = await supabase.auth.getUser();
          if (!user) throw new Error('Not authenticated');
          
          const { data: presentation, error: presentationError } = await supabase
            .from('presentations')
            .insert({
              module_id: moduleId,
              title: `${moduleTopic} Presentation`,
              created_by: user.id
            })
            .select()
            .single();
          
          if (presentationError) throw presentationError;
          setCurrentPresentationId(presentation.id);
          
          // Create slide
          const { error: slideError } = await supabase
            .from('presentation_slides')
            .insert({
              presentation_id: presentation.id,
              slide_order: 0,
              title: editedTitle,
              content: editedContent
            });
          
          if (slideError) throw slideError;
        } else {
          // Add to existing presentation
          const { error } = await supabase
            .from('presentation_slides')
            .insert({
              presentation_id: currentPresentationId,
              slide_order: slides.length,
              title: editedTitle,
              content: editedContent
            });
          
          if (error) throw error;
        }
        
        toast.success("Slide created!");
      } else {
        // Update existing slide
        const current = slides[currentSlide];
        
        const { error } = await supabase
          .from('presentation_slides')
          .update({
            title: editedTitle,
            content: editedContent
          })
          .eq('id', current.id);
        
        if (error) throw error;
        toast.success("Slide updated!");
      }
      
      setIsEditing(false);
      setIsCreating(false);
    } catch (error: any) {
      toast.error(error.message || "Failed to save slide");
    }
  };

  const cancelEdit = () => {
    setIsEditing(false);
    setIsCreating(false);
  };

  const deleteSlide = async () => {
    try {
      const current = slides[currentSlide];
      
      const { error } = await supabase
        .from('presentation_slides')
        .delete()
        .eq('id', current.id);
      
      if (error) throw error;
      
      if (currentSlide >= slides.length - 1 && slides.length > 1) {
        setCurrentSlide(slides.length - 2);
      }
      
      toast.success("Slide deleted!");
    } catch (error: any) {
      toast.error(error.message || "Failed to delete slide");
    }
  };

  if (loadingPresentations) {
    return (
      <Card className="shadow-card-custom">
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-64 mt-2" />
        </CardHeader>
        <CardContent>
          <div className="min-h-[400px] flex items-center justify-center">
            <div className="space-y-4 w-full max-w-2xl">
              <Skeleton className="h-8 w-3/4 mx-auto" />
              <Skeleton className="h-48 w-full" />
              <div className="flex justify-center gap-2">
                {[1, 2, 3, 4].map((i) => (
                  <Skeleton key={i} className="h-2 w-2 rounded-full" />
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (slides.length === 0 && !isCreating) {
    return (
      <Card className="shadow-card-custom">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Presentation className="w-5 h-5 text-primary" />
            Presentations
          </CardTitle>
          <CardDescription>
            Generate AI-powered presentations or create your own for {moduleTopic}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center justify-center py-12 gap-4">
          <p className="text-muted-foreground mb-6 text-center">
            No presentations yet. Generate with AI or create your own!
          </p>
          <div className="flex gap-2">
            <Button onClick={generatePresentation} disabled={loading} size="lg">
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
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Presentation</h3>
          {!isCreating && (
            <p className="text-sm text-muted-foreground">
              Slide {currentSlide + 1} of {slides.length}
            </p>
          )}
        </div>
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
                New Slide
              </Button>
              <Button onClick={startEditing} size="sm" variant="outline">
                <Edit2 className="w-4 h-4 mr-2" />
                Edit
              </Button>
              <Button onClick={deleteSlide} size="sm" variant="outline">
                <Trash2 className="w-4 h-4 mr-2" />
                Delete
              </Button>
              <Button onClick={generatePresentation} disabled={loading} variant="outline">
                <Sparkles className="w-4 h-4 mr-2" />
                AI Generate
              </Button>
              <Button onClick={downloadPresentation} variant="outline">
                <Download className="w-4 h-4 mr-2" />
                Download
              </Button>
            </>
          )}
        </div>
      </div>

      {isEditing || isCreating ? (
        <Card className="shadow-card-custom min-h-[500px]">
          <CardContent className="p-12 space-y-6">
            <div className="space-y-2">
              <label className="text-sm font-semibold text-primary uppercase tracking-wide">
                Slide Title
              </label>
              <Input
                value={editedTitle}
                onChange={(e) => setEditedTitle(e.target.value)}
                className="text-2xl font-bold"
                placeholder="Enter slide title..."
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold text-primary uppercase tracking-wide">
                Slide Content
              </label>
              <Textarea
                value={editedContent}
                onChange={(e) => setEditedContent(e.target.value)}
                className="min-h-[300px] text-lg"
                placeholder="Enter slide content..."
              />
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="shadow-card-custom min-h-[500px] bg-gradient-to-br from-background to-muted/20">
          <CardContent className="p-12">
            <div className="space-y-8">
              <h2 className="text-4xl font-bold">{slides[currentSlide]?.title}</h2>
              <div className="text-lg leading-relaxed whitespace-pre-line">
                {slides[currentSlide]?.content}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {!isCreating && !isEditing && (
        <div className="flex items-center justify-between">
          <Button
            variant="outline"
            onClick={() => setCurrentSlide(Math.max(0, currentSlide - 1))}
            disabled={currentSlide === 0}
          >
            Previous
          </Button>
          <div className="flex gap-2">
            {slides.map((_, idx) => (
              <button
                key={idx}
                onClick={() => setCurrentSlide(idx)}
                className={`w-8 h-2 rounded-full transition-colors ${
                  idx === currentSlide ? "bg-primary" : "bg-muted hover:bg-muted-foreground/20"
                }`}
              />
            ))}
          </div>
          <Button
            variant="outline"
            onClick={() => setCurrentSlide(Math.min(slides.length - 1, currentSlide + 1))}
            disabled={currentSlide === slides.length - 1}
          >
            Next
          </Button>
        </div>
      )}
    </div>
  );
};

export default PresentationsTab;
