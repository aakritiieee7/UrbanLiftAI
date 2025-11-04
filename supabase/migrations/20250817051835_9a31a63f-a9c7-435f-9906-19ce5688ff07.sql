-- Create storage buckets for forum attachments
INSERT INTO storage.buckets (id, name, public) VALUES ('forum-attachments', 'forum-attachments', true);

-- Create chatrooms table
CREATE TABLE public.chatrooms (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('shipper', 'carrier')),
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create chat messages table
CREATE TABLE public.chat_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  chatroom_id UUID NOT NULL REFERENCES public.chatrooms(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  message TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create forum posts table
CREATE TABLE public.forum_posts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  forum_type TEXT NOT NULL CHECK (forum_type IN ('shipper', 'carrier')),
  image_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create forum replies table
CREATE TABLE public.forum_replies (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id UUID NOT NULL REFERENCES public.forum_posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  content TEXT NOT NULL,
  image_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.chatrooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.forum_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.forum_replies ENABLE ROW LEVEL SECURITY;

-- Create function to get user role from profiles
CREATE OR REPLACE FUNCTION public.get_user_role(user_uuid UUID)
RETURNS TEXT
LANGUAGE SQL
STABLE
SECURITY DEFINER
AS $$
  SELECT role FROM public.profiles WHERE user_id = user_uuid;
$$;

-- RLS Policies for chatrooms
CREATE POLICY "Shippers can view shipper chatrooms" ON public.chatrooms
  FOR SELECT USING (type = 'shipper' AND public.get_user_role(auth.uid()) = 'shipper');

CREATE POLICY "Carriers can view carrier chatrooms" ON public.chatrooms
  FOR SELECT USING (type = 'carrier' AND public.get_user_role(auth.uid()) = 'carrier');

-- RLS Policies for chat messages
CREATE POLICY "Users can view messages in accessible chatrooms" ON public.chat_messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.chatrooms 
      WHERE id = chatroom_id 
      AND ((type = 'shipper' AND public.get_user_role(auth.uid()) = 'shipper') 
           OR (type = 'carrier' AND public.get_user_role(auth.uid()) = 'carrier'))
    )
  );

CREATE POLICY "Users can create messages in accessible chatrooms" ON public.chat_messages
  FOR INSERT WITH CHECK (
    auth.uid() = user_id 
    AND EXISTS (
      SELECT 1 FROM public.chatrooms 
      WHERE id = chatroom_id 
      AND ((type = 'shipper' AND public.get_user_role(auth.uid()) = 'shipper') 
           OR (type = 'carrier' AND public.get_user_role(auth.uid()) = 'carrier'))
    )
  );

-- RLS Policies for forum posts
CREATE POLICY "Users can view posts for their role" ON public.forum_posts
  FOR SELECT USING (
    (forum_type = 'shipper' AND public.get_user_role(auth.uid()) = 'shipper')
    OR (forum_type = 'carrier' AND public.get_user_role(auth.uid()) = 'carrier')
  );

CREATE POLICY "Users can create posts for their role" ON public.forum_posts
  FOR INSERT WITH CHECK (
    auth.uid() = user_id 
    AND ((forum_type = 'shipper' AND public.get_user_role(auth.uid()) = 'shipper')
         OR (forum_type = 'carrier' AND public.get_user_role(auth.uid()) = 'carrier'))
  );

CREATE POLICY "Users can update their own posts" ON public.forum_posts
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own posts" ON public.forum_posts
  FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for forum replies
CREATE POLICY "Users can view replies for accessible posts" ON public.forum_replies
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.forum_posts 
      WHERE id = post_id 
      AND ((forum_type = 'shipper' AND public.get_user_role(auth.uid()) = 'shipper')
           OR (forum_type = 'carrier' AND public.get_user_role(auth.uid()) = 'carrier'))
    )
  );

CREATE POLICY "Users can create replies for accessible posts" ON public.forum_replies
  FOR INSERT WITH CHECK (
    auth.uid() = user_id 
    AND EXISTS (
      SELECT 1 FROM public.forum_posts 
      WHERE id = post_id 
      AND ((forum_type = 'shipper' AND public.get_user_role(auth.uid()) = 'shipper')
           OR (forum_type = 'carrier' AND public.get_user_role(auth.uid()) = 'carrier'))
    )
  );

CREATE POLICY "Users can update their own replies" ON public.forum_replies
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own replies" ON public.forum_replies
  FOR DELETE USING (auth.uid() = user_id);

-- Storage policies for forum attachments
CREATE POLICY "Users can view forum attachments" ON storage.objects
  FOR SELECT USING (bucket_id = 'forum-attachments');

CREATE POLICY "Authenticated users can upload forum attachments" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'forum-attachments' 
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can update their own forum attachments" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'forum-attachments' 
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can delete their own forum attachments" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'forum-attachments' 
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- Insert default chatrooms
INSERT INTO public.chatrooms (name, type, description) VALUES
  ('Shipper General Chat', 'shipper', 'General discussion for shippers'),
  ('Carrier Network Chat', 'carrier', 'General discussion for carriers and MSME owners');

-- Create triggers for updated_at
CREATE TRIGGER update_chatrooms_updated_at
  BEFORE UPDATE ON public.chatrooms
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_chat_messages_updated_at
  BEFORE UPDATE ON public.chat_messages
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_forum_posts_updated_at
  BEFORE UPDATE ON public.forum_posts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_forum_replies_updated_at
  BEFORE UPDATE ON public.forum_replies
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();