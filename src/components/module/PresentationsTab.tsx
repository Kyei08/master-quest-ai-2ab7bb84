import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Presentation, Download, Sparkles, Edit2, Save, X, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface PresentationsTabProps {
  moduleId: string;
  moduleTopic: string;
}

interface Slide {
  title: string;
  content: string;
}

const PresentationsTab = ({ moduleId, moduleTopic }: PresentationsTabProps) => {
  const [slides, setSlides] = useState<Slide[]>([]);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [loading, setLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editedTitle, setEditedTitle] = useState("");
  const [editedContent, setEditedContent] = useState("");

  useEffect(() => {
    loadPresentation();
  }, [moduleId]);

  const loadPresentation = async () => {
    const saved = localStorage.getItem(`presentation:${moduleId}`);
    if (saved) {
      setSlides(JSON.parse(saved));
    }
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

      const slides = data.slides || [];
      setSlides(slides);
      localStorage.setItem(`presentation:${moduleId}`, JSON.stringify(slides));
      toast.success("Presentation generated!");
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

  const saveEdit = () => {
    const updated = [...slides];
    updated[currentSlide] = {
      title: editedTitle,
      content: editedContent
    };
    setSlides(updated);
    localStorage.setItem(`presentation:${moduleId}`, JSON.stringify(updated));
    setIsEditing(false);
    toast.success("Slide updated!");
  };

  const cancelEdit = () => {
    setIsEditing(false);
  };

  const deleteSlide = () => {
    const updated = slides.filter((_, idx) => idx !== currentSlide);
    setSlides(updated);
    localStorage.setItem(`presentation:${moduleId}`, JSON.stringify(updated));
    
    if (currentSlide >= updated.length && updated.length > 0) {
      setCurrentSlide(updated.length - 1);
    }
    
    toast.success("Slide deleted!");
  };

  if (slides.length === 0) {
    return (
      <Card className="shadow-card-custom">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Presentation className="w-5 h-5 text-primary" />
            AI Presentation
          </CardTitle>
          <CardDescription>
            Generate a PowerPoint-style presentation for {moduleTopic}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <p className="text-muted-foreground mb-6 text-center">
            No presentation yet. Generate an AI-powered presentation to visualize key concepts!
          </p>
          <Button onClick={generatePresentation} disabled={loading} size="lg">
            <Sparkles className="w-4 h-4 mr-2" />
            {loading ? "Generating..." : "Generate Presentation"}
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Presentation</h3>
          <p className="text-sm text-muted-foreground">
            Slide {currentSlide + 1} of {slides.length}
          </p>
        </div>
        <div className="flex gap-2">
          {isEditing ? (
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
                Regenerate
              </Button>
              <Button onClick={downloadPresentation} variant="outline">
                <Download className="w-4 h-4 mr-2" />
                Download
              </Button>
            </>
          )}
        </div>
      </div>

      {isEditing ? (
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
              <h2 className="text-4xl font-bold">{slides[currentSlide].title}</h2>
              <div className="text-lg leading-relaxed whitespace-pre-line">
                {slides[currentSlide].content}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

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
    </div>
  );
};

export default PresentationsTab;
