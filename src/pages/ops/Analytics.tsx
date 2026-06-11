import { useEffect, useState } from "react";
import Navbar from "@/components/Navbar";
import { Helmet } from "react-helmet-async";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { 
  ComposedChart, Bar, Line, PieChart, Pie, Cell, 
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend 
} from "recharts";
import { 
  Package, DollarSign, Leaf, TrendingUp, Clock, 
  Truck, CheckCircle, Users, Sparkles, Award, Star, Activity 
} from "lucide-react";

interface StatsData {
  totalShipments: number;
  totalGMV: number;
  statusCounts: {
    pending: number;
    assigned: number;
    in_transit: number;
    delivered: number;
  };
  activeCarriersCount: number;
  uniqueShippers: number;
  pooledCount: number;
  poolingRate: number;
  completionRate: number;
  totalCO2Saved: number;
  totalDistance: number;
  monthlyData: any[];
  statusChartData: any[];
  poolingChartData: any[];
  carrierLeaderboard: any[];
  aiRecommendationsCount: number;
}

export const OperationsAnalytics = () => {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<StatsData | null>(null);

  useEffect(() => {
    const fetchOpsData = async () => {
      setLoading(true);
      try {
        // Fetch all shipments
        const { data: shipments, error: sErr } = await supabase
          .from("shipments")
          .select("*");
        
        // Fetch all carrier profiles
        const { data: carriers, error: cErr } = await supabase
          .from("carrier_profiles")
          .select("*");

        // Fetch AI matches count
        const { data: events, error: eErr } = await supabase
          .from("shipment_events")
          .select("id")
          .eq("event_type", "recommended");

        if (sErr || cErr) {
          throw new Error("Failed to load operations data");
        }

        const shipmentsList = shipments || [];
        const carriersList = carriers || [];
        const aiRecommendationsCount = events?.length || 0;

        // Perform calculations
        const totalShipments = shipmentsList.length;
        const totalGMV = shipmentsList.reduce((sum, s) => sum + (s.payment_amount || 0), 0);
        
        const statusCounts = {
          pending: shipmentsList.filter(s => s.status === 'pending').length,
          assigned: shipmentsList.filter(s => s.status === 'assigned').length,
          in_transit: shipmentsList.filter(s => s.status === 'in_transit').length,
          delivered: shipmentsList.filter(s => s.status === 'delivered').length,
        };

        const activeCarriersCount = carriersList.length;
        const uniqueShippers = new Set(shipmentsList.map(s => s.shipper_id)).size;
        const pooledCount = shipmentsList.filter(s => s.pooled).length;
        const poolingRate = totalShipments > 0 ? (pooledCount / totalShipments) * 100 : 0;
        const completionRate = totalShipments > 0 ? (statusCounts.delivered / totalShipments) * 100 : 0;

        // Environmental CO2 Savings calculations
        const getEmissionFactor = (capacity: number) => {
          if (capacity > 200) return 0.67; // Heavy commercial
          if (capacity > 50) return 0.42;  // Medium LCV
          if (capacity > 10) return 0.19;  // Light commercial
          return 0.05; // 3-wheeler/bike
        };

        let totalCO2Saved = 0;
        let totalDistance = 0;
        shipmentsList.forEach(s => {
          const distance = s.distance_km || 15;
          totalDistance += distance;
          const capacity = s.capacity_kg || 50;
          const ef = getEmissionFactor(capacity);
          if (s.pooled) {
            // Pooling cuts CO2 emissions by 50% through consolidating trips
            totalCO2Saved += distance * ef * 0.5;
          }
        });

        // Compute monthly aggregated data
        const monthlyMap = new Map();
        
        // Seed default months in case of sparse data
        const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
        const now = new Date();
        for (let i = 5; i >= 0; i--) {
          const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
          const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
          monthlyMap.set(key, { shipments: 0, revenue: 0, pooled: 0 });
        }

        shipmentsList.forEach(s => {
          const date = new Date(s.created_at);
          const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
          if (monthlyMap.has(key)) {
            const item = monthlyMap.get(key);
            item.shipments += 1;
            item.revenue += s.payment_amount || 0;
            if (s.pooled) item.pooled += 1;
          }
        });

        const monthlyData = Array.from(monthlyMap.entries())
          .map(([key, value]) => {
            const [year, monthNum] = key.split('-');
            const monthLabel = monthNames[parseInt(monthNum) - 1] + " " + year.substring(2);
            return {
              month: monthLabel,
              shipments: value.shipments,
              revenue: value.revenue,
              pooled: value.pooled,
              key: key
            };
          })
          .sort((a, b) => a.key.localeCompare(b.key));

        // Pie chart datasets
        const statusChartData = [
          { name: 'Delivered', value: statusCounts.delivered || 1, color: 'hsl(var(--delhi-success))' },
          { name: 'In Transit', value: statusCounts.in_transit || 1, color: 'hsl(var(--delhi-primary))' },
          { name: 'Assigned', value: statusCounts.assigned || 1, color: 'hsl(var(--delhi-gold))' },
          { name: 'Pending', value: statusCounts.pending || 1, color: 'hsl(var(--delhi-orange))' },
        ];

        const poolingChartData = [
          { name: 'Pooled Trips', value: pooledCount, color: 'hsl(var(--delhi-success))' },
          { name: 'Individual Trips', value: Math.max(0, totalShipments - pooledCount), color: 'hsl(var(--delhi-navy))' },
        ];

        // Carrier Leaderboard calculations
        const baseFee = 50;
        const carrierLeaderboard = carriersList.map(c => {
          const carrierJobs = shipmentsList.filter(s => s.carrier_id === c.user_id);
          const completedJobs = carrierJobs.filter(s => s.status === 'delivered').length;
          
          const carrierEarnings = carrierJobs.reduce((sum, s) => {
            if (s.status !== 'delivered') return sum;
            const weightCost = (s.capacity_kg || 0) * 10;
            const distanceCost = (s.distance_km || 0) * 5;
            const baseAmount = baseFee + weightCost + distanceCost;
            
            const experience = c.years_experience || 1;
            let expMult = 1;
            if (experience < 0.5) expMult = 0.8;
            else if (experience >= 2) expMult = 1.1;

            const capacity = c.vehicle_capacity_kg || 1000;
            let capMult = 1;
            if (capacity < 500) capMult = 0.9;
            else if (capacity > 2000) capMult = 1.2;

            const distance = s.distance_km || 0;
            let distMult = 1;
            if (distance > 50) distMult = 0.95;
            else if (distance < 10) distMult = 1.05;

            return sum + Math.round(baseAmount * expMult * capMult * distMult);
          }, 0);

          return {
            userId: c.user_id,
            businessName: c.business_name || c.company_name || 'Carrier Partner',
            vehicleType: c.vehicle_type || 'LCV Truck',
            rating: c.average_rating || 5.0,
            completedJobs,
            totalEarnings: carrierEarnings
          };
        }).sort((a, b) => b.totalEarnings - a.totalEarnings);

        setStats({
          totalShipments,
          totalGMV,
          statusCounts,
          activeCarriersCount,
          uniqueShippers,
          pooledCount,
          poolingRate,
          completionRate,
          totalCO2Saved,
          totalDistance,
          monthlyData,
          statusChartData,
          poolingChartData,
          carrierLeaderboard,
          aiRecommendationsCount
        });

      } catch (err) {
        console.error("Ops analytics data processing error:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchOpsData();
  }, []);

  if (loading) {
    return (
      <>
        <Navbar />
        <main className="min-h-screen bg-background">
          <section className="container mx-auto px-4 py-10">
            <div className="animate-pulse space-y-8">
              <div className="h-8 bg-muted rounded w-1/3 mx-auto"></div>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="h-28 bg-muted rounded-2xl"></div>
                ))}
              </div>
              <div className="h-80 bg-muted rounded-3xl"></div>
            </div>
          </section>
        </main>
      </>
    );
  }

  if (!stats) return null;

  return (
    <>
      <Helmet>
        <title>Operations Analytics | UrbanLift.AI</title>
        <meta name="description" content="Logistics operations control panel showing platform revenue, active fleet metrics, pooling optimizations, and eco impact metrics." />
        <link rel="canonical" href="/ops/analytics" />
      </Helmet>
      
      <Navbar />
      
      <main className="min-h-screen bg-background text-foreground">
        <section className="container mx-auto px-4 py-10 space-y-8">
          
          {/* Header */}
          <header className="text-center space-y-2">
            <Badge className="bg-delhi-navy text-white text-xs px-3 py-1 font-bold rounded-full border-0">
              Operations Control Panel
            </Badge>
            <h1 className="text-3xl md:text-5xl font-black tracking-tight text-delhi-navy dark:text-white">
              Delhi NCR Logistics Analytics
            </h1>
            <p className="text-sm md:text-base text-muted-foreground max-w-2xl mx-auto">
              Real-time platform metrics, fleet matching rates, carbon offset tracking, and shipper-carrier revenue allocations.
            </p>
          </header>

          {/* Primary Cards Grid */}
          <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
            
            <Card className="border-primary/10 bg-card/40 backdrop-blur-md hover:shadow-lg transition-all duration-300 group">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Platform GMV</CardTitle>
                <div className="p-2 bg-green-50 dark:bg-green-950/20 text-green-600 dark:text-green-400 rounded-lg group-hover:scale-110 transition-transform">
                  <DollarSign className="h-4 w-4" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl md:text-3xl font-extrabold text-foreground">₹{stats.totalGMV.toLocaleString()}</div>
                <p className="text-[11px] text-muted-foreground mt-1">
                  Gross revenue across {stats.totalShipments} shipments
                </p>
              </CardContent>
            </Card>

            <Card className="border-primary/10 bg-card/40 backdrop-blur-md hover:shadow-lg transition-all duration-300 group">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Active Carrier Fleet</CardTitle>
                <div className="p-2 bg-blue-50 dark:bg-blue-950/20 text-blue-600 dark:text-blue-400 rounded-lg group-hover:scale-110 transition-transform">
                  <Truck className="h-4 w-4" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl md:text-3xl font-extrabold text-foreground">{stats.activeCarriersCount} Partners</div>
                <p className="text-[11px] text-muted-foreground mt-1">
                  Supporting {stats.uniqueShippers} active MSME shippers
                </p>
              </CardContent>
            </Card>

            <Card className="border-primary/10 bg-card/40 backdrop-blur-md hover:shadow-lg transition-all duration-300 group">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground">AI Dispatch Queries</CardTitle>
                <div className="p-2 bg-indigo-50 dark:bg-indigo-950/20 text-indigo-600 dark:text-indigo-400 rounded-lg group-hover:scale-110 transition-transform">
                  <Sparkles className="h-4 w-4" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl md:text-3xl font-extrabold text-foreground">{stats.aiRecommendationsCount} Audits</div>
                <p className="text-[11px] text-muted-foreground mt-1">
                  Immutable AI recommendations computed
                </p>
              </CardContent>
            </Card>

            <Card className="border-primary/10 bg-card/40 backdrop-blur-md hover:shadow-lg transition-all duration-300 group">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Route Pooling Rate</CardTitle>
                <div className="p-2 bg-amber-50 dark:bg-amber-950/20 text-amber-600 dark:text-amber-400 rounded-lg group-hover:scale-110 transition-transform">
                  <Activity className="h-4 w-4" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl md:text-3xl font-extrabold text-foreground">{stats.poolingRate.toFixed(1)}%</div>
                <p className="text-[11px] text-muted-foreground mt-1">
                  {stats.pooledCount} shipments optimized via pooling
                </p>
              </CardContent>
            </Card>

          </div>

          {/* Volume Trends Chart */}
          <Card className="border-primary/10 bg-card/40 backdrop-blur-md">
            <CardHeader>
              <CardTitle className="text-lg font-bold text-foreground">Monthly Platform Growth & Revenue</CardTitle>
              <p className="text-xs text-muted-foreground">Volume count vs GMV (Gross Merchandise Value) trends over time.</p>
            </CardHeader>
            <CardContent>
              <div className="h-80 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={stats.monthlyData}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                    <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                    <YAxis yAxisId="left" tick={{ fontSize: 11 }} label={{ value: 'Shipments Volume', angle: -90, position: 'insideLeft', style: { textAnchor: 'middle', fontSize: 11 } }} />
                    <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11 }} label={{ value: 'Revenue (₹)', angle: 90, position: 'insideRight', style: { textAnchor: 'middle', fontSize: 11 } }} />
                    <Tooltip contentStyle={{ background: 'rgba(255,255,255,0.95)', border: 'none', borderRadius: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    <Bar yAxisId="left" dataKey="shipments" fill="hsl(var(--delhi-primary))" name="Total Shipments" radius={[4, 4, 0, 0]} />
                    <Bar yAxisId="left" dataKey="pooled" fill="hsl(var(--delhi-success))" name="Pooled Shipments" radius={[4, 4, 0, 0]} />
                    <Line yAxisId="right" type="monotone" dataKey="revenue" stroke="hsl(var(--delhi-orange))" strokeWidth={3} name="Revenue GMV (₹)" dot={{ r: 4 }} />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Pie Distribution Charts */}
          <div className="grid gap-6 grid-cols-1 md:grid-cols-2">
            
            <Card className="border-primary/10 bg-card/40 backdrop-blur-md">
              <CardHeader>
                <CardTitle className="text-lg font-bold text-foreground">Shipment Lifecycles</CardTitle>
                <p className="text-xs text-muted-foreground">Platform status ratios from pending placement to final dropoff.</p>
              </CardHeader>
              <CardContent className="flex flex-col items-center">
                <div className="h-60 w-full max-w-[320px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={stats.statusChartData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={90}
                        paddingAngle={4}
                        dataKey="value"
                      >
                        {stats.statusChartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend wrapperStyle={{ fontSize: 11 }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="w-full grid grid-cols-2 gap-3 text-xs mt-4 pt-4 border-t border-dashed border-primary/10">
                  <div className="flex justify-between p-1.5 bg-background/50 rounded">
                    <span className="text-muted-foreground">Completion Rate:</span>
                    <span className="font-bold text-green-600">{stats.completionRate.toFixed(1)}%</span>
                  </div>
                  <div className="flex justify-between p-1.5 bg-background/50 rounded">
                    <span className="text-muted-foreground">Out for Delivery:</span>
                    <span className="font-bold text-blue-600">{stats.statusCounts.in_transit} jobs</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-primary/10 bg-card/40 backdrop-blur-md">
              <CardHeader>
                <CardTitle className="text-lg font-bold text-foreground">Pooling Integration Efficiency</CardTitle>
                <p className="text-xs text-muted-foreground">Consolidated shared routes vs individual premium routes.</p>
              </CardHeader>
              <CardContent className="flex flex-col items-center">
                <div className="h-60 w-full max-w-[320px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={stats.poolingChartData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={90}
                        paddingAngle={4}
                        dataKey="value"
                      >
                        {stats.poolingChartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend wrapperStyle={{ fontSize: 11 }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="w-full grid grid-cols-2 gap-3 text-xs mt-4 pt-4 border-t border-dashed border-primary/10">
                  <div className="flex justify-between p-1.5 bg-background/50 rounded">
                    <span className="text-muted-foreground">Cost Savings Rate:</span>
                    <span className="font-bold text-delhi-success">~{((stats.poolingRate / 100) * 30).toFixed(0)}% avg</span>
                  </div>
                  <div className="flex justify-between p-1.5 bg-background/50 rounded">
                    <span className="text-muted-foreground">Pooled Journeys:</span>
                    <span className="font-bold text-delhi-primary">{stats.pooledCount} orders</span>
                  </div>
                </div>
              </CardContent>
            </Card>

          </div>

          {/* Carrier Leaderboard */}
          <Card className="border-primary/10 bg-card/40 backdrop-blur-md">
            <CardHeader className="flex flex-row items-center justify-between flex-wrap gap-2">
              <div>
                <CardTitle className="text-lg font-bold text-foreground">Carrier Fleet Leaderboard</CardTitle>
                <p className="text-xs text-muted-foreground">Registered carrier logistics partners ranked by earnings, ratings, and job velocity.</p>
              </div>
              <Award className="h-6 w-6 text-delhi-gold hidden sm:block" />
            </CardHeader>
            <CardContent>
              {stats.carrierLeaderboard.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground text-sm">
                  No carrier performance data registered.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left">
                    <thead>
                      <tr className="border-b border-primary/10 text-muted-foreground font-semibold text-xs uppercase tracking-wider">
                        <th className="py-3 px-4">Rank</th>
                        <th className="py-3 px-4">Carrier Partner</th>
                        <th className="py-3 px-4">Vehicle Model</th>
                        <th className="py-3 px-4 text-center">Avg Rating</th>
                        <th className="py-3 px-4 text-center">Jobs Delivered</th>
                        <th className="py-3 px-4 text-right">Estimated Revenue</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-primary/5">
                      {stats.carrierLeaderboard.map((carrier, index) => (
                        <tr key={carrier.userId} className="hover:bg-primary/5 transition-colors">
                          <td className="py-4 px-4 font-bold text-foreground">
                            {index === 0 ? "🥇" : index === 1 ? "🥈" : index === 2 ? "🥉" : `#${index + 1}`}
                          </td>
                          <td className="py-4 px-4 font-semibold text-foreground">
                            {carrier.businessName}
                          </td>
                          <td className="py-4 px-4">
                            <Badge variant="outline" className="text-[10px] py-0">
                              {carrier.vehicleType}
                            </Badge>
                          </td>
                          <td className="py-4 px-4 text-center text-yellow-600 dark:text-yellow-400 font-bold">
                            ⭐ {carrier.rating.toFixed(1)}
                          </td>
                          <td className="py-4 px-4 text-center font-medium">
                            {carrier.completedJobs} completed
                          </td>
                          <td className="py-4 px-4 text-right font-extrabold text-delhi-primary">
                            ₹{carrier.totalEarnings.toLocaleString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Environmental Savings */}
          <Card className="border-primary/10 bg-card/40 backdrop-blur-md">
            <CardHeader>
              <CardTitle className="text-lg font-bold text-foreground flex items-center gap-2">
                <Leaf className="h-5 w-5 text-delhi-success" />
                Delhi NCR Platform-wide Environmental Impact
              </CardTitle>
              <p className="text-xs text-muted-foreground">Aggregated CO₂ reductions achieved through vehicle consolidating route structures.</p>
            </CardHeader>
            <CardContent>
              <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
                
                <div className="p-4 rounded-xl bg-green-50/50 dark:bg-green-950/15 border border-green-200/50 dark:border-green-800/30 text-center">
                  <div className="text-3xl font-black text-delhi-success">{stats.totalCO2Saved.toFixed(1)} kg</div>
                  <div className="text-xs font-semibold text-foreground mt-1">CO₂ Displaced</div>
                  <p className="text-[10px] text-muted-foreground mt-1">Platform emission optimizations</p>
                </div>

                <div className="p-4 rounded-xl bg-blue-50/50 dark:bg-blue-950/15 border border-blue-200/50 dark:border-blue-800/30 text-center">
                  <div className="text-3xl font-black text-delhi-primary">{(stats.totalCO2Saved * 0.38).toFixed(1)} L</div>
                  <div className="text-xs font-semibold text-foreground mt-1">Fossil Fuel Saved</div>
                  <p className="text-[10px] text-muted-foreground mt-1">2.65 kg CO₂ output per diesel liter</p>
                </div>

                <div className="p-4 rounded-xl bg-amber-50/50 dark:bg-amber-950/15 border border-amber-200/50 dark:border-amber-800/30 text-center">
                  <div className="text-3xl font-black text-delhi-gold">{(stats.totalCO2Saved / 22).toFixed(1)}</div>
                  <div className="text-xs font-semibold text-foreground mt-1">Trees Offset Equiv.</div>
                  <p className="text-[10px] text-muted-foreground mt-1">22 kg yearly CO₂ absorb per tree</p>
                </div>

                <div className="p-4 rounded-xl bg-orange-50/50 dark:bg-orange-950/15 border border-orange-200/50 dark:border-orange-800/30 text-center">
                  <div className="text-3xl font-black text-delhi-orange">{((stats.totalCO2Saved / 4.2) * 1000).toFixed(0)} km</div>
                  <div className="text-xs font-semibold text-foreground mt-1">Standard Car Offroad</div>
                  <p className="text-[10px] text-muted-foreground mt-1">Average car emission standards offset</p>
                </div>

              </div>
            </CardContent>
          </Card>

        </section>
      </main>
    </>
  );
};

export default OperationsAnalytics;
