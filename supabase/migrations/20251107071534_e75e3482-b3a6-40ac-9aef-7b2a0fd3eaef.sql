-- Create table to persist in-progress assessment/quiz state across devices
CREATE TABLE public.module_progress_drafts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  module_id uuid NOT NULL REFERENCES public.modules(id) ON DELETE CASCADE,
  draft_type text NOT NULL CHECK (draft_type IN ('assignment','quiz')),
  quiz_type text,
  data jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Ensure one draft per module/type/quiz_type (treat NULL quiz_type as empty string)
CREATE UNIQUE INDEX module_progress_drafts_unique
ON public.module_progress_drafts (module_id, draft_type, coalesce(quiz_type, ''));

-- Enable Row Level Security
ALTER TABLE public.module_progress_drafts ENABLE ROW LEVEL SECURITY;

-- Policies: users can manage drafts for their own modules
CREATE POLICY "Users can view own drafts"
ON public.module_progress_drafts
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.modules
    WHERE modules.id = module_progress_drafts.module_id AND modules.user_id = auth.uid()
  )
);

CREATE POLICY "Users can insert drafts for their modules"
ON public.module_progress_drafts
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.modules
    WHERE modules.id = module_progress_drafts.module_id AND modules.user_id = auth.uid()
  )
);

CREATE POLICY "Users can update drafts for their modules"
ON public.module_progress_drafts
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.modules
    WHERE modules.id = module_progress_drafts.module_id AND modules.user_id = auth.uid()
  )
);

-- updated_at trigger
CREATE TRIGGER set_updated_at_module_progress_drafts
BEFORE UPDATE ON public.module_progress_drafts
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();