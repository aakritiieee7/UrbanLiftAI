import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from "recharts";
import { TrendingDown, TrendingUp, DollarSign, Package, Clock, Award } from "lucide-react";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";

interface AnalyticsCardProps {
  shipments: any[];
}

const AnalyticsCard = ({ shipments }: AnalyticsCardProps) => {
  const [timeRange, setTimeRange] = useState("7d");
  const [savings, setSavings] = useState({
    cost: 0,
    fuel: 0,
    co2: 0,
    efficiency: 0
  });

  // Sample analytics data
  const costSavingsData = [
    { month: "Jan", traditional: 45000, pooled: 32000, savings: 13000 },
    { month: "Feb", traditional: 52000, pooled: 38000, savings: 14000 },
    { month: "Mar", traditional: 48000, pooled: 34000, savings: 14000 },
    { month: "Apr", traditional: 55000, pooled: 40000, savings: 15000 },
    { month: "May", traditional: 60000, pooled: 42000, savings: 18000 },
    { month: "Jun", traditional: 58000, pooled: 41000, savings: 17000 }
  ];

  const deliveryData = [
    { day: "Mon", delivered: 12, pending: 3 },
    { day: "Tue", delivered: 15, pending: 2 },
    { day: "Wed", delivered: 18, pending: 4 },
    { day: "Thu", delivered: 14, pending: 1 },
    { day: "Fri", delivered: 20, pending: 2 },
    { day: "Sat", delivered: 16, pending: 3 },
    { day: "Sun", delivered: 8, pending: 1 }
  ];

  const routeEfficiencyData = [
    { name: "Pooled Routes", value: 65, color: "hsl(var(--delhi-success))" },
    { name: "Direct Routes", value: 35, color: "hsl(var(--delhi-orange))" }
  ];

  useEffect(() => {
    // Calculate savings based on shipments
    const pooledShipments = shipments.filter(s => s.pooled);
    const totalShipments = shipments.length;
    
    if (totalShipments > 0) {
      const poolingRate = pooledShipments.length / totalShipments;
      setSavings({
        cost: Math.round(poolingRate * 25000), // Average savings per month
        fuel: Math.round(poolingRate * 450), // Liters saved
        co2: Math.round(poolingRate * 1200), // KG CO2 saved
        efficiency: Math.round(poolingRate * 100) // Efficiency percentage
      });
    }
  }, [shipments]);

  const chartConfig = {
    delivered: {
      label: "Delivered",
      color: "hsl(var(--delhi-success))",
    },
    pending: {
      label: "Pending",
      color: "hsl(var(--delhi-orange))",
    },
    traditional: {
      label: "Traditional Cost",
      color: "hsl(var(--muted-foreground))",
    },
    pooled: {
      label: "Pooled Cost",
      color: "hsl(var(--delhi-primary))",
    },
    savings: {
      label: "Savings",
      color: "hsl(var(--delhi-success))",
    },
  };

  return (
    <Card className="border-delhi-primary/20">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-delhi-success" />
          Cost Savings Analytics
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="savings" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="savings">Cost Savings</TabsTrigger>
            <TabsTrigger value="delivery">Delivery Metrics</TabsTrigger>
            <TabsTrigger value="efficiency">Route Efficiency</TabsTrigger>
          </TabsList>

          <TabsContent value="savings" className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-gradient-to-br from-delhi-success/10 to-delhi-success/5 p-4 rounded-lg border border-delhi-success/20">
                <div className="flex items-center gap-2">
                  <DollarSign className="h-4 w-4 text-delhi-success" />
                  <span className="text-sm text-muted-foreground">Cost Saved</span>
                </div>
                <div className="text-2xl font-bold text-delhi-success">₹{savings.cost.toLocaleString()}</div>
                <div className="text-xs text-muted-foreground">This month</div>
              </div>

              <div className="bg-gradient-to-br from-delhi-primary/10 to-delhi-primary/5 p-4 rounded-lg border border-delhi-primary/20">
                <div className="flex items-center gap-2">
                  <Package className="h-4 w-4 text-delhi-primary" />
                  <span className="text-sm text-muted-foreground">Fuel Saved</span>
                </div>
                <div className="text-2xl font-bold text-delhi-primary">{savings.fuel}L</div>
                <div className="text-xs text-muted-foreground">This month</div>
              </div>

              <div className="bg-gradient-to-br from-delhi-gold/10 to-delhi-gold/5 p-4 rounded-lg border border-delhi-gold/20">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-delhi-gold" />
                  <span className="text-sm text-muted-foreground">CO₂ Saved</span>
                </div>
                <div className="text-2xl font-bold text-delhi-gold">{savings.co2}kg</div>
                <div className="text-xs text-muted-foreground">This month</div>
              </div>

              <div className="bg-gradient-to-br from-delhi-orange/10 to-delhi-orange/5 p-4 rounded-lg border border-delhi-orange/20">
                <div className="flex items-center gap-2">
                  <Award className="h-4 w-4 text-delhi-orange" />
                  <span className="text-sm text-muted-foreground">Efficiency</span>
                </div>
                <div className="text-2xl font-bold text-delhi-orange">{savings.efficiency}%</div>
                <div className="text-xs text-muted-foreground">Route optimization</div>
              </div>
            </div>

            <div className="h-80">
              <h4 className="text-sm font-medium mb-4">Monthly Cost Comparison</h4>
              <ChartContainer config={chartConfig}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={costSavingsData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Bar dataKey="traditional" fill="var(--color-traditional)" />
                    <Bar dataKey="pooled" fill="var(--color-pooled)" />
                  </BarChart>
                </ResponsiveContainer>
              </ChartContainer>
            </div>
          </TabsContent>

          <TabsContent value="delivery" className="space-y-6">
            <div className="h-80">
              <h4 className="text-sm font-medium mb-4">Weekly Delivery Performance</h4>
              <ChartContainer config={chartConfig}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={deliveryData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="day" />
                    <YAxis />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Line type="monotone" dataKey="delivered" stroke="var(--color-delivered)" strokeWidth={3} />
                    <Line type="monotone" dataKey="pending" stroke="var(--color-pending)" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </ChartContainer>
            </div>
          </TabsContent>

          <TabsContent value="efficiency" className="space-y-6">
            <div className="h-80">
              <h4 className="text-sm font-medium mb-4">Route Distribution</h4>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={routeEfficiencyData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {routeEfficiencyData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default AnalyticsCard;