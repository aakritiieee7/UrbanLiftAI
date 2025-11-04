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
import { Truck, Building2, UserPlus, CheckCircle } from "lucide-react";
import carrierBg from "@/assets/carrier-auth-bg.jpg";


const CarrierRegister = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [company, setCompany] = useState("");
  // Carrier profile details
  const [serviceRegions, setServiceRegions] = useState("");
  const [vehicleTypes, setVehicleTypes] = useState("");
  const [yearsExperience, setYearsExperience] = useState("");
  const [licenses, setLicenses] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({ 
      email, 
      password, 
      options: { 
        emailRedirectTo: `${window.location.origin}/`,
        data: { 
          name, 
          role: 'carrier',
          company: company,
          company_name: company,
          service_regions: serviceRegions,
          vehicle_types: vehicleTypes,
          years_experience: yearsExperience ? Number(yearsExperience) : 0,
          licenses,
          contact_email: contactEmail || email,
          contact_phone: contactPhone,
        } 
      } 
    });

    if (signUpError) {
      setLoading(false);
      toast({ title: "Error", description: signUpError.message });
      return;
    }

    const userId = signUpData.user?.id;
    if (!userId) {
      setLoading(false);
      toast({ title: "Registration pending", description: "Please verify your email to continue." });
      return;
    }

    // Create/update profile row
    const payload = {
      user_id: userId,
      role: 'carrier',
      company_name: company,
      service_regions: serviceRegions,
      vehicle_types: vehicleTypes,
      years_experience: yearsExperience ? Number(yearsExperience) : 0,
      licenses,
      contact_email: contactEmail || email,
      contact_phone: contactPhone,
      auth_email: email,
    } as any;

    const { error: upsertError } = await (supabase as any)
      .from('carrier_profiles')
      .upsert(payload, { onConflict: 'user_id' });

    if (upsertError) {
      toast({ title: 'Profile save warning', description: upsertError.message });
    }


    setLoading(false);
    toast({ title: "Welcome aboard!", description: "Carrier registration successful!" });
    navigate("/carrier-dashboard");
  };

  return (
    <>
      <Helmet>
        <title>Register Carrier | UrbanLift.AI</title>
        <meta name="description" content="Register your fleet for AI-powered route optimization in Delhi." />
        <link rel="canonical" href="/auth/carrier/register" />
      </Helmet>
      <Navbar />
      
      <main className="min-h-screen bg-background relative overflow-hidden">
        <div className="container mx-auto px-4 py-16 relative z-10">
          <div className="max-w-2xl mx-auto">
            {/* Header Section */}
            <div className="text-center mb-12 animate-fade-in">
              <h2 className="text-4xl font-bold text-delhi-navy mb-4">Register Your Fleet</h2>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                Join the logistics network. Optimize your delivery routes with AI technology.
              </p>
            </div>

            {/* Registration Form */}
            <div className="animate-slide-up">
              <Card className="shadow-[var(--shadow-delhi)] border-delhi-orange/20 bg-white/90 backdrop-blur-sm">
                <CardHeader className="text-center bg-muted/20 rounded-t-lg">
                  <CardTitle className="text-2xl font-bold text-delhi-navy flex items-center justify-center gap-3">
                    <UserPlus className="w-8 h-8 text-delhi-orange" />
                    Fleet Registration
                  </CardTitle>
                  <p className="text-delhi-navy/70 text-sm">Register your logistics business</p>
                </CardHeader>
                <CardContent className="pt-8">
                  <form onSubmit={onSubmit} className="space-y-6">
                    <div className="space-y-2">
                      <Label htmlFor="company" className="text-delhi-navy font-medium">Company Name</Label>
                      <Input 
                        id="company" 
                        required 
                        value={company} 
                        onChange={(e) => setCompany(e.target.value)}
                        className="border-delhi-orange/20 focus:border-delhi-orange focus:ring-delhi-orange/20 h-12"
                        placeholder="Your Logistics Ltd."
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="name" className="text-delhi-navy font-medium">Full Name</Label>
                      <Input 
                        id="name" 
                        required 
                        value={name} 
                        onChange={(e) => setName(e.target.value)}
                        className="border-delhi-orange/20 focus:border-delhi-orange focus:ring-delhi-orange/20 h-12"
                        placeholder="Your Full Name"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email" className="text-delhi-navy font-medium">Email</Label>
                      <Input 
                        id="email" 
                        type="email" 
                        required 
                        value={email} 
                        onChange={(e) => setEmail(e.target.value)}
                        className="border-delhi-orange/20 focus:border-delhi-orange focus:ring-delhi-orange/20 h-12"
                        placeholder="your@company.com"
                      />
                    </div>

                    <div className="grid md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="serviceRegions" className="text-delhi-navy font-medium">Service Regions</Label>
                        <Input 
                          id="serviceRegions" 
                          required 
                          value={serviceRegions} 
                          onChange={(e) => setServiceRegions(e.target.value)}
                          className="border-delhi-orange/20 focus:border-delhi-orange focus:ring-delhi-orange/20 h-12"
                          placeholder="Delhi NCR, Mumbai"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="vehicleTypes" className="text-delhi-navy font-medium">Vehicle Types</Label>
                        <Input 
                          id="vehicleTypes" 
                          required 
                          value={vehicleTypes} 
                          onChange={(e) => setVehicleTypes(e.target.value)}
                          className="border-delhi-orange/20 focus:border-delhi-orange focus:ring-delhi-orange/20 h-12"
                          placeholder="2W, 3W, 4W, LCV"
                        />
                      </div>
                    </div>

                    <div className="grid md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="contactPhone" className="text-delhi-navy font-medium">Contact Phone</Label>
                        <Input 
                          id="contactPhone" 
                          value={contactPhone}
                          onChange={(e) => setContactPhone(e.target.value)}
                          className="border-delhi-orange/20 focus:border-delhi-orange focus:ring-delhi-orange/20 h-12"
                          placeholder="+91 98765 43210"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="yearsExperience" className="text-delhi-navy font-medium">Years of Experience</Label>
                        <Input 
                          id="yearsExperience" 
                          type="number"
                          min={0}
                          value={yearsExperience}
                          onChange={(e) => setYearsExperience(e.target.value)}
                          className="border-delhi-orange/20 focus:border-delhi-orange focus:ring-delhi-orange/20 h-12"
                          placeholder="5"
                        />
                      </div>
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
                        placeholder="Create a password"
                      />
                    </div>
                    <Button 
                      type="submit" 
                      className="w-full h-12 text-base font-semibold" 
                      disabled={loading} 
                      variant="delhi-carrier"
                      size="lg"
                    >
                      {loading ? "Creating Account..." : "Register Account"}
                    </Button>
                  </form>
                </CardContent>
                <CardFooter className="flex-col space-y-4 bg-muted/20 rounded-b-lg">
                  <div className="text-sm text-delhi-navy/70 text-center">
                    Already have an account? 
                    <Link to="/auth/carrier/login" className="ml-2 font-semibold text-delhi-orange hover:text-delhi-navy transition-colors underline">
                      Sign In
                    </Link>
                  </div>
                </CardFooter>
              </Card>
            </div>
          </div>
        </div>
      </main>
    </>
  );
};

export default CarrierRegister;