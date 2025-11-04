import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Package, Users, MapPin, Clock, Truck } from 'lucide-react';
import EnhancedRouteOptimizer from './EnhancedRouteOptimizer';
import RouteMap from './RouteMap';

interface ShipmentData {
  id: string;
  origin: string;
  destination: string;
  origin_lat: number;
  origin_lng: number;
  destination_lat: number;
  destination_lng: number;
  priority?: 'high' | 'medium' | 'low';
  status: string;
  pooled?: boolean;
}

const ShipmentPoolingManager: React.FC = () => {
  const [shipments, setShipments] = useState<ShipmentData[]>([]);
  const [optimizationResult, setOptimizationResult] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();
  const { userId } = useAuth();

  useEffect(() => {
    if (!userId) return;
    loadShipments();
  }, [userId]);

  const loadShipments = async () => {
    try {
      const { data, error } = await supabase
        .from('shipments')
        .select(`
          id, origin, destination, 
          origin_lat, origin_lng, 
          destination_lat, destination_lng,
          status
        `)
        .eq('status', 'pending')
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw error;

      setShipments(data || []);
    } catch (error) {
      console.error('Error loading shipments:', error);
      toast({
        title: "Error",
        description: "Failed to load shipments",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Convert database shipments to optimizer format
  const convertToOptimizerFormat = (shipments: ShipmentData[]) => {
    return shipments
      .filter(s => s.origin_lat && s.origin_lng && s.destination_lat && s.destination_lng)
      .map(s => ({
        id: s.id,
        pickup: { lat: s.origin_lat, lng: s.origin_lng },
        drop: { lat: s.destination_lat, lng: s.destination_lng },
        weight: Math.floor(Math.random() * 50) + 10,
        priority: s.priority || 'medium' as const
      }));
  };

  const handleOptimizationComplete = async (result: any) => {
    // Store optimization result for map display
    setOptimizationResult(result);
    
    // Update shipments in database to mark them as pooled
    try {
      const shipmentIds = result.routes.flatMap((route: any) => 
        route.shipments.map((s: any) => s.id)
      );

      const { error } = await supabase
        .from('shipments')
        .update({ status: 'pooled' })
        .in('id', shipmentIds);

      if (error) throw error;

      toast({
        title: "Pooling Complete",
        description: `${shipmentIds.length} shipments have been optimally pooled and marked as pooled`
      });

      // Reload shipments to reflect changes
      await loadShipments();
    } catch (error) {
      console.error('Error updating pooled status:', error);
    }
  };

  const optimizerShipments = convertToOptimizerFormat(shipments);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-delhi-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Current Shipments Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5 text-delhi-primary" />
            Available Shipments
          </CardTitle>
          <CardDescription>
            {shipments.length} pending shipments ready for optimization
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
            <div className="text-center p-3 bg-delhi-secondary/10 rounded-lg">
              <Package className="h-6 w-6 mx-auto mb-2 text-delhi-primary" />
              <div className="text-2xl font-bold text-delhi-navy">{shipments.length}</div>
              <div className="text-sm text-muted-foreground">Total Shipments</div>
            </div>
            <div className="text-center p-3 bg-delhi-secondary/10 rounded-lg">
              <Users className="h-6 w-6 mx-auto mb-2 text-delhi-primary" />
              <div className="text-2xl font-bold text-delhi-navy">{shipments.filter(s => s.pooled).length}</div>
              <div className="text-sm text-muted-foreground">Optimized</div>
            </div>
            <div className="text-center p-3 bg-delhi-secondary/10 rounded-lg">
              <Truck className="h-6 w-6 mx-auto mb-2 text-delhi-primary" />
              <div className="text-2xl font-bold text-delhi-navy">{shipments.filter(s => !s.pooled).length}</div>
              <div className="text-sm text-muted-foreground">Pending</div>
            </div>
            <div className="text-center p-3 bg-delhi-secondary/10 rounded-lg">
              <Clock className="h-6 w-6 mx-auto mb-2 text-delhi-primary" />
              <div className="text-2xl font-bold text-delhi-navy">
                {shipments.filter(s => s.status === 'pending').length}
              </div>
              <div className="text-sm text-muted-foreground">Ready to Pool</div>
            </div>
          </div>

          <div className="space-y-2 max-h-60 overflow-y-auto">
            {shipments.map((shipment) => (
              <div key={shipment.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-md">
                <div className="flex items-center gap-3">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <div className="text-sm font-medium">{shipment.origin} → {shipment.destination}</div>
                    <div className="text-xs text-muted-foreground">ID: {shipment.id}</div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {shipment.priority && (
                    <Badge variant="outline" className="text-xs">
                      {shipment.priority}
                    </Badge>
                  )}
                  {shipment.pooled && (
                    <Badge variant="secondary" className="text-xs">
                      Optimized
                    </Badge>
                  )}
                  <Badge variant="outline" className="text-xs">
                    {shipment.status}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Enhanced Route Optimizer */}
      {optimizerShipments.length > 0 && (
        <EnhancedRouteOptimizer 
          shipments={optimizerShipments}
          onOptimizationComplete={handleOptimizationComplete}
        />
      )}

      {/* Route Map Visualization */}
      {optimizationResult && (
        <RouteMap 
          routes={optimizationResult.routes}
          onExportData={(data) => {
            console.log('Route data exported:', data);
            toast({
              title: "Data Exported",
              description: "Route data has been exported as CSV and JSON files"
            });
          }}
        />
      )}
    </div>
  );
};

export default ShipmentPoolingManager;