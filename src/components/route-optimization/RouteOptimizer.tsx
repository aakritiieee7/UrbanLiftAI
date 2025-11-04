import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { MapPin, Route, Truck, Clock, Calculator, TrendingUp } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface LatLng {
  lat: number;
  lng: number;
}

interface Shipment {
  id: string;
  pickup: LatLng;
  drop: LatLng;
  weight?: number;
  priority?: 'high' | 'medium' | 'low';
}

interface OptimizedPool {
  id: string;
  shipments: Shipment[];
  totalWeight: number;
  pickupCentroid: LatLng;
  dropCentroid: LatLng;
  estimatedDistance: number;
  estimatedTime: number;
  optimizedRoute: LatLng[];
  efficiency: number;
}

interface OptimizationResult {
  success: boolean;
  summary: {
    totalShipments: number;
    totalPools: number;
    totalDistance: number;
    totalTimeMinutes: number;
    averageShipmentsPerPool: number;
    efficiencyScore: number;
  };
  pools: OptimizedPool[];
  metadata: {
    generatedAt: string;
    algorithm: string;
    maxPoolSize: number;
  };
}

export const RouteOptimizer: React.FC = () => {
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [optimizationResult, setOptimizationResult] = useState<OptimizationResult | null>(null);
  const [sampleShipments, setSampleShipments] = useState<Shipment[]>([]);
  const { toast } = useToast();

  // Generate sample shipments for Delhi area
  const generateSampleShipments = () => {
    const delhiBounds = {
      minLat: 28.4041,
      maxLat: 28.8836,
      minLng: 76.8388,
      maxLng: 77.3462
    };

    const shipments: Shipment[] = [];
    for (let i = 0; i < 15; i++) {
      const startLat = delhiBounds.minLat + Math.random() * (delhiBounds.maxLat - delhiBounds.minLat);
      const startLng = delhiBounds.minLng + Math.random() * (delhiBounds.maxLng - delhiBounds.minLng);
      const endLat = delhiBounds.minLat + Math.random() * (delhiBounds.maxLat - delhiBounds.minLat);
      const endLng = delhiBounds.minLng + Math.random() * (delhiBounds.maxLng - delhiBounds.minLng);

      shipments.push({
        id: `DEMO_${String(i + 1).padStart(3, '0')}`,
        pickup: { lat: Number(startLat.toFixed(6)), lng: Number(startLng.toFixed(6)) },
        drop: { lat: Number(endLat.toFixed(6)), lng: Number(endLng.toFixed(6)) },
        weight: Math.round(Math.random() * 500 + 10),
        priority: ['high', 'medium', 'low'][Math.floor(Math.random() * 3)] as 'high' | 'medium' | 'low'
      });
    }

    setSampleShipments(shipments);
    toast({
      title: "Sample Shipments Generated",
      description: `Generated ${shipments.length} sample shipments for Delhi area`,
    });
  };

  const optimizeRoutes = async () => {
    if (sampleShipments.length === 0) {
      toast({
        title: "No Shipments",
        description: "Please generate sample shipments first",
        variant: "destructive"
      });
      return;
    }

    setIsOptimizing(true);
    try {
      const { data, error } = await supabase.functions.invoke('route-optimization', {
        body: {
          shipments: sampleShipments,
          options: {
            maxPoolSize: 4
          }
        }
      });

      if (error) throw error;

      if (data.success) {
        setOptimizationResult(data);
        toast({
          title: "Routes Optimized",
          description: `Created ${data.summary.totalPools} optimized pools from ${data.summary.totalShipments} shipments`,
        });
      } else {
        throw new Error(data.error || 'Optimization failed');
      }
    } catch (error) {
      console.error('Route optimization error:', error);
      toast({
        title: "Optimization Failed",
        description: error instanceof Error ? error.message : "Failed to optimize routes",
        variant: "destructive"
      });
    } finally {
      setIsOptimizing(false);
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'low': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold text-primary">AI Route Optimizer</h1>
        <p className="text-muted-foreground">
          Advanced shipment pooling and route optimization using clustering algorithms
        </p>
      </div>

      {/* Controls */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calculator className="h-5 w-5" />
            Optimization Controls
          </CardTitle>
          <CardDescription>
            Generate sample shipments and optimize routes using AI algorithms
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <Button 
              onClick={generateSampleShipments}
              variant="outline"
              className="flex items-center gap-2"
            >
              <MapPin className="h-4 w-4" />
              Generate Sample Shipments
            </Button>
            <Button 
              onClick={optimizeRoutes}
              disabled={isOptimizing || sampleShipments.length === 0}
              className="flex items-center gap-2"
            >
              {isOptimizing ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Optimizing...
                </>
              ) : (
                <>
                  <Route className="h-4 w-4" />
                  Optimize Routes
                </>
              )}
            </Button>
          </div>
          
          {sampleShipments.length > 0 && (
            <div className="mt-4 p-4 bg-muted rounded-lg">
              <p className="text-sm text-muted-foreground">
                <strong>{sampleShipments.length}</strong> shipments ready for optimization
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Results */}
      {optimizationResult && (
        <Tabs defaultValue="summary" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="summary">Summary</TabsTrigger>
            <TabsTrigger value="pools">Optimized Pools</TabsTrigger>
            <TabsTrigger value="shipments">All Shipments</TabsTrigger>
          </TabsList>

          <TabsContent value="summary" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Optimization Summary
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                  <div className="text-center p-4 bg-muted rounded-lg">
                    <div className="text-2xl font-bold text-primary">
                      {optimizationResult.summary.totalShipments}
                    </div>
                    <div className="text-sm text-muted-foreground">Total Shipments</div>
                  </div>
                  
                  <div className="text-center p-4 bg-muted rounded-lg">
                    <div className="text-2xl font-bold text-blue-600">
                      {optimizationResult.summary.totalPools}
                    </div>
                    <div className="text-sm text-muted-foreground">Optimized Pools</div>
                  </div>

                  <div className="text-center p-4 bg-muted rounded-lg">
                    <div className="text-2xl font-bold text-green-600">
                      {optimizationResult.summary.totalDistance} km
                    </div>
                    <div className="text-sm text-muted-foreground">Total Distance</div>
                  </div>

                  <div className="text-center p-4 bg-muted rounded-lg">
                    <div className="text-2xl font-bold text-orange-600">
                      {Math.round(optimizationResult.summary.totalTimeMinutes / 60 * 10) / 10} h
                    </div>
                    <div className="text-sm text-muted-foreground">Total Time</div>
                  </div>

                  <div className="text-center p-4 bg-muted rounded-lg">
                    <div className="text-2xl font-bold text-purple-600">
                      {optimizationResult.summary.averageShipmentsPerPool}
                    </div>
                    <div className="text-sm text-muted-foreground">Avg per Pool</div>
                  </div>

                  <div className="text-center p-4 bg-muted rounded-lg">
                    <div className="text-2xl font-bold text-red-600">
                      {optimizationResult.summary.efficiencyScore}
                    </div>
                    <div className="text-sm text-muted-foreground">Efficiency Score</div>
                  </div>
                </div>

                <div className="mt-6 p-4 bg-green-50 rounded-lg border border-green-200">
                  <h4 className="font-semibold text-green-800 mb-2">Optimization Results</h4>
                  <p className="text-sm text-green-700">
                    Successfully optimized {optimizationResult.summary.totalShipments} shipments into {optimizationResult.summary.totalPools} efficient pools.
                    Total estimated savings: ~{Math.round((1 - optimizationResult.summary.totalPools / optimizationResult.summary.totalShipments) * 100)}% fewer routes needed.
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="pools" className="space-y-4">
            <div className="grid gap-4">
              {optimizationResult.pools.map((pool, index) => (
                <Card key={pool.id}>
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      <span className="flex items-center gap-2">
                        <Truck className="h-5 w-5" />
                        Pool {index + 1} ({pool.id})
                      </span>
                      <Badge variant="secondary">
                        {pool.shipments.length} shipments
                      </Badge>
                    </CardTitle>
                    <CardDescription>
                      Efficiency Score: {pool.efficiency} shipments/hour
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                      <div className="text-center p-3 bg-muted rounded">
                        <div className="font-semibold">{pool.estimatedDistance} km</div>
                        <div className="text-sm text-muted-foreground">Distance</div>
                      </div>
                      <div className="text-center p-3 bg-muted rounded">
                        <div className="font-semibold">{pool.estimatedTime} min</div>
                        <div className="text-sm text-muted-foreground">Time</div>
                      </div>
                      <div className="text-center p-3 bg-muted rounded">
                        <div className="font-semibold">{pool.totalWeight} kg</div>
                        <div className="text-sm text-muted-foreground">Weight</div>
                      </div>
                      <div className="text-center p-3 bg-muted rounded">
                        <div className="font-semibold">{pool.optimizedRoute.length}</div>
                        <div className="text-sm text-muted-foreground">Route Points</div>
                      </div>
                    </div>

                    <div>
                      <h5 className="font-semibold mb-2">Shipments in Pool:</h5>
                      <div className="grid gap-2">
                        {pool.shipments.map((shipment) => (
                          <div key={shipment.id} className="flex items-center justify-between p-2 bg-muted rounded">
                            <span className="font-mono text-sm">{shipment.id}</span>
                            <div className="flex items-center gap-2">
                              <Badge className={getPriorityColor(shipment.priority || 'medium')}>
                                {shipment.priority}
                              </Badge>
                              <span className="text-sm text-muted-foreground">
                                {shipment.weight}kg
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="shipments" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>All Shipments</CardTitle>
                <CardDescription>
                  Complete list of {sampleShipments.length} shipments used in optimization
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-2 max-h-96 overflow-y-auto">
                  {sampleShipments.map((shipment) => (
                    <div key={shipment.id} className="flex items-center justify-between p-3 border rounded">
                      <div>
                        <div className="font-mono text-sm font-semibold">{shipment.id}</div>
                        <div className="text-xs text-muted-foreground">
                          From: {shipment.pickup.lat.toFixed(4)}, {shipment.pickup.lng.toFixed(4)} → 
                          To: {shipment.drop.lat.toFixed(4)}, {shipment.drop.lng.toFixed(4)}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge className={getPriorityColor(shipment.priority || 'medium')}>
                          {shipment.priority}
                        </Badge>
                        <span className="text-sm">{shipment.weight}kg</span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
};