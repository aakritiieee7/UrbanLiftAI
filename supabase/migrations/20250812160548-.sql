-- Enable needed extension for UUID generation
create extension if not exists pgcrypto;

-- Create enums if not exist
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'shipment_status') THEN
    CREATE TYPE public.shipment_status AS ENUM ('pending','assigned','in_transit','delivered','canceled');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'points_event_type') THEN
    CREATE TYPE public.points_event_type AS ENUM ('shipment_created','post_created','shipment_delivered');
  END IF;
END $$;

-- Helper function to auto-update updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Points awarding function (security definer to bypass RLS safely)
CREATE OR REPLACE FUNCTION public.award_points(
  _user_id uuid,
  _points int,
  _source public.points_event_type,
  _meta jsonb DEFAULT '{}'::jsonb
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Insert points event
  INSERT INTO public.points_events (user_id, points, source, meta)
  VALUES (_user_id, _points, _source, _meta);

  -- Upsert balance
  INSERT INTO public.points_balances (user_id, points)
  VALUES (_user_id, _points)
  ON CONFLICT (user_id)
  DO UPDATE SET points = public.points_balances.points + EXCLUDED.points,
                updated_at = now();
END;
$$;

-- Shipments table
CREATE TABLE IF NOT EXISTS public.shipments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shipper_id uuid NOT NULL,
  carrier_id uuid NULL,
  origin text NOT NULL,
  destination text NOT NULL,
  pickup_time timestamptz NULL,
  dropoff_time timestamptz NULL,
  capacity_kg integer NULL,
  status public.shipment_status NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Community posts table
CREATE TABLE IF NOT EXISTS public.community_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  content text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Points balance per user (for leaderboard)
CREATE TABLE IF NOT EXISTS public.points_balances (
  user_id uuid PRIMARY KEY,
  points integer NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Points events history (auditable)
CREATE TABLE IF NOT EXISTS public.points_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  points integer NOT NULL,
  source public.points_event_type NOT NULL,
  meta jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_shipments_shipper_id ON public.shipments (shipper_id);
CREATE INDEX IF NOT EXISTS idx_shipments_carrier_id ON public.shipments (carrier_id);
CREATE INDEX IF NOT EXISTS idx_shipments_status ON public.shipments (status);
CREATE INDEX IF NOT EXISTS idx_posts_user_id ON public.community_posts (user_id);
CREATE INDEX IF NOT EXISTS idx_points_events_user_id ON public.points_events (user_id);

-- Triggers for updated_at
DROP TRIGGER IF EXISTS trg_shipments_updated_at ON public.shipments;
CREATE TRIGGER trg_shipments_updated_at
BEFORE UPDATE ON public.shipments
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS trg_posts_updated_at ON public.community_posts;
CREATE TRIGGER trg_posts_updated_at
BEFORE UPDATE ON public.community_posts
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS trg_points_balances_updated_at ON public.points_balances;
CREATE TRIGGER trg_points_balances_updated_at
BEFORE UPDATE ON public.points_balances
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Award points on community post creation (+2)
CREATE OR REPLACE FUNCTION public.handle_post_created()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM public.award_points(NEW.user_id, 2, 'post_created', jsonb_build_object('post_id', NEW.id));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trg_post_created_award_points ON public.community_posts;
CREATE TRIGGER trg_post_created_award_points
AFTER INSERT ON public.community_posts
FOR EACH ROW EXECUTE FUNCTION public.handle_post_created();

-- Award points on shipment creation (+10)
CREATE OR REPLACE FUNCTION public.handle_shipment_created()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM public.award_points(NEW.shipper_id, 10, 'shipment_created', jsonb_build_object('shipment_id', NEW.id));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trg_shipment_created_award_points ON public.shipments;
CREATE TRIGGER trg_shipment_created_award_points
AFTER INSERT ON public.shipments
FOR EACH ROW EXECUTE FUNCTION public.handle_shipment_created();

-- RLS enable
ALTER TABLE public.shipments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.points_balances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.points_events ENABLE ROW LEVEL SECURITY;

-- Shipments policies
DO $$ BEGIN
  -- SELECT policies
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='shipments' AND policyname='Shippers can view their shipments'
  ) THEN
    CREATE POLICY "Shippers can view their shipments"
    ON public.shipments FOR SELECT
    USING (auth.uid() = shipper_id);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='shipments' AND policyname='Carriers can view assigned shipments'
  ) THEN
    CREATE POLICY "Carriers can view assigned shipments"
    ON public.shipments FOR SELECT
    USING (auth.uid() = carrier_id);
  END IF;

  -- INSERT policy
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='shipments' AND policyname='Shippers can create their shipments'
  ) THEN
    CREATE POLICY "Shippers can create their shipments"
    ON public.shipments FOR INSERT
    WITH CHECK (auth.uid() = shipper_id);
  END IF;

  -- UPDATE policies
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='shipments' AND policyname='Shippers can update their shipments'
  ) THEN
    CREATE POLICY "Shippers can update their shipments"
    ON public.shipments FOR UPDATE
    USING (auth.uid() = shipper_id);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='shipments' AND policyname='Carriers can update assigned shipments'
  ) THEN
    CREATE POLICY "Carriers can update assigned shipments"
    ON public.shipments FOR UPDATE
    USING (auth.uid() = carrier_id);
  END IF;

  -- DELETE policy (shipper can delete pending)
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='shipments' AND policyname='Shippers can delete pending shipments'
  ) THEN
    CREATE POLICY "Shippers can delete pending shipments"
    ON public.shipments FOR DELETE
    USING (auth.uid() = shipper_id AND status = 'pending');
  END IF;
END $$;

-- Community posts policies
DO $$ BEGIN
  -- Public read
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='community_posts' AND policyname='Anyone can read posts'
  ) THEN
    CREATE POLICY "Anyone can read posts"
    ON public.community_posts FOR SELECT
    USING (true);
  END IF;

  -- Insert own
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='community_posts' AND policyname='Users can create their posts'
  ) THEN
    CREATE POLICY "Users can create their posts"
    ON public.community_posts FOR INSERT
    WITH CHECK (auth.uid() = user_id);
  END IF;

  -- Update own
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='community_posts' AND policyname='Users can update their posts'
  ) THEN
    CREATE POLICY "Users can update their posts"
    ON public.community_posts FOR UPDATE
    USING (auth.uid() = user_id);
  END IF;

  -- Delete own
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='community_posts' AND policyname='Users can delete their posts'
  ) THEN
    CREATE POLICY "Users can delete their posts"
    ON public.community_posts FOR DELETE
    USING (auth.uid() = user_id);
  END IF;
END $$;

-- Points balances policies
DO $$ BEGIN
  -- Public leaderboard read
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='points_balances' AND policyname='Leaderboard is public'
  ) THEN
    CREATE POLICY "Leaderboard is public"
    ON public.points_balances FOR SELECT
    USING (true);
  END IF;

  -- Prevent direct writes by default (no insert/update/delete policies)
END $$;

-- Points events policies
DO $$ BEGIN
  -- Users can view their own events
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='points_events' AND policyname='Users can view their own point events'
  ) THEN
    CREATE POLICY "Users can view their own point events"
    ON public.points_events FOR SELECT
    USING (auth.uid() = user_id);
  END IF;

  -- No direct writes
END $$;