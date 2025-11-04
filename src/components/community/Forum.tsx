
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useAuth } from "@/contexts/AuthContext";
import { MessageSquare, ThumbsUp, Clock, User, Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface ForumPost {
  id: string;
  title: string;
  content: string;
  author: string;
  created_at: string;
  likes: number;
  replies: number;
  category: string;
  user_id: string;
}

const Forum = () => {
  const { userId, role } = useAuth();
  const { toast } = useToast();
  const [posts, setPosts] = useState<ForumPost[]>([]);
  const [showNewPost, setShowNewPost] = useState(false);
  const [newPost, setNewPost] = useState({ title: "", content: "", category: "General" });
  const [loading, setLoading] = useState(true);

  const categories = ["General", "Route Planning", "Partnerships", "Regulations", "Technology"];

  useEffect(() => {
    loadPosts();
  }, []);

  const loadPosts = async () => {
    try {
      const { data, error } = await supabase
        .from("forum_posts")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) throw error;

      // Transform data and get user names
      const postsWithNames = await Promise.all(
        (data || []).map(async (post) => {
          let authorName = "Unknown User";
          
          // Try to get user name from profiles
          const { data: profile } = await supabase
            .from("shipper_profiles")
            .select("business_name, company_name")
            .eq("user_id", post.user_id)
            .single();

          if (profile) {
            authorName = profile.business_name || profile.company_name || "User";
          } else {
            // Try carrier profiles
            const { data: carrierProfile } = await supabase
              .from("carrier_profiles")
              .select("business_name, company_name")
              .eq("user_id", post.user_id)
              .single();
            
            if (carrierProfile) {
              authorName = carrierProfile.business_name || carrierProfile.company_name || "Carrier";
            }
          }

          // Get reply count
          const { count: replyCount } = await supabase
            .from("forum_replies")
            .select("*", { count: "exact", head: true })
            .eq("post_id", post.id);

          return {
            id: post.id,
            title: post.title,
            content: post.content,
            author: authorName,
            created_at: post.created_at,
            likes: 0, // We'll implement likes later
            replies: replyCount || 0,
            category: post.forum_type,
            user_id: post.user_id
          };
        })
      );

      setPosts(postsWithNames);
    } catch (error) {
      console.error("Error loading posts:", error);
      // Fallback to default posts if database fails
      setPosts([
        {
          id: "1",
          title: "Best practices for Delhi route optimization",
          content: "What are your go-to strategies for optimizing delivery routes in Delhi traffic?",
          author: "LogisticsPro",
          created_at: new Date().toISOString(),
          likes: 12,
          replies: 8,
          category: "Route Planning",
          user_id: "default"
        },
        {
          id: "2",
          title: "Carrier partnership opportunities",
          content: "Looking for reliable carriers for regular Gurgaon-Delhi routes. Any recommendations?",
          author: "ShipperNet",
          created_at: new Date().toISOString(),
          likes: 6,
          replies: 4,
          category: "Partnerships",
          user_id: "default"
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const createPost = async () => {
    if (!newPost.title.trim() || !newPost.content.trim() || !userId) {
      if (!userId) {
        toast({ title: "Please log in to create posts" });
      }
      return;
    }
    
    try {
      const { error } = await supabase
        .from("forum_posts")
        .insert({
          title: newPost.title.trim(),
          content: newPost.content.trim(),
          forum_type: newPost.category,
          user_id: userId
        });

      if (error) throw error;

      setNewPost({ title: "", content: "", category: "General" });
      setShowNewPost(false);
      loadPosts(); // Reload posts
      toast({ title: "Post created successfully!" });
    } catch (error) {
      console.error("Error creating post:", error);
      toast({ title: "Failed to create post", description: "Please try again" });
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center p-8">Loading forum posts...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xl font-semibold">Community Forum</h3>
          <p className="text-muted-foreground">Share knowledge and discuss logistics topics</p>
        </div>
        <Button onClick={() => setShowNewPost(!showNewPost)} className="gap-2">
          <Plus className="h-4 w-4" />
          New Post
        </Button>
      </div>

      {showNewPost && (
        <Card>
          <CardHeader>
            <CardTitle>Create New Post</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input
              placeholder="Post title..."
              value={newPost.title}
              onChange={(e) => setNewPost({ ...newPost, title: e.target.value })}
            />
            <select
              className="w-full p-2 border rounded-md"
              value={newPost.category}
              onChange={(e) => setNewPost({ ...newPost, category: e.target.value })}
            >
              {categories.map((cat) => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
            <Textarea
              placeholder="Share your thoughts..."
              value={newPost.content}
              onChange={(e) => setNewPost({ ...newPost, content: e.target.value })}
              rows={4}
            />
            <div className="flex gap-2">
              <Button onClick={createPost}>Post</Button>
              <Button variant="outline" onClick={() => setShowNewPost(false)}>
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="space-y-4">
        {posts.map((post) => (
          <Card key={post.id} className="cursor-pointer hover:shadow-md transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-start gap-4">
                <Avatar className="h-10 w-10">
                  <AvatarFallback>
                    <User className="h-5 w-5" />
                  </AvatarFallback>
                </Avatar>
                
                <div className="flex-1 space-y-3">
                  <div className="flex items-center gap-3">
                    <h4 className="font-semibold text-lg">{post.title}</h4>
                    <Badge variant="secondary">{post.category}</Badge>
                  </div>
                  
                  <p className="text-muted-foreground">{post.content}</p>
                  
                  <div className="flex items-center gap-6 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <User className="h-4 w-4" />
                      <span>{post.author}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Clock className="h-4 w-4" />
                      <span>{new Date(post.created_at).toLocaleDateString()}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <ThumbsUp className="h-4 w-4" />
                      <span>{post.likes}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <MessageSquare className="h-4 w-4" />
                      <span>{post.replies} replies</span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default Forum;
