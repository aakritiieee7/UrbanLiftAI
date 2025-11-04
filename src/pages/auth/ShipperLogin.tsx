import { Helmet } from "react-helmet-async";
import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import Navbar from "@/components/Navbar";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Package, Shield, Building, Award, MapPin } from "lucide-react";
import shipperBg from "@/assets/shipper-auth-bg.jpg";

import { signInWithIdentifier } from "@/lib/auth";

const ShipperLogin = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await signInWithIdentifier(email, password);
    setLoading(false);
    if (error) {
      toast({ title: "Login failed", description: error.message });
      return;
    }
    // Route based on whether a profile already exists
    const { data: userRes } = await supabase.auth.getUser();
    const uid = userRes.user?.id;
    if (!uid) {
      navigate("/auth/shipper/login");
      return;
    }
    const { data: profile } = await (supabase as any)
      .from("shipper_profiles")
      .select("role")
      .eq("user_id", uid)
      .maybeSingle();

    if (!profile) {
      toast({ title: "Complete your profile", description: "Finish setup to start using your dashboard." });
      navigate("/profile-setup?role=shipper");
      return;
    }
    toast({ title: "Welcome back!", description: "Logged in successfully." });
    navigate(profile.role === "carrier" ? "/carrier-dashboard" : "/shipper/home");
  };

  return (
    <>
      <Helmet>
        <title>Shipper Login | UrbanLift.AI</title>
        <meta name="description" content="Secure shipper portal for Delhi logistics. Streamline with AI-powered pooling." />
        <link rel="canonical" href="/auth/shipper/login" />
      </Helmet>
      <Navbar />
      
      <main className="min-h-screen bg-background relative overflow-hidden">
        <div className="container mx-auto px-4 py-16 relative z-10">
          <div className="max-w-6xl mx-auto">
            {/* Header Section */}
            <div className="text-center mb-12 animate-fade-in">
              <h2 className="text-4xl font-bold text-delhi-navy mb-4">Shipper Portal</h2>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                Professional logistics management for modern businesses. Pool shipments with AI-powered optimization.
              </p>
            </div>

            <div className="flex justify-center">
              {/* Login Form */}
              <div className="animate-slide-up max-w-md w-full">
                <Card className="shadow-[var(--shadow-delhi)] border-delhi-primary/20 bg-white/90 backdrop-blur-sm">
                  <CardHeader className="text-center bg-muted/20 rounded-t-lg">
                    <CardTitle className="text-2xl font-bold text-delhi-navy flex items-center justify-center gap-3">
                      <Package className="w-8 h-8 text-delhi-primary" />
                      Shipper Access Portal
                    </CardTitle>
                    <p className="text-delhi-navy/70 text-sm">Enter your credentials to access the dashboard</p>
                  </CardHeader>
                  <CardContent className="pt-8">
                    <form onSubmit={onSubmit} className="space-y-6">
                      <div className="space-y-2">
                        <Label htmlFor="identifier" className="text-delhi-navy font-medium">Email</Label>
                        <Input 
                          id="identifier" 
                          type="email" 
                          required 
                          value={email} 
                          onChange={(e) => setEmail(e.target.value)}
                          className="border-delhi-primary/20 focus:border-delhi-primary focus:ring-delhi-primary/20 h-12"
                          placeholder="your.email@company.com"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="password" className="text-delhi-navy font-medium">Password</Label>
                        <Input 
                          id="password" 
                          type="password" 
                          required 
                          value={password} 
                          onChange={(e) => setPassword(e.target.value)}
                          className="border-delhi-primary/20 focus:border-delhi-primary focus:ring-delhi-primary/20 h-12"
                          placeholder="Enter your password"
                        />
                      </div>
                      <Button 
                        type="submit" 
                        className="w-full h-12 text-base font-semibold" 
                        disabled={loading} 
                        variant="delhi-shipper"
                        size="lg"
                      >
                        {loading ? "Signing In..." : "Sign In"}
                      </Button>
                    </form>
                  </CardContent>
                  <CardFooter className="flex-col space-y-4 bg-muted/20 rounded-b-lg">
                    <div className="text-sm text-delhi-navy/70 text-center">
                      New to the platform? 
                      <Link to="/auth/shipper/register" className="ml-2 font-semibold text-delhi-primary hover:text-delhi-orange transition-colors underline">
                        Register Your Business
                      </Link>
                    </div>
                  </CardFooter>
                </Card>
              </div>
            </div>
          </div>
        </div>
      </main>
    </>
  );
};

export default ShipperLogin;