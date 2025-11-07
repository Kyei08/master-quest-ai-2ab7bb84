-- Add usage tracking for alternative questions
CREATE TABLE IF NOT EXISTS public.question_usage_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_id UUID REFERENCES public.assignments(id) ON DELETE CASCADE,
  question_index INTEGER NOT NULL,
  alternative_question_id UUID REFERENCES public.alternative_questions(id) ON DELETE SET NULL,
  used_original BOOLEAN NOT NULL DEFAULT true,
  submission_id UUID REFERENCES public.assignment_submissions(id) ON DELETE CASCADE,
  score_received INTEGER,
  total_marks INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.question_usage_metrics ENABLE ROW LEVEL SECURITY;

-- Instructors and admins can view all metrics
CREATE POLICY "Instructors can view all question metrics"
ON public.question_usage_metrics
FOR SELECT
USING (
  has_role(auth.uid(), 'instructor'::app_role) 
  OR has_role(auth.uid(), 'admin'::app_role)
);

-- Users can insert metrics for their own submissions
CREATE POLICY "Users can insert metrics for their submissions"
ON public.question_usage_metrics
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.assignment_submissions
    WHERE assignment_submissions.id = question_usage_metrics.submission_id
    AND EXISTS (
      SELECT 1 FROM public.modules
      WHERE modules.id = assignment_submissions.module_id
      AND modules.user_id = auth.uid()
    )
  )
);

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_question_usage_assignment ON public.question_usage_metrics(assignment_id);
CREATE INDEX IF NOT EXISTS idx_question_usage_alternative ON public.question_usage_metrics(alternative_question_id);