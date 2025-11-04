import Navbar from "@/components/Navbar";
import { Helmet } from "react-helmet-async";
import { useAuth } from "@/contexts/AuthContext";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DollarSign, TrendingUp, Package, Clock, Star, Truck } from "lucide-react";

const CarrierAnalytics = () => {
  const { userId } = useAuth();
  const [carrierProfile, setCarrierProfile] = useState<any>(null);
  const [jobs, setJobs] = useState<any[]>([]);
  const [stats, setStats] = useState({
    totalEarnings: 0,
    completedJobs: 0,
    avgEarningsPerJob: 0,
    totalDistance: 0,
    thisWeekEarnings: 0,
    thisMonthEarnings: 0
  });

  // Calculate earnings for a shipment based on carrier profile
  const calculateEarnings = (shipment: any) => {
    if (!carrierProfile) return 0;
    
    const baseFee = 50;
    const weightCost = (shipment.capacity_kg || 0) * 10;
    const distanceCost = (shipment.distance_km || 0) * 5;
    const baseAmount = baseFee + weightCost + distanceCost;
    
    // Experience multiplier
    const experience = carrierProfile.years_experience || 1;
    let experienceMultiplier = 1;
    if (experience < 0.5) experienceMultiplier = 0.8;
    else if (experience >= 2) experienceMultiplier = 1.1;
    
    // Vehicle type multiplier
    let vehicleMultiplier = 1;
    const capacity = carrierProfile.vehicle_capacity_kg || 1000;
    if (capacity < 500) vehicleMultiplier = 0.9;
    else if (capacity > 2000) vehicleMultiplier = 1.2;
    
    // Distance adjustment
    let distanceMultiplier = 1;
    const distance = shipment.distance_km || 0;
    if (distance > 50) distanceMultiplier = 0.95;
    else if (distance < 10) distanceMultiplier = 1.05;
    
    return Math.round(baseAmount * experienceMultiplier * vehicleMultiplier * distanceMultiplier);
  };

  useEffect(() => {
    const loadCarrierData = async () => {
      if (!userId) return;

      // Load carrier profile
      const { data: profile } = await supabase
        .from("carrier_profiles")
        .select("user_id, years_experience, vehicle_capacity_kg")
        .eq("user_id", userId)
        .single();
      
      if (profile) setCarrierProfile(profile);

      // Load all shipments for this carrier
      const { data: shipments } = await supabase
        .from("shipments")
        .select("*")
        .eq("carrier_id", userId)
        .order("created_at", { ascending: false });

      if (shipments) {
        setJobs(shipments);
      }
    };

    loadCarrierData();
  }, [userId]);

  // Recalculate stats when carrier profile or jobs change
  useEffect(() => {
    if (!carrierProfile || jobs.length === 0) return;

    const completed = jobs.filter(j => j.status === 'delivered');
    const completedEarnings = completed.reduce((sum, job) => sum + calculateEarnings(job), 0);
    const totalDistance = jobs.reduce((sum, job) => sum + (job.distance_km || 0), 0);
    
    // This week earnings (last 7 days)
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    const thisWeekJobs = completed.filter(job => new Date(job.dropoff_time || job.created_at) >= weekAgo);
    const thisWeekEarnings = thisWeekJobs.reduce((sum, job) => sum + calculateEarnings(job), 0);
    
    // This month earnings
    const monthAgo = new Date();
    monthAgo.setDate(monthAgo.getDate() - 30);
    const thisMonthJobs = completed.filter(job => new Date(job.dropoff_time || job.created_at) >= monthAgo);
    const thisMonthEarnings = thisMonthJobs.reduce((sum, job) => sum + calculateEarnings(job), 0);

    setStats({
      totalEarnings: completedEarnings,
      completedJobs: completed.length,
      avgEarningsPerJob: completed.length > 0 ? Math.round(completedEarnings / completed.length) : 0,
      totalDistance: Math.round(totalDistance * 10) / 10,
      thisWeekEarnings,
      thisMonthEarnings
    });
  }, [carrierProfile, jobs]);

  return (
    <>
      <Helmet>
        <title>Carrier Analytics | UrbanLift.AI</title>
        <meta name="description" content="Analytics for carriers to track performance, costs, and efficiency." />
        <link rel="canonical" href="/carrier/analytics" />
      </Helmet>
      <Navbar />
      <main className="min-h-screen bg-background">
        <section className="container mx-auto px-4 py-10">
          <header className="mb-8">
            <h1 className="text-3xl md:text-4xl font-bold text-delhi-navy">Carrier Analytics</h1>
            <p className="text-muted-foreground mt-2">Track your performance, earnings, and growth opportunities.</p>
          </header>

          {/* Key Metrics Grid */}
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 mb-8">
            <Card className="bg-gradient-to-br from-green-50 to-green-100/50 border-green-200">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-green-700">Total Earnings</CardTitle>
                <DollarSign className="h-4 w-4 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-700">₹{stats.totalEarnings.toLocaleString()}</div>
                <p className="text-xs text-green-600">From completed deliveries</p>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-blue-50 to-blue-100/50 border-blue-200">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-blue-700">Completed Jobs</CardTitle>
                <Package className="h-4 w-4 text-blue-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-700">{stats.completedJobs}</div>
                <p className="text-xs text-blue-600">Successfully delivered</p>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-purple-50 to-purple-100/50 border-purple-200">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-purple-700">Avg per Job</CardTitle>
                <TrendingUp className="h-4 w-4 text-purple-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-purple-700">₹{stats.avgEarningsPerJob.toLocaleString()}</div>
                <p className="text-xs text-purple-600">Average earnings</p>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-orange-50 to-orange-100/50 border-orange-200">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-orange-700">Distance Driven</CardTitle>
                <Truck className="h-4 w-4 text-orange-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-orange-700">{stats.totalDistance} km</div>
                <p className="text-xs text-orange-600">Total distance covered</p>
              </CardContent>
            </Card>
          </div>

          {/* Recent Performance */}
          <div className="grid gap-6 lg:grid-cols-2 mb-8">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-green-600" />
                  Recent Performance
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg">
                  <span className="text-sm font-medium">This Week</span>
                  <span className="text-lg font-bold text-green-600">₹{stats.thisWeekEarnings.toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-blue-50 rounded-lg">
                  <span className="text-sm font-medium">This Month</span>
                  <span className="text-lg font-bold text-blue-600">₹{stats.thisMonthEarnings.toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-purple-50 rounded-lg">
                  <span className="text-sm font-medium">Active Jobs</span>
                  <Badge variant="outline" className="bg-purple-100 text-purple-700">
                    {jobs.filter(j => j.status === 'assigned' || j.status === 'in_transit').length}
                  </Badge>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Star className="h-5 w-5 text-yellow-600" />
                  Performance Insights
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Completion Rate</span>
                    <span className="text-sm font-medium text-green-600">
                      {jobs.length > 0 ? Math.round((stats.completedJobs / jobs.length) * 100) : 0}%
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Avg Distance per Job</span>
                    <span className="text-sm font-medium">
                      {stats.completedJobs > 0 ? Math.round((stats.totalDistance / stats.completedJobs) * 10) / 10 : 0} km
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Experience Level</span>
                    <Badge variant="outline" className="text-xs">
                      {carrierProfile?.years_experience >= 2 ? 'Experienced' : 
                       carrierProfile?.years_experience >= 0.5 ? 'Intermediate' : 'New'}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Recent Jobs Table */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Deliveries</CardTitle>
            </CardHeader>
            <CardContent>
              {jobs.filter(j => j.status === 'delivered').length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No completed deliveries yet. Complete your first delivery to see analytics here!
                </div>
              ) : (
                <div className="space-y-3">
                  {jobs.filter(j => j.status === 'delivered').slice(0, 10).map(job => (
                    <div key={job.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex-1">
                        <div className="text-sm font-medium">{job.origin} → {job.destination}</div>
                        <div className="text-xs text-muted-foreground">
                          {job.dropoff_time ? new Date(job.dropoff_time).toLocaleDateString() : 'N/A'} • 
                          {job.capacity_kg} kg • {job.distance_km} km
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-bold text-green-600">₹{calculateEarnings(job).toLocaleString()}</div>
                        <Badge variant="outline" className="text-xs bg-green-50 text-green-700">Completed</Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </section>
      </main>
    </>
  );
};

export default CarrierAnalytics;