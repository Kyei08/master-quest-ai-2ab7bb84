-- Create profiles table for user data
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Create modules table
CREATE TABLE IF NOT EXISTS public.modules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  topic TEXT NOT NULL,
  status TEXT DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'completed', 'needs_revisit')),
  final_score INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.modules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own modules"
  ON public.modules FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own modules"
  ON public.modules FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own modules"
  ON public.modules FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own modules"
  ON public.modules FOR DELETE
  USING (auth.uid() = user_id);

-- Create resources table (Teacher's Picks + user-added)
CREATE TABLE IF NOT EXISTS public.resources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  module_id UUID NOT NULL REFERENCES public.modules(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  url TEXT NOT NULL,
  resource_type TEXT DEFAULT 'user' CHECK (resource_type IN ('teacher_pick', 'user')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.resources ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view resources for own modules"
  ON public.resources FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.modules
      WHERE modules.id = resources.module_id
      AND modules.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert resources for own modules"
  ON public.resources FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.modules
      WHERE modules.id = resources.module_id
      AND modules.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete resources for own modules"
  ON public.resources FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.modules
      WHERE modules.id = resources.module_id
      AND modules.user_id = auth.uid()
    )
  );

-- Create assignments table
CREATE TABLE IF NOT EXISTS public.assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  module_id UUID NOT NULL REFERENCES public.modules(id) ON DELETE CASCADE,
  content JSONB NOT NULL, -- Stores array of assignment parts
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view assignments for own modules"
  ON public.assignments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.modules
      WHERE modules.id = assignments.module_id
      AND modules.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert assignments for own modules"
  ON public.assignments FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.modules
      WHERE modules.id = assignments.module_id
      AND modules.user_id = auth.uid()
    )
  );

-- Create quiz_attempts table
CREATE TABLE IF NOT EXISTS public.quiz_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  module_id UUID NOT NULL REFERENCES public.modules(id) ON DELETE CASCADE,
  score INTEGER NOT NULL,
  total_questions INTEGER NOT NULL,
  attempt_type TEXT DEFAULT 'quiz' CHECK (attempt_type IN ('quiz', 'final_test')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.quiz_attempts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own quiz attempts"
  ON public.quiz_attempts FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.modules
      WHERE modules.id = quiz_attempts.module_id
      AND modules.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own quiz attempts"
  ON public.quiz_attempts FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.modules
      WHERE modules.id = quiz_attempts.module_id
      AND modules.user_id = auth.uid()
    )
  );

-- Create trigger to update modules.updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_modules_updated_at
  BEFORE UPDATE ON public.modules
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Create trigger to auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name)
  VALUES (NEW.id, NEW.raw_user_meta_data->>'full_name');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();