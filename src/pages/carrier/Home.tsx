import { Helmet } from "react-helmet-async";
import Layout from "@/components/Layout";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  Truck, 
  MapPin, 
  Users, 
  BarChart3, 
  Package, 
  Zap, 
  CheckCircle, 
  ArrowRight,
  Route,
  Clock,
  DollarSign,
  TrendingUp,
  Navigation,
  Shield
} from "lucide-react";

const CarrierHome = () => {
  return (
    <>
      <Helmet>
        <title>Carrier Home | UrbanLift.AI</title>
        <meta name="description" content="Your carrier hub. Find optimized routes, manage deliveries, and grow your business." />
        <link rel="canonical" href="/carrier/home" />
      </Helmet>
      <Layout>
        <main className="min-h-screen">
          {/* Hero Section */}
          <section className="relative min-h-[80vh] flex items-center justify-center overflow-hidden">
            <div 
              className="absolute inset-0 bg-cover bg-center bg-no-repeat"
              style={{ 
                backgroundImage: `linear-gradient(135deg, hsl(var(--delhi-navy))/0.9, hsl(var(--delhi-primary))/0.8), url("/lovable-uploads/4ddab88a-5534-4495-923d-ded0ef8373af.png")` 
              }}
            >
              <div className="absolute inset-0 bg-gradient-to-br from-delhi-navy/90 via-delhi-primary/80 to-delhi-navy/90"></div>
            </div>
            
            <div className="relative z-10 container mx-auto px-4 py-20 text-center">
              <div className="max-w-4xl mx-auto space-y-8">
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 border border-white/20 text-sm font-medium text-white mb-6 backdrop-blur-sm">
                  <Truck className="w-4 h-4" />
                  Smart Routes for Growing Carriers
                </div>
                
                <h1 className="text-5xl md:text-7xl font-bold text-white leading-tight">
                  Drive Smart with{" "}
                  <span className="bg-gradient-to-r from-delhi-gold to-delhi-orange bg-clip-text text-transparent">
                    UrbanLift.AI
                  </span>
                </h1>
                
                <p className="text-xl md:text-2xl text-white/90 max-w-3xl mx-auto leading-relaxed">
                  Maximize your earnings with AI-optimized routes, pooled shipments, 
                  and guaranteed loads — all designed for Delhi's carrier community.
                </p>
                
                <div className="flex flex-col sm:flex-row gap-4 justify-center pt-8">
                  <Link to="/carrier/available">
                    <Button 
                      size="xl" 
                      className="bg-delhi-primary hover:bg-delhi-primary/90 text-white shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105 border-0"
                    >
                      <Package className="mr-2" />
                      Find Shipments
                    </Button>
                  </Link>
                  <Link to="/carrier/track">
                    <Button 
                      size="xl" 
                      variant="outline"
                      className="bg-white/10 border-white/30 text-white hover:bg-white/20 backdrop-blur-sm"
                    >
                      Track Deliveries
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
          </section>

          {/* AI-Powered Features Section */}
          <section className="py-24 bg-gradient-to-b from-background to-muted/20">
            <div className="container mx-auto px-4">
              <div className="text-center space-y-4 mb-16">
                <h2 className="text-4xl md:text-5xl font-bold text-delhi-navy">
                  AI-Powered Carrier Features
                </h2>
                <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
                  Advanced technology that maximizes your efficiency and earnings
                </p>
              </div>
              
              <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-4">
                {/* Smart Route Optimization */}
                <Card className="group p-8 hover:shadow-[var(--shadow-delhi)] transition-all duration-300 hover:scale-105 border-0 bg-gradient-to-br from-blue-50 to-blue-100/50">
                  <CardHeader className="p-0 pb-6">
                    <div className="p-4 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 w-fit mb-4 group-hover:scale-110 transition-transform duration-300">
                      <Navigation className="h-8 w-8 text-white" />
                    </div>
                    <CardTitle className="text-xl font-bold text-delhi-navy">Smart Route Optimization</CardTitle>
                  </CardHeader>
                  <CardContent className="p-0 space-y-4">
                    <p className="text-muted-foreground">
                      Get the most efficient routes that avoid restrictions, traffic, and maximize your fuel efficiency for higher profits.
                    </p>
                    <Link to="/carrier/transit" className="inline-flex items-center text-blue-600 hover:text-blue-700 font-medium">
                      View routes →
                    </Link>
                  </CardContent>
                </Card>

                {/* Intelligent Load Matching */}
                <Card className="group p-8 hover:shadow-[var(--shadow-delhi)] transition-all duration-300 hover:scale-105 border-0 bg-gradient-to-br from-green-50 to-green-100/50">
                  <CardHeader className="p-0 pb-6">
                    <div className="p-4 rounded-2xl bg-gradient-to-br from-green-500 to-green-600 w-fit mb-4 group-hover:scale-110 transition-transform duration-300">
                      <Package className="h-8 w-8 text-white" />
                    </div>
                    <CardTitle className="text-xl font-bold text-delhi-navy">Intelligent Load Matching</CardTitle>
                  </CardHeader>
                  <CardContent className="p-0 space-y-4">
                    <p className="text-muted-foreground">
                      AI matches you with optimal shipments based on your vehicle capacity, route, and schedule preferences.
                    </p>
                    <Link to="/carrier/available" className="inline-flex items-center text-green-600 hover:text-green-700 font-medium">
                      Find loads →
                    </Link>
                  </CardContent>
                </Card>

                {/* Real-time Earnings */}
                <Card className="group p-8 hover:shadow-[var(--shadow-delhi)] transition-all duration-300 hover:scale-105 border-0 bg-gradient-to-br from-purple-50 to-purple-100/50">
                  <CardHeader className="p-0 pb-6">
                    <div className="p-4 rounded-2xl bg-gradient-to-br from-purple-500 to-purple-600 w-fit mb-4 group-hover:scale-110 transition-transform duration-300">
                      <DollarSign className="h-8 w-8 text-white" />
                    </div>
                    <CardTitle className="text-xl font-bold text-delhi-navy">Real-time Earnings</CardTitle>
                  </CardHeader>
                  <CardContent className="p-0 space-y-4">
                    <p className="text-muted-foreground">
                      Track your earnings in real-time with transparent pricing and instant payment processing for completed deliveries.
                    </p>
                    <Link to="/carrier/analytics" className="inline-flex items-center text-purple-600 hover:text-purple-700 font-medium">
                      View earnings →
                    </Link>
                  </CardContent>
                </Card>

                {/* Performance Analytics */}
                <Card className="group p-8 hover:shadow-[var(--shadow-delhi)] transition-all duration-300 hover:scale-105 border-0 bg-gradient-to-br from-orange-50 to-orange-100/50">
                  <CardHeader className="p-0 pb-6">
                    <div className="p-4 rounded-2xl bg-gradient-to-br from-orange-500 to-orange-600 w-fit mb-4 group-hover:scale-110 transition-transform duration-300">
                      <TrendingUp className="h-8 w-8 text-white" />
                    </div>
                    <CardTitle className="text-xl font-bold text-delhi-navy">Performance Analytics</CardTitle>
                  </CardHeader>
                  <CardContent className="p-0 space-y-4">
                    <p className="text-muted-foreground">
                      Detailed insights into your delivery performance, efficiency metrics, and growth opportunities.
                    </p>
                    <Link to="/carrier/analytics" className="inline-flex items-center text-orange-600 hover:text-orange-700 font-medium">
                      View analytics →
                    </Link>
                  </CardContent>
                </Card>
              </div>
            </div>
          </section>

          {/* Benefits Section */}
          <section className="py-24 bg-muted/30">
            <div className="container mx-auto px-4">
              <div className="grid gap-16 lg:grid-cols-3">
                {/* Higher Earnings */}
                <div className="text-center space-y-6">
                  <div className="p-6 rounded-3xl bg-gradient-to-br from-blue-500/10 to-blue-600/20 w-fit mx-auto">
                    <div className="p-4 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600">
                      <DollarSign className="h-12 w-12 text-white" />
                    </div>
                  </div>
                  <h3 className="text-2xl font-bold text-delhi-navy">Higher Earnings</h3>
                  <p className="text-muted-foreground leading-relaxed">
                    Earn up to 30% more with optimized routes, pooled shipments, and reduced empty miles.
                  </p>
                </div>

                {/* Reduced Fuel Costs */}
                <div className="text-center space-y-6">
                  <div className="p-6 rounded-3xl bg-gradient-to-br from-green-500/10 to-green-600/20 w-fit mx-auto">
                    <div className="p-4 rounded-2xl bg-gradient-to-br from-green-500 to-green-600">
                      <Route className="h-12 w-12 text-white" />
                    </div>
                  </div>
                  <h3 className="text-2xl font-bold text-delhi-navy">Reduced Fuel Costs</h3>
                  <p className="text-muted-foreground leading-relaxed">
                    Smart routing reduces fuel consumption by avoiding traffic and finding the most efficient paths.
                  </p>
                </div>

                {/* Guaranteed Security */}
                <div className="text-center space-y-6">
                  <div className="p-6 rounded-3xl bg-gradient-to-br from-purple-500/10 to-purple-600/20 w-fit mx-auto">
                    <div className="p-4 rounded-2xl bg-gradient-to-br from-purple-500 to-purple-600">
                      <Shield className="h-12 w-12 text-white" />
                    </div>
                  </div>
                  <h3 className="text-2xl font-bold text-delhi-navy">Guaranteed Security</h3>
                  <p className="text-muted-foreground leading-relaxed">
                    Verified shippers, secure payments, and comprehensive insurance coverage for peace of mind.
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* Quick Actions */}
          <section className="py-24 bg-gradient-to-br from-delhi-primary/5 to-delhi-navy/10">
            <div className="container mx-auto px-4 text-center">
              <div className="max-w-3xl mx-auto space-y-8">
                <h2 className="text-4xl font-bold text-delhi-navy">
                  Ready to Maximize Your Earnings?
                </h2>
                <p className="text-xl text-muted-foreground">
                  Join hundreds of carriers already earning more with UrbanLift.AI's smart logistics platform.
                </p>
                
                <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
                  <Link to="/carrier/available">
                    <Button 
                      size="xl" 
                      className="bg-delhi-primary hover:bg-delhi-primary/90 text-white shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105"
                    >
                      <Truck className="mr-2" />
                      Find Your Next Load
                      <ArrowRight className="ml-2" />
                    </Button>
                  </Link>
                  <Link to="/carrier/community">
                    <Button 
                      size="xl" 
                      variant="outline"
                      className="border-delhi-primary text-delhi-primary hover:bg-delhi-primary hover:text-white"
                    >
                      <Users className="mr-2" />
                      Join Carrier Community
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
          </section>
        </main>
      </Layout>
    </>
  );
};

export default CarrierHome;