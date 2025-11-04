import { Helmet } from "react-helmet-async";
import Layout from "@/components/Layout";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { clusterShipments, type Shipment as AlgoShipment } from "@/lib/matching";
import { useAuth } from "@/contexts/AuthContext";
import { Package, Users, Clock, MapPin } from "lucide-react";

const ShipperPooling = () => {
  const { toast } = useToast();
  const { userId } = useAuth();
  const [shipments, setShipments] = useState<any[]>([]);

  useEffect(() => {
    if (!userId) return;
    
    (async () => {
      const { data, error } = await supabase
        .from('shipments')
        .select('id, origin, destination, pickup_time, dropoff_time, status, pooled, origin_lat, origin_lng, destination_lat, destination_lng, shipper_id')
        .order('created_at', { ascending: false })
        .limit(100);
      
      if (error) {
        toast({ title: 'Error', description: error.message });
        return;
      }
      
      setShipments(data ?? []);
    })();
  }, [userId]); // Removed toast from deps to prevent infinite loop

  const userPools = useMemo(() => {
    if (!userId || shipments.length === 0) return [];
    
    const algos: AlgoShipment[] = shipments
      .map((r) => {
        // Use the actual lat/lng coordinates instead of parsing text
        if (!r.origin_lat || !r.origin_lng || !r.destination_lat || !r.destination_lng) return null as any;
        const po = { lat: Number(r.origin_lat), lng: Number(r.origin_lng) };
        const pd = { lat: Number(r.destination_lat), lng: Number(r.destination_lng) };
        return { 
          id: r.id, 
          pickup: po, 
          drop: pd, 
          readyAt: r.pickup_time ?? undefined, 
          dueBy: r.dropoff_time ?? undefined,
          shipper_id: r.shipper_id 
        };
      })
      .filter(Boolean);
    
    try {
      const allPools = clusterShipments(algos);
      
      // Filter pools to only show those containing the current user's shipments
      const userRelevantPools = allPools.filter(pool => 
        pool.shipments.some(shipment => {
          const fullShipment = shipments.find(s => s.id === shipment.id);
          return fullShipment?.shipper_id === userId;
        })
      );
      
      return userRelevantPools;
    } catch (e) {
      console.error('Clustering error:', e);
      return [];
    }
  }, [shipments, userId]);

  const userShipmentCount = shipments.filter(s => s.shipper_id === userId).length;

  return (
    <>
      <Helmet>
        <title>AI Pooling | UrbanLift.AI</title>
        <meta name="description" content="View AI-suggested pooled shipments containing your deliveries." />
        <link rel="canonical" href="/shipper/pooling" />
      </Helmet>
      <Layout>
        <main className="min-h-screen bg-background">
          <div className="container mx-auto px-4 py-8 space-y-8">
            {/* Hero Section */}
            <section className="text-center space-y-4">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-delhi-primary/10 border border-delhi-primary/20 text-sm font-medium text-delhi-primary mb-4">
                <Package className="w-4 h-4" />
                AI-Powered Pooling
              </div>
              <h1 className="text-4xl font-bold text-delhi-navy">Your Shipment Pools</h1>
              <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                AI-optimized pools containing your shipments for cost-effective and efficient delivery.
              </p>
            </section>

            {/* Stats */}
            <div className="grid gap-6 md:grid-cols-3">
              <Card className="text-center p-6">
                <div className="flex items-center justify-center mb-3">
                  <Package className="h-8 w-8 text-delhi-primary" />
                </div>
                <h3 className="text-2xl font-bold text-delhi-navy">{userShipmentCount}</h3>
                <p className="text-muted-foreground">Your Shipments</p>
              </Card>
              <Card className="text-center p-6">
                <div className="flex items-center justify-center mb-3">
                  <Users className="h-8 w-8 text-delhi-success" />
                </div>
                <h3 className="text-2xl font-bold text-delhi-navy">{userPools.length}</h3>
                <p className="text-muted-foreground">Available Pools</p>
              </Card>
              <Card className="text-center p-6">
                <div className="flex items-center justify-center mb-3">
                  <Clock className="h-8 w-8 text-delhi-orange" />
                </div>
                <h3 className="text-2xl font-bold text-delhi-navy">
                  {userPools.reduce((acc, pool) => acc + pool.shipments.length, 0)}
                </h3>
                <p className="text-muted-foreground">Total Pooled</p>
              </Card>
            </div>

            {/* Pools */}
            <section className="space-y-6">
              {userPools.length === 0 ? (
                <Card className="p-12 text-center">
                  <Package className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-xl font-semibold mb-2">No Pools Found</h3>
                  <p className="text-muted-foreground mb-6">
                    {userShipmentCount === 0 
                      ? "Create your first shipment to see AI-powered pooling opportunities."
                      : "Your shipments don't have compatible pools yet. Create more shipments with similar routes and timing."
                    }
                  </p>
                </Card>
              ) : (
                userPools.map((pool, idx) => (
                  <Card key={idx} className="hover:shadow-lg transition-all duration-300">
                    <CardHeader className="pb-4">
                      <div className="flex items-center justify-between">
                        <CardTitle className="flex items-center gap-3">
                          <div className="p-2 rounded-lg bg-delhi-primary/10">
                            <Users className="h-5 w-5 text-delhi-primary" />
                          </div>
                          Pool #{idx + 1}
                        </CardTitle>
                        <Badge variant="secondary" className="text-sm">
                          {pool.shipments.length} shipments
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Optimized route with {pool.shipments.filter(s => {
                          const fullShipment = shipments.find(ship => ship.id === s.id);
                          return fullShipment?.shipper_id === userId;
                        }).length} of your shipments
                      </p>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {pool.shipments.map((sh) => {
                        const s = shipments.find(x => x.id === sh.id) ?? { 
                          id: sh.id, 
                          origin: '', 
                          destination: '', 
                          status: '', 
                          pooled: false,
                          shipper_id: null 
                        };
                        const isUserShipment = s.shipper_id === userId;
                        
                        return (
                          <div 
                            key={sh.id} 
                            className={`flex items-center justify-between gap-4 p-4 rounded-lg border ${
                              isUserShipment 
                                ? 'border-delhi-primary/30 bg-delhi-primary/5' 
                                : 'border-border bg-muted/30'
                            }`}
                          >
                            <div className="flex items-center gap-3 min-w-0 flex-1">
                              <div className={`p-2 rounded-lg ${
                                isUserShipment 
                                  ? 'bg-delhi-primary/20' 
                                  : 'bg-muted'
                              }`}>
                                <MapPin className={`h-4 w-4 ${
                                  isUserShipment 
                                    ? 'text-delhi-primary' 
                                    : 'text-muted-foreground'
                                }`} />
                              </div>
                              <div className="min-w-0 flex-1">
                                <div className="font-medium truncate text-sm" title={`${s.origin} → ${s.destination}`}>
                                  {s.origin} → {s.destination}
                                </div>
                                <div className="text-xs text-muted-foreground flex items-center gap-2">
                                  <span>{s.status}</span>
                                  {s.pooled && <span>• pooled</span>}
                                  {isUserShipment && (
                                    <Badge variant="outline" className="text-xs">
                                      Your shipment
                                    </Badge>
                                  )}
                                </div>
                              </div>
                            </div>
                            <Badge variant="outline" className="text-xs">
                              #{String(sh.id).slice(0,8)}
                            </Badge>
                          </div>
                        );
                      })}
                    </CardContent>
                  </Card>
                ))
              )}
            </section>
          </div>
        </main>
      </Layout>
    </>
  );
};

export default ShipperPooling;