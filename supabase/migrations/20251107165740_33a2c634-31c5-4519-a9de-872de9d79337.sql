-- Create flashcards table
CREATE TABLE public.flashcards (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  module_id UUID NOT NULL REFERENCES public.modules(id) ON DELETE CASCADE,
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create presentations table
CREATE TABLE public.presentations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  module_id UUID NOT NULL REFERENCES public.modules(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create presentation_slides table
CREATE TABLE public.presentation_slides (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  presentation_id UUID NOT NULL REFERENCES public.presentations(id) ON DELETE CASCADE,
  slide_order INTEGER NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.flashcards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.presentations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.presentation_slides ENABLE ROW LEVEL SECURITY;

-- RLS Policies for flashcards
CREATE POLICY "Users can view flashcards for accessible modules"
  ON public.flashcards FOR SELECT
  USING (is_module_member(module_id, auth.uid()));

CREATE POLICY "Users can create flashcards for accessible modules"
  ON public.flashcards FOR INSERT
  WITH CHECK (is_module_member(module_id, auth.uid()) AND auth.uid() = created_by);

CREATE POLICY "Users can update own flashcards"
  ON public.flashcards FOR UPDATE
  USING (auth.uid() = created_by);

CREATE POLICY "Users can delete own flashcards"
  ON public.flashcards FOR DELETE
  USING (auth.uid() = created_by);

-- RLS Policies for presentations
CREATE POLICY "Users can view presentations for accessible modules"
  ON public.presentations FOR SELECT
  USING (is_module_member(module_id, auth.uid()));

CREATE POLICY "Users can create presentations for accessible modules"
  ON public.presentations FOR INSERT
  WITH CHECK (is_module_member(module_id, auth.uid()) AND auth.uid() = created_by);

CREATE POLICY "Users can update own presentations"
  ON public.presentations FOR UPDATE
  USING (auth.uid() = created_by);

CREATE POLICY "Users can delete own presentations"
  ON public.presentations FOR DELETE
  USING (auth.uid() = created_by);

-- RLS Policies for presentation_slides
CREATE POLICY "Users can view slides for accessible presentations"
  ON public.presentation_slides FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.presentations p
    WHERE p.id = presentation_slides.presentation_id
    AND is_module_member(p.module_id, auth.uid())
  ));

CREATE POLICY "Users can create slides for own presentations"
  ON public.presentation_slides FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.presentations p
    WHERE p.id = presentation_slides.presentation_id
    AND p.created_by = auth.uid()
  ));

CREATE POLICY "Users can update slides for own presentations"
  ON public.presentation_slides FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM public.presentations p
    WHERE p.id = presentation_slides.presentation_id
    AND p.created_by = auth.uid()
  ));

CREATE POLICY "Users can delete slides for own presentations"
  ON public.presentation_slides FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM public.presentations p
    WHERE p.id = presentation_slides.presentation_id
    AND p.created_by = auth.uid()
  ));

-- Create triggers for updated_at
CREATE TRIGGER update_flashcards_updated_at
  BEFORE UPDATE ON public.flashcards
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_presentations_updated_at
  BEFORE UPDATE ON public.presentations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_presentation_slides_updated_at
  BEFORE UPDATE ON public.presentation_slides
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes for better performance
CREATE INDEX idx_flashcards_module_id ON public.flashcards(module_id);
CREATE INDEX idx_flashcards_created_by ON public.flashcards(created_by);
CREATE INDEX idx_presentations_module_id ON public.presentations(module_id);
CREATE INDEX idx_presentations_created_by ON public.presentations(created_by);
CREATE INDEX idx_presentation_slides_presentation_id ON public.presentation_slides(presentation_id);
CREATE INDEX idx_presentation_slides_slide_order ON public.presentation_slides(presentation_id, slide_order);