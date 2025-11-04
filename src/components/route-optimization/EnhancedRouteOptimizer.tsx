import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Truck, Route, Clock, MapPin, TrendingUp, Users, Package } from 'lucide-react';

interface LatLng {
  lat: number;
  lng: number;
}

interface Shipment {
  id: string;
  pickup: LatLng;
  drop: LatLng;
  weight?: number;
  volume?: number;
  priority?: 'high' | 'medium' | 'low';
}

interface OptimizedRoute {
  groupId: string;
  shipments: Shipment[];
  routeCoordinates: LatLng[];
  totalDistance: number;
  totalTime: number;
  efficiency: number;
}

interface OptimizationResult {
  success: boolean;
  summary: {
    totalShipments: number;
    totalClusters: number;
    totalDistance: number;
    totalTimeMinutes: number;
    averageShipmentsPerCluster: number;
    efficiencyScore: number;
    estimatedSavings: number;
  };
  routes: OptimizedRoute[];
  metadata: {
    generatedAt: string;
    algorithm: string;
    trafficConsidered: boolean;
    numClusters: number;
  };
}

interface EnhancedRouteOptimizerProps {
  shipments: Shipment[];
  onOptimizationComplete?: (result: OptimizationResult) => void;
}

const EnhancedRouteOptimizer: React.FC<EnhancedRouteOptimizerProps> = ({ 
  shipments, 
  onOptimizationComplete 
}) => {
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [result, setResult] = useState<OptimizationResult | null>(null);
  const { toast } = useToast();

  const optimizeRoutes = async () => {
    if (shipments.length === 0) {
      toast({
        title: "No shipments to optimize",
        description: "Please add some shipments first.",
        variant: "destructive"
      });
      return;
    }

    setIsOptimizing(true);
    
    try {
      const { data, error } = await supabase.functions.invoke('enhanced-route-optimization', {
        body: {
          shipments,
          options: {
            maxClusters: Math.min(5, Math.ceil(shipments.length / 2))
          }
        }
      });

      if (error) throw error;

      const optimizationResult: OptimizationResult = data;
      setResult(optimizationResult);
      onOptimizationComplete?.(optimizationResult);
      
      toast({
        title: "Routes optimized successfully!",
        description: `Generated ${optimizationResult.summary.totalClusters} optimized routes with ${optimizationResult.summary.estimatedSavings}% efficiency gain.`
      });

    } catch (error) {
      console.error('Route optimization error:', error);
      toast({
        title: "Optimization failed",
        description: "Failed to optimize routes. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsOptimizing(false);
    }
  };

  const getPriorityColor = (priority?: string) => {
    switch (priority) {
      case 'high': return 'bg-red-500';
      case 'medium': return 'bg-yellow-500';
      case 'low': return 'bg-green-500';
      default: return 'bg-gray-500';
    }
  };

  const formatTime = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = Math.floor(minutes % 60);
    return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
  };

  return (
    <div className="space-y-6">
      {/* Optimization Controls */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Route className="h-5 w-5 text-delhi-primary" />
            Enhanced Route Optimization
          </CardTitle>
          <CardDescription>
            AI-powered clustering and route optimization using K-Means and traffic analysis
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">
                {shipments.length} shipments ready for optimization
              </p>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Package className="h-3 w-3" />
                Total weight: {shipments.reduce((sum, s) => sum + (s.weight || 0), 0)} kg
              </div>
            </div>
            <Button 
              onClick={optimizeRoutes} 
              disabled={isOptimizing || shipments.length === 0}
              className="bg-delhi-primary hover:bg-delhi-primary/90"
            >
              {isOptimizing ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                  Optimizing...
                </>
              ) : (
                <>
                  <TrendingUp className="h-4 w-4 mr-2" />
                  Optimize Routes
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Optimization Results */}
      {result && (
        <div className="space-y-4">
          {/* Summary Statistics */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Optimization Summary</CardTitle>
              <CardDescription>
                Generated on {new Date(result.metadata.generatedAt).toLocaleString()}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center p-3 bg-delhi-secondary/10 rounded-lg">
                  <Users className="h-6 w-6 mx-auto mb-2 text-delhi-primary" />
                  <div className="text-2xl font-bold text-delhi-navy">{result.summary.totalClusters}</div>
                  <div className="text-sm text-muted-foreground">Route Groups</div>
                </div>
                <div className="text-center p-3 bg-delhi-secondary/10 rounded-lg">
                  <Package className="h-6 w-6 mx-auto mb-2 text-delhi-primary" />
                  <div className="text-2xl font-bold text-delhi-navy">{result.summary.totalShipments}</div>
                  <div className="text-sm text-muted-foreground">Total Shipments</div>
                </div>
                <div className="text-center p-3 bg-delhi-secondary/10 rounded-lg">
                  <Route className="h-6 w-6 mx-auto mb-2 text-delhi-primary" />
                  <div className="text-2xl font-bold text-delhi-navy">{result.summary.totalDistance} km</div>
                  <div className="text-sm text-muted-foreground">Total Distance</div>
                </div>
                <div className="text-center p-3 bg-delhi-secondary/10 rounded-lg">
                  <TrendingUp className="h-6 w-6 mx-auto mb-2 text-delhi-primary" />
                  <div className="text-2xl font-bold text-delhi-navy">{result.summary.estimatedSavings}%</div>
                  <div className="text-sm text-muted-foreground">Efficiency Gain</div>
                </div>
              </div>
              
              <div className="mt-6 space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Overall Efficiency</span>
                  <span className="text-sm text-muted-foreground">{result.summary.efficiencyScore} shipments/hour</span>
                </div>
                <Progress value={Math.min(100, result.summary.efficiencyScore * 10)} className="h-2" />
              </div>
            </CardContent>
          </Card>

          {/* Optimized Routes */}
          <div className="grid gap-4">
            {result.routes.map((route, index) => (
              <Card key={route.groupId}>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between text-base">
                    <div className="flex items-center gap-2">
                      <Truck className="h-4 w-4 text-delhi-primary" />
                      Route Group {index + 1}
                    </div>
                    <Badge variant="secondary">{route.shipments.length} shipments</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                    <div className="flex items-center gap-2">
                      <Route className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">{route.totalDistance} km</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">{formatTime(route.totalTime)}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <TrendingUp className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">{route.efficiency} eff/hr</span>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <h4 className="text-sm font-medium mb-2">Shipments in Route:</h4>
                    <div className="grid gap-2">
                      {route.shipments.map((shipment) => (
                        <div key={shipment.id} className="flex items-center justify-between p-2 bg-muted/50 rounded-md">
                          <div className="flex items-center gap-2">
                            <MapPin className="h-3 w-3 text-muted-foreground" />
                            <span className="text-xs font-mono">{shipment.id}</span>
                            {shipment.priority && (
                              <div className={`w-2 h-2 rounded-full ${getPriorityColor(shipment.priority)}`} />
                            )}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {shipment.weight && `${shipment.weight}kg`}
                            {shipment.volume && ` • ${shipment.volume}m³`}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default EnhancedRouteOptimizer;