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
import { Truck, Shield, Route, Award, Clock } from "lucide-react";
import carrierBg from "@/assets/carrier-auth-bg.jpg";

import { signInWithIdentifier } from "@/lib/auth";

const CarrierLogin = () => {
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
      navigate("/auth/carrier/login");
      return;
    }
    const { data: profile } = await (supabase as any)
      .from("carrier_profiles")
      .select("role")
      .eq("user_id", uid)
      .maybeSingle();

    if (!profile) {
      toast({ title: "Complete your profile", description: "Finish setup to start using your dashboard." });
      navigate("/profile-setup?role=carrier");
      return;
    }
    toast({ title: "Welcome!", description: "Logged in successfully." });
    navigate(profile.role === "shipper" ? "/dashboard" : "/carrier/home");
  };

  return (
    <>
      <Helmet>
        <title>Carrier Login | UrbanLift.AI</title>
        <meta name="description" content="Secure carrier portal for Delhi logistics. AI route optimization." />
        <link rel="canonical" href="/auth/carrier/login" />
      </Helmet>
      <Navbar />
      
      <main className="min-h-screen bg-background relative overflow-hidden">
        <div className="container mx-auto px-4 py-16 relative z-10">
          <div className="max-w-6xl mx-auto">
            {/* Header Section */}
            <div className="text-center mb-12 animate-fade-in">
              <h2 className="text-4xl font-bold text-delhi-navy mb-4">Carrier Portal</h2>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                Professional delivery management for logistics partners. Optimize routes with intelligent AI algorithms.
              </p>
            </div>

            <div className="flex justify-center">
              {/* Login Form */}
              <div className="animate-slide-up max-w-md w-full">
                <Card className="shadow-[var(--shadow-delhi)] border-delhi-orange/20 bg-white/90 backdrop-blur-sm">
                  <CardHeader className="text-center bg-muted/20 rounded-t-lg">
                    <CardTitle className="text-2xl font-bold text-delhi-navy flex items-center justify-center gap-3">
                      <Truck className="w-8 h-8 text-delhi-orange" />
                      Carrier Access Portal
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
                          className="border-delhi-orange/20 focus:border-delhi-orange focus:ring-delhi-orange/20 h-12"
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
                          className="border-delhi-orange/20 focus:border-delhi-orange focus:ring-delhi-orange/20 h-12"
                          placeholder="Enter your password"
                        />
                      </div>
                      <Button 
                        type="submit" 
                        className="w-full h-12 text-base font-semibold" 
                        disabled={loading} 
                        variant="delhi-carrier"
                        size="lg"
                      >
                        {loading ? "Signing In..." : "Sign In"}
                      </Button>
                    </form>
                  </CardContent>
                  <CardFooter className="flex-col space-y-4 bg-muted/20 rounded-b-lg">
                    <div className="text-sm text-delhi-navy/70 text-center">
                      New logistics partner? 
                      <Link to="/auth/carrier/register" className="ml-2 font-semibold text-delhi-orange hover:text-delhi-navy transition-colors underline">
                        Register Your Fleet
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

export default CarrierLogin;