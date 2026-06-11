import { useEffect, useState, useCallback } from "react";
import { useSearchParams, Link } from "react-router-dom";
import Navbar from "@/components/Navbar";
import { Helmet } from "react-helmet-async";
import LiveMap from "@/components/LiveMap";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { 
  MapPin, Star, Clock, User, DollarSign, ArrowRight, 
  Activity, ShieldAlert, CheckCircle2, Navigation, Trash2, ArrowLeft 
} from "lucide-react";
import { validateTransition, isValidTransition, ShipmentStatus } from "@/lib/dispatch/state-machine";
import { logShipmentEvent } from "@/lib/timeline/audit-logger";

interface Shipment {
  id: string;
  shipper_id: string;
  carrier_id: string | null;
  origin: string;
  destination: string;
  origin_lat: number | null;
  origin_lng: number | null;
  destination_lat: number | null;
  destination_lng: number | null;
  capacity_kg: number;
  status: ShipmentStatus;
  distance_km: number | null;
  pickup_time: string | null;
  dropoff_time: string | null;
  created_at: string;
  payment_amount?: number | null;
  payment_status?: string | null;
  pooled?: boolean;
}

interface AuditEvent {
  id: string;
  event_type: string;
  event_title: string;
  event_description: string;
  created_at: string;
  metadata?: any;
}

interface ShipperProfile {
  user_id: string;
  business_name?: string | null;
  company_name?: string | null;
  city?: string | null;
  phone?: string | null;
}

