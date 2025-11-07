-- Create discussions table for module-specific questions
CREATE TABLE public.discussions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  module_id UUID NOT NULL REFERENCES public.modules(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL CHECK (char_length(title) >= 5 AND char_length(title) <= 200),
  content TEXT NOT NULL CHECK (char_length(content) >= 10 AND char_length(content) <= 5000),
  upvotes INTEGER NOT NULL DEFAULT 0,
  is_resolved BOOLEAN NOT NULL DEFAULT false,
  best_answer_id UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create discussion replies table
CREATE TABLE public.discussion_replies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  discussion_id UUID NOT NULL REFERENCES public.discussions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL CHECK (char_length(content) >= 1 AND char_length(content) <= 5000),
  upvotes INTEGER NOT NULL DEFAULT 0,
  is_best_answer BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create discussion upvotes tracking table
CREATE TABLE public.discussion_upvotes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  discussion_id UUID NOT NULL REFERENCES public.discussions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(discussion_id, user_id)
);

-- Create reply upvotes tracking table
CREATE TABLE public.reply_upvotes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reply_id UUID NOT NULL REFERENCES public.discussion_replies(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(reply_id, user_id)
);

-- Enable RLS
ALTER TABLE public.discussions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.discussion_replies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.discussion_upvotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reply_upvotes ENABLE ROW LEVEL SECURITY;

-- RLS Policies for discussions
CREATE POLICY "Users can view discussions for their modules"
  ON public.discussions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.modules
      WHERE modules.id = discussions.module_id
      AND modules.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create discussions for their modules"
  ON public.discussions FOR INSERT
  WITH CHECK (
    auth.uid() = user_id AND
    EXISTS (
      SELECT 1 FROM public.modules
      WHERE modules.id = discussions.module_id
      AND modules.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update their own discussions"
  ON public.discussions FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Instructors and admins can update any discussion"
  ON public.discussions FOR UPDATE
  USING (has_role(auth.uid(), 'instructor'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

-- RLS Policies for discussion replies
CREATE POLICY "Users can view replies for discussions they can see"
  ON public.discussion_replies FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.discussions d
      JOIN public.modules m ON m.id = d.module_id
      WHERE d.id = discussion_replies.discussion_id
      AND m.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create replies for discussions they can see"
  ON public.discussion_replies FOR INSERT
  WITH CHECK (
    auth.uid() = user_id AND
    EXISTS (
      SELECT 1 FROM public.discussions d
      JOIN public.modules m ON m.id = d.module_id
      WHERE d.id = discussion_replies.discussion_id
      AND m.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update their own replies"
  ON public.discussion_replies FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Instructors can mark best answers"
  ON public.discussion_replies FOR UPDATE
  USING (has_role(auth.uid(), 'instructor'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

-- RLS Policies for upvotes
CREATE POLICY "Users can view upvotes"
  ON public.discussion_upvotes FOR SELECT
  USING (true);

CREATE POLICY "Users can create their own upvotes"
  ON public.discussion_upvotes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own upvotes"
  ON public.discussion_upvotes FOR DELETE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can view reply upvotes"
  ON public.reply_upvotes FOR SELECT
  USING (true);

CREATE POLICY "Users can create their own reply upvotes"
  ON public.reply_upvotes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own reply upvotes"
  ON public.reply_upvotes FOR DELETE
  USING (auth.uid() = user_id);

-- Triggers for updated_at
CREATE TRIGGER update_discussions_updated_at
  BEFORE UPDATE ON public.discussions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_discussion_replies_updated_at
  BEFORE UPDATE ON public.discussion_replies
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Function to increment/decrement upvote counts
CREATE OR REPLACE FUNCTION public.update_discussion_upvotes()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.discussions
    SET upvotes = upvotes + 1
    WHERE id = NEW.discussion_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.discussions
    SET upvotes = upvotes - 1
    WHERE id = OLD.discussion_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION public.update_reply_upvotes()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.discussion_replies
    SET upvotes = upvotes + 1
    WHERE id = NEW.reply_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.discussion_replies
    SET upvotes = upvotes - 1
    WHERE id = OLD.reply_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Triggers for upvote count updates
CREATE TRIGGER update_discussion_upvotes_trigger
  AFTER INSERT OR DELETE ON public.discussion_upvotes
  FOR EACH ROW
  EXECUTE FUNCTION public.update_discussion_upvotes();

CREATE TRIGGER update_reply_upvotes_trigger
  AFTER INSERT OR DELETE ON public.reply_upvotes
  FOR EACH ROW
  EXECUTE FUNCTION public.update_reply_upvotes();