import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, RotateCw, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface FlashcardsTabProps {
  moduleId: string;
  moduleTopic: string;
}

interface Flashcard {
  question: string;
  answer: string;
}

const FlashcardsTab = ({ moduleId, moduleTopic }: FlashcardsTabProps) => {
  const [flashcards, setFlashcards] = useState<Flashcard[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadFlashcards();
  }, [moduleId]);

  const loadFlashcards = async () => {
    // Load from local storage for now
    const saved = localStorage.getItem(`flashcards:${moduleId}`);
    if (saved) {
      setFlashcards(JSON.parse(saved));
    }
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
      setFlashcards(flashcards);
      localStorage.setItem(`flashcards:${moduleId}`, JSON.stringify(flashcards));
      toast.success("Flashcards generated!");
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
    setCurrentIndex((prev) => (prev - 1 + flashcards.length) % flashcards.length);
  };

  if (flashcards.length === 0) {
    return (
      <Card className="shadow-card-custom">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            AI Flashcards
          </CardTitle>
          <CardDescription>
            Generate interactive flashcards to help you study {moduleTopic}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <p className="text-muted-foreground mb-6 text-center">
            No flashcards yet. Generate AI-powered flashcards to start learning!
          </p>
          <Button onClick={generateFlashcards} disabled={loading} size="lg">
            <Sparkles className="w-4 h-4 mr-2" />
            {loading ? "Generating..." : "Generate Flashcards"}
          </Button>
        </CardContent>
      </Card>
    );
  }

  const currentCard = flashcards[currentIndex];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Flashcards</h3>
          <p className="text-sm text-muted-foreground">
            Card {currentIndex + 1} of {flashcards.length}
          </p>
        </div>
        <Button onClick={generateFlashcards} disabled={loading} variant="outline">
          <RotateCw className="w-4 h-4 mr-2" />
          Regenerate
        </Button>
      </div>

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
            {flipped ? currentCard.answer : currentCard.question}
          </p>
          <p className="text-sm text-muted-foreground mt-6">
            Click card to flip
          </p>
        </CardContent>
      </Card>

      <div className="flex items-center justify-center gap-4">
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
    </div>
  );
};

export default FlashcardsTab;