const Track = () => {
  const { userId } = useAuth();
  const { toast } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [selectedShipment, setSelectedShipment] = useState<Shipment | null>(null);
  const [events, setEvents] = useState<AuditEvent[]>([]);
  const [shipper, setShipper] = useState<ShipperProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [updatingState, setUpdatingState] = useState(false);

  const shipmentIdParam = searchParams.get("id");

  // Fetch all shipments assigned to this carrier
  const fetchShipmentsList = useCallback(async () => {
    if (!userId) return;
    try {
      const { data, error } = await supabase
        .from("shipments")
        .select("*")
        .eq("carrier_id", userId)
        .order("created_at", { ascending: false });

      if (!error && data) {
        setShipments(data as Shipment[]);
      }
    } catch (err) {
      console.error("Error fetching carrier shipments:", err);
    }
  }, [userId]);

  // Fetch detailed info for selected shipment
  const fetchShipmentDetails = useCallback(async (id: string) => {
    try {
      // 1. Fetch shipment
      const { data: shipment, error: shipError } = await supabase
        .from("shipments")
        .select("*")
        .eq("id", id)
        .maybeSingle();

      if (shipError || !shipment) {
        setSelectedShipment(null);
        return;
      }

      setSelectedShipment(shipment as Shipment);

      // 2. Fetch audit events
      const { data: auditEvents } = await supabase
        .from("shipment_events")
        .select("*")
        .eq("shipment_id", id)
        .order("created_at", { ascending: true });

      setEvents((auditEvents || []) as AuditEvent[]);

      // 3. Fetch shipper profile
      if (shipment.shipper_id) {
        const { data: shipperData } = await supabase
          .from("shipper_profiles")
          .select("*")
          .eq("user_id", shipment.shipper_id)
          .maybeSingle();
        setShipper(shipperData as ShipperProfile);
      } else {
        setShipper(null);
      }
    } catch (err) {
      console.error("Error fetching shipment details:", err);
    }
  }, []);

  // Initialize page
  useEffect(() => {
    const init = async () => {
      setLoading(true);
      await fetchShipmentsList();
      if (shipmentIdParam) {
        await fetchShipmentDetails(shipmentIdParam);
      } else {
        setSelectedShipment(null);
      }
      setLoading(false);
    };

    if (userId) {
      init();
    }
  }, [userId, shipmentIdParam, fetchShipmentsList, fetchShipmentDetails]);

  // Handle local database changes (reactivity)
  useEffect(() => {
    const handleDbChange = () => {
      fetchShipmentsList();
      if (shipmentIdParam) {
        fetchShipmentDetails(shipmentIdParam);
      }
    };
    window.addEventListener('mock-database-change', handleDbChange);
    return () => {
      window.removeEventListener('mock-database-change', handleDbChange);
    };
  }, [shipmentIdParam, fetchShipmentsList, fetchShipmentDetails]);

  // Perform FSM Transit State transition
  const handleTransitionState = async (nextState: ShipmentStatus) => {
    if (!selectedShipment) return;
    setUpdatingState(true);

    try {
      // Validate transition using FSM rules
      validateTransition(selectedShipment.status, nextState);

      const statusTitles: Record<string, string> = {
        in_transit: "Shipment In Transit 🚛",
        delivered: "Shipment Delivered 🎉"
      };

      const statusDesc: Record<string, string> = {
        in_transit: "Carrier started driving. Transit route calculated dynamically.",
        delivered: "Carrier confirmed safe delivery at the destination dropoff point."
      };

      // 1. Update status in shipments table
      const updatePayload: any = { 
        status: nextState,
        updated_at: new Date().toISOString()
      };
      
      if (nextState === 'in_transit') {
        updatePayload.pickup_time = new Date().toISOString();
      } else if (nextState === 'delivered') {
        updatePayload.dropoff_time = new Date().toISOString();
      }

      const { error } = await supabase
        .from("shipments")
        .update(updatePayload)
        .eq("id", selectedShipment.id);

      if (error) throw error;

      // 2. Insert into shipment events audit timeline
      await logShipmentEvent(
        selectedShipment.id,
        nextState,
        statusTitles[nextState] || `Status Updated: ${nextState}`,
        statusDesc[nextState] || `Shipment transitioned state to ${nextState}.`,
        { driver_id: userId, transition_from: selectedShipment.status, transition_to: nextState }
      );

      // Award carrier gamification points if delivered successfully!
      if (nextState === 'delivered') {
        try {
          await supabase.rpc('award_points', { _user_id: userId, _points: 15 });
          toast({
            title: "Points Awarded! 🏆",
            description: "You earned 15 logistics performance points for safe delivery.",
          });
        } catch (ptsErr) {
          console.error("Failed to award points:", ptsErr);
        }
      }

      toast({
        title: "Status Updated Successfully",
        description: `Shipment status is now '${nextState}'.`,
      });

      // Refetch
      await fetchShipmentDetails(selectedShipment.id);
      fetchShipmentsList();
      window.dispatchEvent(new Event('mock-database-change'));
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Invalid Transition",
        description: err.message || "Failed to update state.",
      });
    } finally {
      setUpdatingState(false);
    }
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case "pending": return "bg-zinc-500/15 text-zinc-600 dark:text-zinc-400";
      case "assigned": return "bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-200";
      case "in_transit": return "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-200";
      case "delivered": return "bg-green-500/15 text-green-600 dark:text-green-400 border-green-200";
      default: return "bg-muted text-muted-foreground";
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-20 text-center">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-primary mx-auto"></div>
        <p className="mt-4 text-muted-foreground text-sm font-medium">Entering carrier workspace...</p>
      </div>
    );
  }

  return (
    <>
      <Helmet>
        <title>Carrier Shipment Workspace | UrbanLift.AI</title>
        <meta name="description" content="Manage assigned freight shipments, record real-time state changes, and log routes." />
      </Helmet>
      <Navbar />
      <main className="min-h-screen bg-background/50 pb-12">
        {/* Top workspace banner */}
        <div className="bg-primary/5 border-b border-primary/10 py-6 px-4 mb-8">
          <div className="container mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-black text-foreground tracking-tight flex items-center gap-2">
                🚛 Carrier Shipment Workspace
              </h1>
              <p className="text-xs text-muted-foreground font-medium mt-1">
                Active Freight Tracking & Dispatch command • Confirm assignments, initiate transits, and finalize cargo dropoffs.
              </p>
            </div>
            {selectedShipment && (
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setSearchParams({})}
                className="font-bold flex items-center gap-1 hover:bg-background"
              >
                <ArrowLeft className="h-4 w-4" /> Back to Cargo List
              </Button>
            )}
          </div>
        </div>

        <div className="container mx-auto px-4">
          {!selectedShipment ? (
            /* NO SHIPMENT SELECTED STATE - Show List Workspace */
            <div className="max-w-4xl mx-auto space-y-6">
              <Card className="border-primary/10 shadow-lg bg-card/65 backdrop-blur">
                <CardHeader className="pb-4">
                  <CardTitle className="text-lg font-bold">Assigned Freight Cargo Orders</CardTitle>
                  <p className="text-xs text-muted-foreground">List of active shipments allocated to your vehicle fleet. Select one to proceed to tracking & updates.</p>
                </CardHeader>
                <CardContent className="p-6">
                  {shipments.length === 0 ? (
                    <div className="text-center py-12 space-y-4">
                      <Activity className="h-10 w-10 text-muted-foreground/35 mx-auto" />
                      <h3 className="font-bold text-foreground">No Shipments Assigned</h3>
                      <p className="text-xs text-muted-foreground max-w-sm mx-auto">There are no shipments assigned to you. Go to the "Available" cargo board to claim new delivery runs.</p>
                      <Link to="/carrier/available">
                        <Button size="sm" className="font-bold">Browse Available Jobs</Button>
                      </Link>
                    </div>
                  ) : (
                    <div className="grid gap-4">
                      {shipments.map(ship => {
                        const originShort = ship.origin.split(',')[0];
                        const destShort = ship.destination.split(',')[0];
                        
                        return (
                          <div 
                            key={ship.id}
                            onClick={() => setSearchParams({ id: ship.id })}
                            className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 rounded-xl border border-border bg-background/50 hover:bg-accent/40 hover:border-primary/30 transition-all duration-200 cursor-pointer group"
                          >
                            <div className="space-y-1.5 flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-bold text-sm text-foreground group-hover:text-primary transition-colors">
                                  Order ID: {ship.id.slice(0, 13)}
                                </span>
                                <Badge className={`${getStatusBadgeColor(ship.status)} font-semibold text-[10px] uppercase border-none`}>
                                  {ship.status}
                                </Badge>
                                {ship.pooled && (
                                  <Badge className="bg-primary/10 text-primary border-none text-[10px] font-semibold">
                                    🤖 POOLED RUN
                                  </Badge>
                                )}
                              </div>
                              <div className="flex items-center gap-2 text-xs text-muted-foreground font-medium">
                                <span className="truncate">{originShort}</span>
                                <ArrowRight className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                                <span className="truncate">{destShort}</span>
                              </div>
                              <div className="text-[10px] text-muted-foreground">
                                Weight: {ship.capacity_kg}kg • Allocated: {new Date(ship.created_at).toLocaleDateString()}
                              </div>
                            </div>
                            <div className="text-right mt-3 sm:mt-0 shrink-0 flex items-center gap-4">
                              <div>
                                <div className="font-extrabold text-sm text-primary">
                                  ₹{(ship.payment_amount || 1200).toLocaleString()}
                                </div>
                                <span className="text-[10px] text-muted-foreground font-medium uppercase">
                                  Earned payout
                                </span>
                              </div>
                              <Button size="sm" variant="ghost" className="h-8 w-8 rounded-full p-0 shrink-0 group-hover:bg-primary/10 group-hover:text-primary">
                                <ArrowRight className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          ) : (
            /* DETAILED WORKSPACE STATE - Split screen view */
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
              {/* Left side: Telemetry & Live Map */}
              <div className="lg:col-span-7 space-y-6">
                {/* Live Route Map */}
                <Card className="overflow-hidden border-primary/10 shadow-md">
                  <CardHeader className="bg-card py-4 flex flex-row items-center justify-between border-b">
                    <div>
                      <CardTitle className="text-sm font-bold flex items-center gap-1.5 uppercase">
                        📍 Route Navigation Map
                      </CardTitle>
                    </div>
                    <Badge className={`${getStatusBadgeColor(selectedShipment.status)} font-bold text-[10px] uppercase border-none`}>
                      {selectedShipment.status}
                    </Badge>
                  </CardHeader>
                  <CardContent className="p-0">
                    <LiveMap shipmentId={selectedShipment.id} userRole="carrier" />
                  </CardContent>
                </Card>

                {/* Route & Cargo Details Card */}
                <Card className="border-primary/10 shadow-md">
                  <CardHeader className="pb-3 border-b">
                    <CardTitle className="text-sm font-bold uppercase">📦 Freight Manifest</CardTitle>
                  </CardHeader>
                  <CardContent className="p-6 space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <span className="text-[10px] text-muted-foreground uppercase font-bold">Origin Pickup Address</span>
                        <div className="flex items-start gap-1.5">
                          <MapPin className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                          <p className="text-xs font-semibold text-foreground leading-normal">{selectedShipment.origin}</p>
                        </div>
                      </div>

                      <div className="space-y-1">
                        <span className="text-[10px] text-muted-foreground uppercase font-bold">Destination Dropoff Address</span>
                        <div className="flex items-start gap-1.5">
                          <MapPin className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
                          <p className="text-xs font-semibold text-foreground leading-normal">{selectedShipment.destination}</p>
                        </div>
                      </div>
                    </div>

                    <div className="border-t pt-4 grid grid-cols-2 sm:grid-cols-4 gap-4">
                      <div className="space-y-0.5">
                        <span className="text-[9px] text-muted-foreground uppercase font-medium">Cargo Weight</span>
                        <p className="text-sm font-black text-foreground">{selectedShipment.capacity_kg} kg</p>
                      </div>
                      <div className="space-y-0.5">
                        <span className="text-[9px] text-muted-foreground uppercase font-medium">Total Distance</span>
                        <p className="text-sm font-black text-foreground">
                          {selectedShipment.distance_km ? `${selectedShipment.distance_km.toFixed(1)} km` : "15.4 km"}
                        </p>
                      </div>
                      <div className="space-y-0.5">
                        <span className="text-[9px] text-muted-foreground uppercase font-medium">Earned Payout</span>
                        <p className="text-sm font-black text-primary">₹{(selectedShipment.payment_amount || 1200).toLocaleString()}</p>
                      </div>
                      <div className="space-y-0.5">
                        <span className="text-[9px] text-muted-foreground uppercase font-medium">Run Type</span>
                        <p className="text-sm font-black text-foreground uppercase">{selectedShipment.pooled ? 'Pooled Run 🤖' : 'Direct Run'}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Shipper Details Card */}
                {shipper && (
                  <Card className="border-primary/10 shadow-md">
                    <CardHeader className="pb-3 border-b">
                      <CardTitle className="text-sm font-bold uppercase">👤 Shipper Contact Information</CardTitle>
                    </CardHeader>
                    <CardContent className="p-6">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center font-bold text-lg text-emerald-600">
                            {shipper.business_name?.charAt(0) || 'S'}
                          </div>
                          <div>
                            <h4 className="font-bold text-sm text-foreground">{shipper.business_name || 'Shipper'}</h4>
                            <p className="text-xs text-muted-foreground font-semibold">Company: {shipper.company_name || 'Delhi Fabrics'}</p>
                          </div>
                        </div>
                        <div className="text-left sm:text-right text-xs">
                          <span className="text-[10px] text-muted-foreground uppercase font-medium">Direct Telephone</span>
                          <p className="font-bold text-foreground">{shipper.phone || '+91-98765-43210'}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>

              {/* Right side: FSM Status updates, Actions & Audit Timeline */}
              <div className="lg:col-span-5 space-y-6">
                {/* Active Job Dispatch Controls */}
                <Card className="border-primary/10 shadow-md bg-secondary/5">
                  <CardHeader className="pb-3 border-b">
                    <CardTitle className="text-sm font-bold uppercase flex items-center gap-1.5">
                      <span>⚙️</span>
                      <span>Transit Status Updates</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-6 space-y-4">
                    <p className="text-xs text-muted-foreground font-medium">
                      Maintain strict operational transitions. You must advance the status sequentially as you complete milestones.
                    </p>

                    <div className="flex flex-col gap-2.5 pt-2">
                      {selectedShipment.status === 'assigned' && (
                        <Button 
                          onClick={() => handleTransitionState('in_transit')}
                          disabled={updatingState}
                          variant="default"
                          size="lg"
                          className="font-bold w-full text-xs h-11 bg-amber-600 hover:bg-amber-700 text-white flex items-center justify-center gap-1.5 shadow-md"
                        >
                          <Navigation className="h-4 w-4 animate-pulse" /> Start Transit Route 🚛
                        </Button>
                      )}

                      {selectedShipment.status === 'in_transit' && (
                        <Button 
                          onClick={() => handleTransitionState('delivered')}
                          disabled={updatingState}
                          variant="default"
                          size="lg"
                          className="font-bold w-full text-xs h-11 bg-green-600 hover:bg-green-700 text-white flex items-center justify-center gap-1.5 shadow-md"
                        >
                          <CheckCircle2 className="h-4 w-4" /> Confirm Cargo Delivery ✅
                        </Button>
                      )}

                      {selectedShipment.status === 'pending' && (
                        <div className="p-3 bg-blue-500/10 text-blue-800 dark:text-blue-300 rounded-lg text-xs font-semibold">
                          Waiting for shipper to finalize match and confirm assignment.
                        </div>
                      )}

                      {selectedShipment.status === 'delivered' && (
                        <div className="flex items-start gap-2 p-3 rounded-lg bg-green-500/10 border border-green-200">
                          <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400 shrink-0 mt-0.5" />
                          <p className="text-[10px] text-green-800 dark:text-green-300 font-semibold leading-normal">
                            Finalized State Reached: Shipment delivery successfully completed. Payout and points credited!
                          </p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Shipment Event Log Timeline */}
                <Card className="border-primary/10 shadow-md">
                  <CardHeader className="pb-3 border-b">
                    <CardTitle className="text-sm font-bold uppercase flex items-center gap-1.5">
                      <span>📜</span>
                      <span>Audit Trail History</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-6">
                    <div className="relative border-l border-zinc-200 dark:border-zinc-800 ml-3 pl-6 space-y-6">
                      {events.length === 0 ? (
                        <div className="text-center py-4 text-xs text-muted-foreground font-semibold">
                          No logs registered yet.
                        </div>
                      ) : (
                        events.map((ev, i) => {
                          const date = new Date(ev.created_at);
                          const dateStr = isNaN(date.getTime()) ? '' : date.toLocaleString();
                          
                          let color = "bg-primary border-primary";
                          if (ev.event_type === 'created') color = "bg-zinc-400 border-zinc-500";
                          else if (ev.event_type === 'assigned') color = "bg-blue-500 border-blue-600";
                          else if (ev.event_type === 'in_transit') color = "bg-amber-500 border-amber-600";
                          else if (ev.event_type === 'delivered') color = "bg-green-500 border-green-600";

                          return (
                            <div key={ev.id} className="relative group">
                              <div className={`absolute -left-[31px] top-1 w-2.5 h-2.5 rounded-full border-2 ring-4 ring-background ${color}`} />
                              
                              <div className="space-y-0.5">
                                <span className="text-[9px] text-muted-foreground font-semibold block">
                                  {dateStr}
                                </span>
                                <h4 className="text-xs font-black text-foreground">
                                  {ev.event_title}
                                </h4>
                                <p className="text-[10px] text-muted-foreground leading-normal font-semibold">
                                  {ev.event_description}
                                </p>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}
        </div>
      </main>
    </>
  );
};

export default Track;
