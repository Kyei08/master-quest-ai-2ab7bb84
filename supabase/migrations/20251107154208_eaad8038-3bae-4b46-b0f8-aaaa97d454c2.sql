-- Create module_shares table for shareable links
CREATE TABLE public.module_shares (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  module_id UUID NOT NULL REFERENCES public.modules(id) ON DELETE CASCADE,
  share_token TEXT NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(16), 'hex'),
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  is_active BOOLEAN NOT NULL DEFAULT true
);

-- Create module_members table to track who has joined
CREATE TABLE public.module_members (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  module_id UUID NOT NULL REFERENCES public.modules(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  joined_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  role TEXT NOT NULL DEFAULT 'member',
  UNIQUE(module_id, user_id)
);

-- Create function to check if user is module owner or member
CREATE OR REPLACE FUNCTION public.is_module_member(module_id UUID, user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.modules WHERE id = module_id AND user_id = user_id
  ) OR EXISTS (
    SELECT 1 FROM public.module_members WHERE module_id = module_id AND user_id = user_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Enable RLS
ALTER TABLE public.module_shares ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.module_members ENABLE ROW LEVEL SECURITY;

-- RLS policies for module_shares
CREATE POLICY "Module owners can view their shares"
  ON public.module_shares FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.modules WHERE id = module_shares.module_id AND user_id = auth.uid()
  ));

CREATE POLICY "Module owners can create shares"
  ON public.module_shares FOR INSERT
  WITH CHECK (
    created_by = auth.uid() AND
    EXISTS (SELECT 1 FROM public.modules WHERE id = module_shares.module_id AND user_id = auth.uid())
  );

CREATE POLICY "Module owners can update their shares"
  ON public.module_shares FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM public.modules WHERE id = module_shares.module_id AND user_id = auth.uid()
  ));

CREATE POLICY "Anyone can view active shares by token"
  ON public.module_shares FOR SELECT
  USING (is_active = true);

-- RLS policies for module_members
CREATE POLICY "Users can view members of modules they have access to"
  ON public.module_members FOR SELECT
  USING (is_module_member(module_id, auth.uid()));

CREATE POLICY "Users can join modules via share link"
  ON public.module_members FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- Update existing RLS policies to allow module members access

-- Modules: Members can view shared modules
DROP POLICY IF EXISTS "Users can view own modules" ON public.modules;
CREATE POLICY "Users can view modules they have access to"
  ON public.modules FOR SELECT
  USING (user_id = auth.uid() OR is_module_member(id, auth.uid()));

-- Discussions: Members can view and create
DROP POLICY IF EXISTS "Users can view discussions for their modules" ON public.discussions;
CREATE POLICY "Users can view discussions for accessible modules"
  ON public.discussions FOR SELECT
  USING (is_module_member(module_id, auth.uid()));

DROP POLICY IF EXISTS "Users can create discussions for their modules" ON public.discussions;
CREATE POLICY "Users can create discussions for accessible modules"
  ON public.discussions FOR INSERT
  WITH CHECK (user_id = auth.uid() AND is_module_member(module_id, auth.uid()));

-- Discussion replies: Members can view and create
DROP POLICY IF EXISTS "Users can view replies for discussions they can see" ON public.discussion_replies;
CREATE POLICY "Users can view replies for accessible discussions"
  ON public.discussion_replies FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.discussions d
    WHERE d.id = discussion_replies.discussion_id AND is_module_member(d.module_id, auth.uid())
  ));

DROP POLICY IF EXISTS "Users can create replies for discussions they can see" ON public.discussion_replies;
CREATE POLICY "Users can create replies for accessible discussions"
  ON public.discussion_replies FOR INSERT
  WITH CHECK (
    user_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM public.discussions d
      WHERE d.id = discussion_replies.discussion_id AND is_module_member(d.module_id, auth.uid())
    )
  );

-- Resources: Members can view
DROP POLICY IF EXISTS "Users can view resources for own modules" ON public.resources;
CREATE POLICY "Users can view resources for accessible modules"
  ON public.resources FOR SELECT
  USING (is_module_member(module_id, auth.uid()));

-- Assignments: Members can view
DROP POLICY IF EXISTS "Users can view assignments for own modules" ON public.assignments;
CREATE POLICY "Users can view assignments for accessible modules"
  ON public.assignments FOR SELECT
  USING (is_module_member(module_id, auth.uid()));

-- Assignment submissions: Members can create and view own
DROP POLICY IF EXISTS "Users can view own assignment submissions" ON public.assignment_submissions;
DROP POLICY IF EXISTS "Users can create own assignment submissions" ON public.assignment_submissions;

CREATE POLICY "Users can view own submissions for accessible modules"
  ON public.assignment_submissions FOR SELECT
  USING (
    is_module_member(module_id, auth.uid()) AND
    EXISTS (SELECT 1 FROM public.modules WHERE id = assignment_submissions.module_id AND user_id = auth.uid())
  );

CREATE POLICY "Users can create submissions for accessible modules"
  ON public.assignment_submissions FOR INSERT
  WITH CHECK (is_module_member(module_id, auth.uid()));

-- Quiz attempts: Members can view own and create
DROP POLICY IF EXISTS "Users can view own quiz attempts" ON public.quiz_attempts;
DROP POLICY IF EXISTS "Users can insert own quiz attempts" ON public.quiz_attempts;

CREATE POLICY "Users can view own quiz attempts for accessible modules"
  ON public.quiz_attempts FOR SELECT
  USING (is_module_member(module_id, auth.uid()));

CREATE POLICY "Users can create quiz attempts for accessible modules"
  ON public.quiz_attempts FOR INSERT
  WITH CHECK (is_module_member(module_id, auth.uid()));

-- Module progress drafts: Members can access
DROP POLICY IF EXISTS "Users can view own drafts" ON public.module_progress_drafts;
DROP POLICY IF EXISTS "Users can insert drafts for their modules" ON public.module_progress_drafts;
DROP POLICY IF EXISTS "Users can update drafts for their modules" ON public.module_progress_drafts;

CREATE POLICY "Users can view drafts for accessible modules"
  ON public.module_progress_drafts FOR SELECT
  USING (is_module_member(module_id, auth.uid()));

CREATE POLICY "Users can insert drafts for accessible modules"
  ON public.module_progress_drafts FOR INSERT
  WITH CHECK (is_module_member(module_id, auth.uid()));

CREATE POLICY "Users can update drafts for accessible modules"
  ON public.module_progress_drafts FOR UPDATE
  USING (is_module_member(module_id, auth.uid()));