BEGIN;

CREATE TABLE IF NOT EXISTS public.community_post_votes (
  post_id uuid REFERENCES public.community_posts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  created_at timestamptz DEFAULT now(),
  PRIMARY KEY (post_id, user_id)
);

ALTER TABLE public.community_post_votes ENABLE ROW LEVEL SECURITY;

-- Select public
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'community_post_votes' AND policyname = 'select votes public'
  ) THEN
    CREATE POLICY "select votes public" ON public.community_post_votes
    FOR SELECT USING (true);
  END IF;
END$$;

-- Insert own vote
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'community_post_votes' AND policyname = 'insert own vote'
  ) THEN
    CREATE POLICY "insert own vote" ON public.community_post_votes
    FOR INSERT WITH CHECK (auth.uid() = user_id);
  END IF;
END$$;

-- Delete own vote
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'community_post_votes' AND policyname = 'delete own vote'
  ) THEN
    CREATE POLICY "delete own vote" ON public.community_post_votes
    FOR DELETE USING (auth.uid() = user_id);
  END IF;
END$$;

COMMIT;