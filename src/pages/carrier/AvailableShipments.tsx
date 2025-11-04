import { Helmet } from "react-helmet-async";
import Navbar from "@/components/Navbar";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { MapPin, Package, Clock } from "lucide-react";

interface Shipment {
  id: string;
  origin: string;
  destination: string;
  origin_address?: string;
  destination_address?: string;
  capacity_kg?: number;
  pickup_time?: string;
  dropoff_time?: string;
  created_at: string;
  status: string;
}

const AvailableShipments = () => {
  const { userId } = useAuth();
  const { toast } = useToast();
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [loading, setLoading] = useState(false);

  const loadAvailableShipments = async () => {
    const { data } = await supabase
      .from("shipments")
      .select("id, origin, destination, origin_address, destination_address, capacity_kg, pickup_time, dropoff_time, created_at, status")
      .is("carrier_id", null)
      .eq("status", "pending")
      .order("created_at", { ascending: false })
      .limit(20);
    
    setShipments(data ?? []);
  };

  useEffect(() => {
    loadAvailableShipments();
    
    // Set up real-time updates for new available shipments
    const channel = supabase
      .channel("available-shipments")
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'shipments',
        filter: 'carrier_id=is.null'
      }, () => {
        loadAvailableShipments();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const claimShipment = async (shipmentId: string) => {
    if (!userId) return;
    
    setLoading(true);
    
    console.log("Claiming shipment:", shipmentId, "for carrier:", userId);
    
    // First check if shipment exists and is still available
    const { data: existingShipment, error: checkError } = await supabase
      .from("shipments")
      .select("id, carrier_id, status")
      .eq("id", shipmentId)
      .single();
    
    console.log("Existing shipment check:", { existingShipment, checkError });

    if (checkError || !existingShipment) {
      toast({ 
        title: "Error", 
        description: "Shipment not found." 
      });
      setLoading(false);
      return;
    }

    if (existingShipment.carrier_id) {
      toast({ 
        title: "Error", 
        description: "Shipment has already been assigned to another carrier." 
      });
      setLoading(false);
      loadAvailableShipments();
      return;
    }
    
    const { data, error } = await supabase
      .from("shipments")
      .update({ 
        carrier_id: userId,
        status: "assigned"
      })
      .eq("id", shipmentId)
      .is("carrier_id", null) // Only claim if still unassigned
      .select(); // Return updated data to verify
    
    console.log("Claim result:", { data, error, userId, shipmentId });

    if (error) {
      console.error("Database error:", error);
      toast({ 
        title: "Error", 
        description: `Failed to claim shipment: ${error.message}` 
      });
    } else if (!data || data.length === 0) {
      toast({ 
        title: "Error", 
        description: "Shipment may have been assigned to another carrier." 
      });
    } else {
      console.log("Successfully assigned shipment:", data[0]);
      toast({ 
        title: "Success", 
        description: "Shipment claimed! Check your Transit section." 
      });
      // Award points for claiming a shipment
      try {
        await supabase.rpc("award_points", { _user_id: userId, _points: 3, _source: "shipment_claimed" });
      } catch (pointsError) {
        console.log("Points award failed (non-critical):", pointsError);
      }
    }
    
    setLoading(false);
    loadAvailableShipments();
  };

  return (
    <>
      <Helmet>
        <title>Available Shipments | UrbanLift.AI</title>
        <meta name="description" content="View and claim available shipments for delivery as a carrier." />
        <link rel="canonical" href="/carrier/available" />
      </Helmet>
      <Navbar />
      <main className="container mx-auto px-4 py-8">
        <section className="mb-6">
          <h1 className="text-3xl font-semibold">Available Shipments</h1>
          <p className="text-muted-foreground">Claim shipments for delivery and earn points.</p>
        </section>

        <div className="grid gap-4">
          {shipments.length === 0 ? (
            <Card>
              <CardContent className="text-center py-8">
                <Package className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">No Available Shipments</h3>
                <p className="text-muted-foreground">
                  All shipments have been automatically assigned. Check back later for new opportunities.
                </p>
              </CardContent>
            </Card>
          ) : (
            shipments.map((shipment) => (
              <Card key={shipment.id} className="border-l-4 border-l-primary/50">
                <CardHeader className="pb-3">
                  <div className="flex justify-between items-start">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Package className="h-5 w-5" />
                      Shipment #{shipment.id.slice(-8)}
                    </CardTitle>
                    <Badge variant="secondary">Available</Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-3">
                    <div className="flex items-start gap-2">
                      <MapPin className="h-4 w-4 text-green-600 mt-1 flex-shrink-0" />
                      <div>
                        <div className="font-medium text-sm">Pickup</div>
                        <div className="text-sm text-muted-foreground">
                          {shipment.origin_address || shipment.origin}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-start gap-2">
                      <MapPin className="h-4 w-4 text-red-600 mt-1 flex-shrink-0" />
                      <div>
                        <div className="font-medium text-sm">Destination</div>
                        <div className="text-sm text-muted-foreground">
                          {shipment.destination_address || shipment.destination}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                    {shipment.capacity_kg && (
                      <div className="flex items-center gap-1">
                        <Package className="h-3 w-3" />
                        {shipment.capacity_kg} kg
                      </div>
                    )}
                    
                    <div className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      Created {new Date(shipment.created_at).toLocaleDateString()}
                    </div>
                  </div>

                  {(shipment.pickup_time || shipment.dropoff_time) && (
                    <div className="bg-accent/20 rounded-lg p-3 space-y-2">
                      {shipment.pickup_time && (
                        <div className="text-sm">
                          <span className="font-medium">Pickup by:</span> {' '}
                          {new Date(shipment.pickup_time).toLocaleString()}
                        </div>
                      )}
                      {shipment.dropoff_time && (
                        <div className="text-sm">
                          <span className="font-medium">Deliver by:</span> {' '}
                          {new Date(shipment.dropoff_time).toLocaleString()}
                        </div>
                      )}
                    </div>
                  )}

                  <Button 
                    onClick={() => claimShipment(shipment.id)}
                    disabled={loading}
                    className="w-full"
                    size="lg"
                  >
                    {loading ? "Claiming..." : "Claim This Shipment"}
                  </Button>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </main>
    </>
  );
};

export default AvailableShipments;