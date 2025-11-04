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
  Leaf,
  TrendingUp,
  Target
} from "lucide-react";

const ShipperHome = () => {
  return (
    <>
      <Helmet>
        <title>Shipper Home | UrbanLift.AI</title>
        <meta name="description" content="Your logistics hub. Manage shipments, track deliveries, connect with carriers." />
        <link rel="canonical" href="/shipper/home" />
      </Helmet>
      <Layout>
        <main className="min-h-screen">
          {/* Hero Section */}
          <section className="relative min-h-[80vh] flex items-center justify-center overflow-hidden bg-gradient-to-br from-delhi-navy via-delhi-primary to-delhi-navy">
            <div className="relative z-10 container mx-auto px-4 py-20 text-center">
              <div className="max-w-4xl mx-auto space-y-8">
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 border border-white/20 text-sm font-medium text-white mb-6 backdrop-blur-sm">
                  <Zap className="w-4 h-4" />
                  AI-Powered Logistics for Modern Businesses
                </div>
                
                <h1 className="text-5xl md:text-7xl font-bold text-white leading-tight">
                  Power Your Logistics with{" "}
                  <span className="bg-gradient-to-r from-delhi-gold to-delhi-orange bg-clip-text text-transparent">
                    UrbanLift.AI
                  </span>
                </h1>
                
                <p className="text-xl md:text-2xl text-white/90 max-w-3xl mx-auto leading-relaxed">
                  A smarter platform for seamless shipping, real-time tracking, collaborative 
                  logistics, and performance analytics — all in one place.
                </p>
                
                <div className="flex flex-col sm:flex-row gap-4 justify-center pt-8">
                  <Link to="/shipper/transit">
                    <Button 
                      size="xl" 
                      className="bg-delhi-primary hover:bg-delhi-primary/90 text-white shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105 border-0"
                    >
                      <Package className="mr-2" />
                      Start Shipping
                    </Button>
                  </Link>
                  <Link to="/shipper/track">
                    <Button 
                      size="xl" 
                      variant="outline"
                      className="bg-white/10 border-white/30 text-white hover:bg-white/20 backdrop-blur-sm"
                    >
                      Track Shipment
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
                  AI-Powered Shipping Features
                </h2>
                <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
                  Our advanced AI algorithms optimize every aspect of your shipping operations
                </p>
              </div>
              
              <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-4">
                {/* AI Route Engine */}
                <Card className="group p-8 hover:shadow-[var(--shadow-delhi)] transition-all duration-300 hover:scale-105 border-0 bg-gradient-to-br from-blue-50 to-blue-100/50">
                  <CardHeader className="p-0 pb-6">
                    <div className="p-4 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 w-fit mb-4 group-hover:scale-110 transition-transform duration-300">
                      <Route className="h-8 w-8 text-white" />
                    </div>
                    <CardTitle className="text-xl font-bold text-delhi-navy">AI Route Engine</CardTitle>
                  </CardHeader>
                  <CardContent className="p-0 space-y-4">
                    <p className="text-muted-foreground">
                      Smart, restriction-aware routing but smart. Our engine guarantees safe and legal trips by automatically avoiding roads with heavy vehicle restrictions.
                    </p>
                    <Link to="/shipper/transit" className="inline-flex items-center text-blue-600 hover:text-blue-700 font-medium">
                      Optimize routes →
                    </Link>
                  </CardContent>
                </Card>

                {/* Predictive Traffic */}
                <Card className="group p-8 hover:shadow-[var(--shadow-delhi)] transition-all duration-300 hover:scale-105 border-0 bg-gradient-to-br from-green-50 to-green-100/50">
                  <CardHeader className="p-0 pb-6">
                    <div className="p-4 rounded-2xl bg-gradient-to-br from-green-500 to-green-600 w-fit mb-4 group-hover:scale-110 transition-transform duration-300">
                      <Clock className="h-8 w-8 text-white" />
                    </div>
                    <CardTitle className="text-xl font-bold text-delhi-navy">Predictive Traffic</CardTitle>
                  </CardHeader>
                  <CardContent className="p-0 space-y-4">
                    <p className="text-muted-foreground">
                      Avoid congestion proactively. Our AI studies traffic patterns to proactively route around congestion, helping you avoid delays and save time.
                    </p>
                    <Link to="/shipper/track" className="inline-flex items-center text-green-600 hover:text-green-700 font-medium">
                      Avoid traffic →
                    </Link>
                  </CardContent>
                </Card>

                {/* Intelligent Pooling */}
                <Card className="group p-8 hover:shadow-[var(--shadow-delhi)] transition-all duration-300 hover:scale-105 border-0 bg-gradient-to-br from-purple-50 to-purple-100/50">
                  <CardHeader className="p-0 pb-6">
                    <div className="p-4 rounded-2xl bg-gradient-to-br from-purple-500 to-purple-600 w-fit mb-4 group-hover:scale-110 transition-transform duration-300">
                      <Package className="h-8 w-8 text-white" />
                    </div>
                    <CardTitle className="text-xl font-bold text-delhi-navy">Intelligent Pooling</CardTitle>
                  </CardHeader>
                  <CardContent className="p-0 space-y-4">
                    <p className="text-muted-foreground">
                      Consolidate shipments automatically. Our AI consolidates multiple shipments into a single, optimized trip, drastically cutting your costs and environmental impact.
                    </p>
                    <Link to="/ai-pooling" className="inline-flex items-center text-purple-600 hover:text-purple-700 font-medium">
                      Consolidate shipments →
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
                      Actionable insights & impact metrics. Gain clear, actionable insights into your logistics with metrics that show the real-world financial impact of our AI.
                    </p>
                    <Link to="/shipper/analytics" className="inline-flex items-center text-orange-600 hover:text-orange-700 font-medium">
                      View insights →
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
                {/* Cost Reduction */}
                <div className="text-center space-y-6">
                  <div className="p-6 rounded-3xl bg-gradient-to-br from-blue-500/10 to-blue-600/20 w-fit mx-auto">
                    <div className="p-4 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600">
                      <Target className="h-12 w-12 text-white" />
                    </div>
                  </div>
                  <h3 className="text-2xl font-bold text-delhi-navy">Cost Reduction</h3>
                  <p className="text-muted-foreground leading-relaxed">
                    Our AI algorithms reduce shipping costs by optimizing routes and consolidating shipments.
                  </p>
                </div>

                {/* Time Savings */}
                <div className="text-center space-y-6">
                  <div className="p-6 rounded-3xl bg-gradient-to-br from-green-500/10 to-green-600/20 w-fit mx-auto">
                    <div className="p-4 rounded-2xl bg-gradient-to-br from-green-500 to-green-600">
                      <Clock className="h-12 w-12 text-white" />
                    </div>
                  </div>
                  <h3 className="text-2xl font-bold text-delhi-navy">Time Savings</h3>
                  <p className="text-muted-foreground leading-relaxed">
                    Predictive traffic avoidance saves an average of 18% in delivery time across all shipments.
                  </p>
                </div>

                {/* Sustainability */}
                <div className="text-center space-y-6">
                  <div className="p-6 rounded-3xl bg-gradient-to-br from-purple-500/10 to-purple-600/20 w-fit mx-auto">
                    <div className="p-4 rounded-2xl bg-gradient-to-br from-purple-500 to-purple-600">
                      <Leaf className="h-12 w-12 text-white" />
                    </div>
                  </div>
                  <h3 className="text-2xl font-bold text-delhi-navy">Sustainability</h3>
                  <p className="text-muted-foreground leading-relaxed">
                    Intelligent pooling reduces carbon emissions by minimizing empty miles and optimizing load capacity.
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
                  Ready to Transform Your Logistics?
                </h2>
                <p className="text-xl text-muted-foreground">
                  Join hundreds of businesses already using UrbanLift.AI to optimize their shipping operations.
                </p>
                
                <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
                  <Link to="/shipper/transit">
                    <Button 
                      size="xl" 
                      className="bg-delhi-primary hover:bg-delhi-primary/90 text-white shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105"
                    >
                      <Package className="mr-2" />
                      Create Your First Shipment
                      <ArrowRight className="ml-2" />
                    </Button>
                  </Link>
                  <Link to="/shipper/community">
                    <Button 
                      size="xl" 
                      variant="outline"
                      className="border-delhi-primary text-delhi-primary hover:bg-delhi-primary hover:text-white"
                    >
                      <Users className="mr-2" />
                      Explore Community
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

export default ShipperHome;