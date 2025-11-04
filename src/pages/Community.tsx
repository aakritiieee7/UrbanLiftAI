
import { Helmet } from "react-helmet-async";
import Navbar from "@/components/Navbar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { AspectRatio } from "@/components/ui/aspect-ratio";
import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Share2, ArrowBigUp } from "lucide-react";
import heroImg from "@/assets/delhi-industrial-branding.jpg";
import postImg1 from "@/assets/shipper-packing.jpg";
import postImg2 from "@/assets/hero-warehouse.jpg";
import delhiIndustrial from "@/assets/delhi-industrial-branding.jpg";

interface Post {
  id: string;
  content: string;
  user_id: string;
  created_at: string;
}

const Community = () => {
  const { userId } = useAuth();
  const { toast } = useToast();
  const [text, setText] = useState("");
  const [posts, setPosts] = useState<Post[]>([]);
  const [tab, setTab] = useState<"all" | "mine">("all");
  const [names, setNames] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  const initials = (s: string) => s.split(' ').map(p => p[0]).filter(Boolean).slice(0,2).join('').toUpperCase();

  const load = async () => {
    try {
      const { data, error } = await supabase
        .from("community_posts")
        .select("id, content, user_id, created_at")
        .order("created_at", { ascending: false })
        .limit(50);
      
      if (error) {
        console.error("Error loading posts:", error);
        setPosts([]);
        setLoading(false);
        return;
      }

      const rows = data ?? [];
      setPosts(rows);
      
      // Load profile names
      const ids = Array.from(new Set(rows.map(r => r.user_id)));
      if (ids.length) {
        const { data: profs } = await supabase
          .from("shipper_profiles")
          .select("user_id, business_name, company_name")
          .in("user_id", ids);
        
        const { data: carrierProfs } = await supabase
          .from("carrier_profiles")
          .select("user_id, business_name, company_name")
          .in("user_id", ids);

        const map: Record<string, string> = {};
        profs?.forEach(p => { map[p.user_id] = p.business_name || p.company_name || ""; });
        carrierProfs?.forEach(p => { map[p.user_id] = p.business_name || p.company_name || ""; });
        setNames(map);
      } else {
        setNames({});
      }
    } catch (error) {
      console.error("Error in load function:", error);
      setPosts([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    
    const channel = supabase
      .channel("community-posts")
      .on('postgres_changes', { event: '*', schema: 'public', table: 'community_posts' }, () => load())
      .subscribe();
    
    return () => { 
      supabase.removeChannel(channel); 
    };
  }, []);

  const create = async () => {
    if (!userId) {
      toast({ title: "Login required", description: "Please login to post." });
      return;
    }
    
    const content = text.trim();
    if (!content) return;
    
    try {
      const { error } = await supabase
        .from("community_posts")
        .insert({ content, user_id: userId });
      
      if (error) {
        toast({ title: "Error", description: error.message });
        return;
      }
      
      setText("");
      
      // Try to award points, but don't fail if function doesn't exist
      try {
        await supabase.rpc("award_points", { 
          _user_id: userId, 
          _points: 1, 
          _source: "post_created" 
        });
      } catch (pointsError) {
        console.log("Points system not available");
      }
    } catch (error) {
      console.error("Error creating post:", error);
      toast({ title: "Error", description: "Failed to create post" });
    }
  };

  const share = async (p: Post) => {
    const url = `${window.location.origin}/community#${p.id}`;
    try {
      if (navigator.share) {
        await navigator.share({ title: "UrbanLift.AI Community", text: p.content, url });
      } else {
        await navigator.clipboard.writeText(url);
        toast({ title: "Link copied", description: "Post link copied to clipboard." });
      }
    } catch (_) {
      // Ignore share cancel errors
    }
  };

  const upvote = async (p: Post) => {
    if (!userId) {
      toast({ title: "Login required", description: "Please login to upvote." });
      return;
    }
    
    toast({ title: "Feature coming soon", description: "Upvote functionality will be available soon!" });
  };

  const visiblePosts = tab === "mine" ? posts.filter(p => p.user_id === userId) : posts;

  if (loading) {
    return (
      <>
        <Helmet>
          <title>Community for Businesses & MSMEs | UrbanLift.AI</title>
          <meta name="description" content="Post queries and opinions. Upvote in realtime. Connect with Delhi MSMEs." />
          <link rel="canonical" href="/community" />
        </Helmet>
        <Navbar />
        <main className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-center p-8">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
              <p>Loading community posts...</p>
            </div>
          </div>
        </main>
      </>
    );
  }

  return (
    <>
      <Helmet>
        <title>Community for Businesses & MSMEs | UrbanLift.AI</title>
        <meta name="description" content="Post queries and opinions. Upvote in realtime. Connect with Delhi MSMEs." />
        <link rel="canonical" href="/community" />
      </Helmet>
      <Navbar />
      <main className="container mx-auto px-4 py-8">
        {/* Modern Hero Section */}
        <div className="relative mb-12">
          <div className="absolute inset-0 bg-gradient-delhi rounded-3xl opacity-90"></div>
          <div className="relative overflow-hidden rounded-3xl shadow-delhi">
            <AspectRatio ratio={21 / 9}>
              <img 
                src={heroImg} 
                alt="Delhi NCR MSME logistics community discussions" 
                className="h-full w-full object-cover" 
                loading="lazy" 
              />
              <div className="absolute inset-0 bg-gradient-to-r from-delhi-navy/80 via-delhi-primary/60 to-transparent"></div>
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center text-white space-y-4 max-w-4xl px-8">
                  <h1 className="text-4xl md:text-6xl font-bold mb-4">
                    Delhi MSME Community
                  </h1>
                  <p className="text-xl md:text-2xl text-white/90 font-medium">
                    Connect • Share • Grow Together
                  </p>
                  <div className="flex items-center justify-center gap-8 pt-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold">500+</div>
                      <div className="text-sm text-white/80">Active Members</div>
                    </div>
                    <div className="h-8 w-px bg-white/30"></div>
                    <div className="text-center">
                      <div className="text-2xl font-bold">1.2k</div>
                      <div className="text-sm text-white/80">Discussions</div>
                    </div>
                    <div className="h-8 w-px bg-white/30"></div>
                    <div className="text-center">
                      <div className="text-2xl font-bold">24/7</div>
                      <div className="text-sm text-white/80">Support</div>
                    </div>
                  </div>
                </div>
              </div>
            </AspectRatio>
          </div>
        </div>

        {/* Modern Create Post Card */}
        <Card className="mb-8 bg-gradient-to-br from-card via-card to-muted/30 border-0 shadow-elegant">
          <CardHeader className="pb-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-primary to-brand-2 flex items-center justify-center">
                <Share2 className="h-5 w-5 text-primary-foreground" />
              </div>
              <CardTitle className="text-xl">Share with the community</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="flex gap-4">
            <Input 
              placeholder="What's on your mind? Share insights, ask questions..." 
              value={text} 
              onChange={(e) => setText(e.target.value)} 
              className="flex-1 border-0 bg-background/60 rounded-xl px-4 shadow-sm"
            />
            <Button 
              onClick={create}
              className="rounded-xl px-6 bg-gradient-to-r from-primary to-brand-2 hover:shadow-lg transition-all"
            >
              Post
            </Button>
          </CardContent>
        </Card>

        {/* Modern Filter Tabs */}
        <div className="mb-8 flex items-center justify-between">
          <Tabs value={tab} onValueChange={(v) => setTab(v as any)}>
            <TabsList className="bg-muted/50 p-1 rounded-xl">
              <TabsTrigger value="all" className="rounded-lg px-6 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                All Posts
              </TabsTrigger>
              <TabsTrigger value="mine" className="rounded-lg px-6 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                My Posts
              </TabsTrigger>
            </TabsList>
          </Tabs>
          <div className="text-sm text-muted-foreground bg-muted/50 px-4 py-2 rounded-xl">
            {visiblePosts.length} posts
          </div>
        </div>

        <div className="grid gap-8">
          {visiblePosts.map((p) => {
            const display = names[p.user_id] || `User ${p.user_id.slice(0,8)}`;
            return (
              <div key={p.id} id={p.id}>
                <Card className="group bg-gradient-to-br from-card via-card to-muted/20 border-0 shadow-elegant hover:shadow-card-hover transition-all duration-300">
                  <CardHeader className="flex flex-row items-start gap-4 pb-4">
                    <Avatar className="h-12 w-12 ring-2 ring-primary/20 group-hover:ring-primary/40 transition-all">
                      <AvatarImage alt={display} />
                      <AvatarFallback className="text-sm font-bold bg-gradient-to-br from-primary/20 to-brand-2/20">
                        {initials(display)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 space-y-1">
                      <CardTitle className="text-lg font-semibold">{display}</CardTitle>
                      <div className="text-sm text-muted-foreground flex items-center gap-2">
                        <span>{new Date(p.created_at).toLocaleString()}</span>
                        <div className="h-1 w-1 bg-muted-foreground rounded-full"></div>
                        <span>MSME Partner</span>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <p className="leading-relaxed text-base">{p.content}</p>
                    <div className="flex items-center justify-between pt-2">
                      <div className="flex items-center gap-3">
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => upvote(p)} 
                          aria-label="Upvote"
                          className="text-primary hover:bg-primary/10 rounded-xl transition-all group/button"
                        >
                          <ArrowBigUp className="mr-2 h-4 w-4 group-hover/button:scale-110 transition-transform" /> 
                          <span className="font-semibold">0</span>
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => share(p)}
                          className="text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-xl transition-all"
                        >
                          <Share2 className="mr-2 h-4 w-4" /> Share
                        </Button>
                      </div>
                      <div className="text-xs text-muted-foreground bg-muted/50 px-3 py-1 rounded-full">
                        Discussion
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            );
          })}

          {visiblePosts.length === 0 && (
            <>
              {[
                { id: "dummy-1", content: "Looking for reliable cold-chain carrier for Delhi NCR — MSME dairy coop.", user: "Amrit Dairy Co.", img: postImg1, tags: ["Cold-chain", "Delhi NCR"] },
                { id: "dummy-2", content: "Need LTL from Okhla to Noida daily. Suggestions?", user: "KraftPrint MSME", img: delhiIndustrial, tags: ["LTL", "Okhla→Noida"] },
                { id: "dummy-3", content: "What's the best rate for 32ft MXL this week?", user: "TransNova Logistics", img: postImg2, tags: ["FTL", "Rates"] },
              ].map((d) => (
                <Card key={d.id} className="group bg-gradient-to-br from-card via-card to-muted/20 border-0 shadow-elegant hover:shadow-card-hover transition-all duration-300">
                  <CardHeader className="flex flex-row items-start gap-4 pb-4">
                    <Avatar className="h-12 w-12 ring-2 ring-primary/20 group-hover:ring-primary/40 transition-all">
                      <AvatarImage alt={d.user} />
                      <AvatarFallback className="text-sm font-bold bg-gradient-to-br from-primary/20 to-brand-2/20">
                        {initials(d.user)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 space-y-1">
                      <CardTitle className="text-lg font-semibold">{d.user}</CardTitle>
                      <div className="text-sm text-muted-foreground flex items-center gap-2">
                        <span>Just now</span>
                        <div className="h-1 w-1 bg-muted-foreground rounded-full"></div>
                        <span>MSME Partner</span>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <p className="leading-relaxed text-base">{d.content}</p>
                    <div className="relative overflow-hidden rounded-xl">
                      <AspectRatio ratio={16 / 9}>
                        <img 
                          src={d.img} 
                          alt={d.content} 
                          className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300" 
                          loading="lazy" 
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                      </AspectRatio>
                    </div>
                    {d.tags && d.tags.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {d.tags.map((t: string) => (
                          <Badge key={t} variant="secondary" className="rounded-full px-3 py-1 bg-primary/10 text-primary">
                            {t}
                          </Badge>
                        ))}
                      </div>
                    )}
                    <div className="flex items-center justify-between pt-2">
                      <div className="flex items-center gap-3">
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => toast({ title: "Feature coming soon", description: "Upvote functionality will be available soon!" })}
                          className="text-primary hover:bg-primary/10 rounded-xl transition-all group/button"
                        >
                          <ArrowBigUp className="mr-2 h-4 w-4 group-hover/button:scale-110 transition-transform" /> 
                          <span className="font-semibold">0</span>
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => navigator.clipboard.writeText(`${window.location.origin}/community`)}
                          className="text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-xl transition-all"
                        >
                          <Share2 className="mr-2 h-4 w-4" /> Share
                        </Button>
                      </div>
                      <div className="text-xs text-muted-foreground bg-muted/50 px-3 py-1 rounded-full">
                        Featured
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </>
          )}
        </div>
      </main>
    </>
  );
};

export default Community;
