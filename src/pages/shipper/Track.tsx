import { useEffect, useState, useCallback } from "react";
import { useSearchParams, Link } from "react-router-dom";
import Layout from "@/components/Layout";
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

interface CarrierProfile {
  user_id: string;
  business_name?: string | null;
  vehicle_type?: string | null;
  years_experience?: number | null;
  average_rating?: number | null;
  reliability_score?: number | null;
  acceptance_rate?: number | null;
  completion_rate?: number | null;
  on_time_performance?: number | null;
  phone?: string | null;
}

const Track = () => {
  const { userId, role } = useAuth();
  const { toast } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [selectedShipment, setSelectedShipment] = useState<Shipment | null>(null);
  const [events, setEvents] = useState<AuditEvent[]>([]);
  const [carrier, setCarrier] = useState<CarrierProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [updatingState, setUpdatingState] = useState(false);

  const shipmentIdParam = searchParams.get("id");

  // Fetch all shipments for this user
  const fetchShipmentsList = useCallback(async () => {
    if (!userId) return;
    try {
      const { data, error } = await supabase
        .from("shipments")
        .select("*")
        .eq("shipper_id", userId)
        .order("created_at", { ascending: false });

      if (!error && data) {
        setShipments(data as Shipment[]);
      }
    } catch (err) {
      console.error("Error fetching shipments:", err);
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

      // 3. Fetch carrier profile if assigned
      if (shipment.carrier_id) {
        const { data: carrierData } = await supabase
          .from("carrier_profiles")
          .select("*")
          .eq("user_id", shipment.carrier_id)
          .maybeSingle();
        setCarrier(carrierData as CarrierProfile);
      } else {
        setCarrier(null);
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

  // Simulator helper: transition the shipment state strictly
  const handleTransitionState = async (nextState: ShipmentStatus) => {
    if (!selectedShipment) return;
    setUpdatingState(true);

    try {
      // Validate transition using FSM rules
      validateTransition(selectedShipment.status, nextState);

      const statusTitles: Record<string, string> = {
        assigned: "Carrier Assigned 🤝",
        in_transit: "Shipment In Transit 🚛",
        delivered: "Shipment Delivered 🎉"
      };

      const statusDesc: Record<string, string> = {
        assigned: `Shipment assigned to carrier ${carrier?.business_name || 'Partner'}.`,
        in_transit: "Cargo picked up and transit has commenced across NCR region.",
        delivered: "Cargo successfully delivered and signed by consignee."
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
        { transition_from: selectedShipment.status, transition_to: nextState }
      );

      toast({
        title: "State Transited Successfully",
        description: `Shipment is now marked as '${nextState}'.`,
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
      <Layout>
        <div className="container mx-auto px-4 py-20 text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground text-sm font-medium">Entering tracking workspace...</p>
        </div>
      </Layout>
    );
  }

  return (
    <>
      <Helmet>
        <title>Unified Shipment Workspace | UrbanLift.AI</title>
        <meta name="description" content="Manage telemetry, maps, audit logs, and dispatch states in a single hub." />
      </Helmet>
      <Layout>
        <main className="min-h-screen bg-background/50 pb-12">
          {/* Top workspace banner */}
          <div className="bg-primary/5 border-b border-primary/10 py-6 px-4 mb-8">
            <div className="container mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
              <div>
                <h1 className="text-2xl font-black text-foreground tracking-tight flex items-center gap-2">
                  💼 Unified Shipment Workspace
                </h1>
                <p className="text-xs text-muted-foreground font-medium mt-1">
                  Delhi/NCR Logistics Operations Command Hub • Real-time telemetry, audit trails, and FSM transition control.
                </p>
              </div>
              {selectedShipment && (
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => setSearchParams({})}
                  className="font-bold flex items-center gap-1 hover:bg-background"
                >
                  <ArrowLeft className="h-4 w-4" /> Back to Shipment List
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
                    <CardTitle className="text-lg font-bold">Select Active Shipment</CardTitle>
                    <p className="text-xs text-muted-foreground">Select a shipment to access its route telemetry, matching breakdown, and vertical audit trail.</p>
                  </CardHeader>
                  <CardContent className="p-6">
                    {shipments.length === 0 ? (
                      <div className="text-center py-12 space-y-4">
                        <Activity className="h-10 w-10 text-muted-foreground/35 mx-auto" />
                        <h3 className="font-bold text-foreground">No Shipments Found</h3>
                        <p className="text-xs text-muted-foreground max-w-sm mx-auto">You haven't booked any cargo shipments yet. Head over to the Home dashboard to create one.</p>
                        <Link to="/shipper/home">
                          <Button size="sm" className="font-bold">Book a Shipment Now</Button>
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
                                    ID: {ship.id.slice(0, 13)}
                                  </span>
                                  <Badge className={`${getStatusBadgeColor(ship.status)} font-semibold text-[10px] uppercase border-none`}>
                                    {ship.status}
                                  </Badge>
                                  {ship.pooled && (
                                    <Badge className="bg-primary/10 text-primary border-none text-[10px] font-semibold">
                                      🤖 POOLED
                                    </Badge>
                                  )}
                                </div>
                                <div className="flex items-center gap-2 text-xs text-muted-foreground font-medium">
                                  <span className="truncate">{originShort}</span>
                                  <ArrowRight className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                                  <span className="truncate">{destShort}</span>
                                </div>
                                <div className="text-[10px] text-muted-foreground">
                                  Capacity: {ship.capacity_kg}kg • Created: {new Date(ship.created_at).toLocaleDateString()}
                                </div>
                              </div>
                              <div className="text-right mt-3 sm:mt-0 shrink-0 flex items-center gap-4">
                                <div>
                                  <div className="font-extrabold text-sm text-foreground">
                                    ₹{(ship.payment_amount || 1200).toLocaleString()}
                                  </div>
                                  <span className="text-[10px] text-muted-foreground font-medium uppercase">
                                    {ship.payment_status || 'Paid'}
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
                  {/* Live Tracking Map */}
                  <Card className="overflow-hidden border-primary/10 shadow-md">
                    <CardHeader className="bg-card py-4 flex flex-row items-center justify-between border-b">
                      <div>
                        <CardTitle className="text-sm font-bold flex items-center gap-1.5 uppercase">
                          📍 Telemetry Map
                        </CardTitle>
                      </div>
                      <Badge className={`${getStatusBadgeColor(selectedShipment.status)} font-bold text-[10px] uppercase border-none`}>
                        {selectedShipment.status}
                      </Badge>
                    </CardHeader>
                    <CardContent className="p-0">
                      <LiveMap shipmentId={selectedShipment.id} />
                    </CardContent>
                  </Card>

                  {/* Route & Cargo Details Card */}
                  <Card className="border-primary/10 shadow-md">
                    <CardHeader className="pb-3 border-b">
                      <CardTitle className="text-sm font-bold uppercase">📦 Consignment Details</CardTitle>
                    </CardHeader>
                    <CardContent className="p-6 space-y-4">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <span className="text-[10px] text-muted-foreground uppercase font-bold">Origin Pickup</span>
                          <div className="flex items-start gap-1.5">
                            <MapPin className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                            <p className="text-xs font-semibold text-foreground leading-normal">{selectedShipment.origin}</p>
                          </div>
                        </div>

                        <div className="space-y-1">
                          <span className="text-[10px] text-muted-foreground uppercase font-bold">Destination Dropoff</span>
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
                          <span className="text-[9px] text-muted-foreground uppercase font-medium">Distance</span>
                          <p className="text-sm font-black text-foreground">
                            {selectedShipment.distance_km ? `${selectedShipment.distance_km.toFixed(1)} km` : "15.4 km"}
                          </p>
                        </div>
                        <div className="space-y-0.5">
                          <span className="text-[9px] text-muted-foreground uppercase font-medium">Booking Price</span>
                          <p className="text-sm font-black text-primary">₹{(selectedShipment.payment_amount || 1200).toLocaleString()}</p>
                        </div>
                        <div className="space-y-0.5">
                          <span className="text-[9px] text-muted-foreground uppercase font-medium">Pooled Status</span>
                          <p className="text-sm font-black text-foreground uppercase">{selectedShipment.pooled ? 'Pooled 🤖' : 'Direct'}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Assigned Carrier Reliability Profiles Card */}
                  {carrier ? (
                    <Card className="border-primary/10 shadow-md">
                      <CardHeader className="pb-3 border-b">
                        <CardTitle className="text-sm font-bold uppercase flex items-center justify-between">
                          <span>👤 Assigned Carrier Profile</span>
                          <Badge className="bg-amber-500/10 text-amber-600 dark:text-amber-400 border-none font-semibold text-[10px]">
                            {carrier.reliability_score ?? 95}% Reliability Score
                          </Badge>
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="p-6 space-y-4">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                          <div className="flex items-center gap-3">
                            <div className="w-12 h-12 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center font-bold text-lg text-primary">
                              {carrier.business_name?.charAt(0) || 'C'}
                            </div>
                            <div>
                              <h4 className="font-bold text-sm text-foreground">{carrier.business_name || 'Sharma Cargo'}</h4>
                              <div className="flex items-center gap-2 mt-0.5">
                                <span className="text-xs text-muted-foreground font-semibold">⭐ {(carrier.average_rating || 5.0).toFixed(1)} rating</span>
                                <span className="text-muted-foreground text-xs">•</span>
                                <span className="text-xs text-muted-foreground font-semibold">{carrier.vehicle_type || 'Tata Ace'}</span>
                              </div>
                            </div>
                          </div>
                          <div className="text-left sm:text-right text-xs">
                            <span className="text-[10px] text-muted-foreground uppercase font-medium">Direct Contact</span>
                            <p className="font-bold text-foreground">{carrier.phone || '+91-98765-43210'}</p>
                          </div>
                        </div>

                        {/* Breakdown Metrics Grid */}
                        <div className="border-t pt-4 grid grid-cols-3 gap-3">
                          <div className="bg-secondary/15 p-2.5 rounded-lg border border-border text-center">
                            <span className="text-[9px] text-muted-foreground block font-bold">Acceptance Rate</span>
                            <span className="font-black text-sm text-foreground">{carrier.acceptance_rate ?? 95}%</span>
                          </div>
                          <div className="bg-secondary/15 p-2.5 rounded-lg border border-border text-center">
                            <span className="text-[9px] text-muted-foreground block font-bold">Completion Rate</span>
                            <span className="font-black text-sm text-foreground">{carrier.completion_rate ?? 98}%</span>
                          </div>
                          <div className="bg-secondary/15 p-2.5 rounded-lg border border-border text-center">
                            <span className="text-[9px] text-muted-foreground block font-bold">On-Time Performance</span>
                            <span className="font-black text-sm text-foreground">{carrier.on_time_performance ?? 96}%</span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ) : (
                    <Card className="border-dashed border-primary/25 bg-primary/5 shadow-inner">
                      <CardContent className="p-6 text-center space-y-2">
                        <User className="h-6 w-6 text-primary mx-auto opacity-75" />
                        <h4 className="font-bold text-sm text-foreground">No Carrier Assigned</h4>
                        <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                          This shipment is currently in a 'pending' state. Select carriers from the recommendations panel in your home dashboard to allocate a driver.
                        </p>
                      </CardContent>
                    </Card>
                  )}
                </div>

                {/* Right side: Events Timeline, Simulator & Actions */}
                <div className="lg:col-span-5 space-y-6">
                  {/* State Machine Transition Simulator Card (Extremely powerful feature!) */}
                  <Card className="border-primary/10 shadow-md bg-secondary/5">
                    <CardHeader className="pb-3 border-b">
                      <CardTitle className="text-sm font-bold uppercase flex items-center gap-1.5">
                        <span>⚙️</span>
                        <span>State Machine Transition simulator</span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-6 space-y-4">
                      <p className="text-xs text-muted-foreground font-medium">
                        Validate the dispatch finite state machine transitions locally. Transitions must flow sequentially: <br />
                        <strong className="text-primary">pending ➔ assigned ➔ in_transit ➔ delivered</strong>.
                      </p>

                      <div className="flex flex-col gap-2.5 pt-2">
                        <Button 
                          onClick={() => handleTransitionState('assigned')}
                          disabled={updatingState || !isValidTransition(selectedShipment.status, 'assigned')}
                          variant={selectedShipment.status === 'pending' ? 'default' : 'outline'}
                          size="sm"
                          className="font-bold justify-between text-xs h-9"
                        >
                          <span>Transition to Assigned</span>
                          <Badge className="bg-blue-500/10 text-blue-600 dark:text-blue-400 border-none font-semibold text-[9px]">
                            pending ➔ assigned
                          </Badge>
                        </Button>

                        <Button 
                          onClick={() => handleTransitionState('in_transit')}
                          disabled={updatingState || !isValidTransition(selectedShipment.status, 'in_transit')}
                          variant={selectedShipment.status === 'assigned' ? 'default' : 'outline'}
                          size="sm"
                          className="font-bold justify-between text-xs h-9"
                        >
                          <span>Transition to In Transit</span>
                          <Badge className="bg-amber-500/10 text-amber-600 dark:text-amber-400 border-none font-semibold text-[9px]">
                            assigned ➔ in_transit
                          </Badge>
                        </Button>

                        <Button 
                          onClick={() => handleTransitionState('delivered')}
                          disabled={updatingState || !isValidTransition(selectedShipment.status, 'delivered')}
                          variant={selectedShipment.status === 'in_transit' ? 'default' : 'outline'}
                          size="sm"
                          className="font-bold justify-between text-xs h-9"
                        >
                          <span>Transition to Delivered</span>
                          <Badge className="bg-green-500/10 text-green-600 dark:text-green-400 border-none font-semibold text-[9px]">
                            in_transit ➔ delivered
                          </Badge>
                        </Button>
                      </div>

                      {/* Display current status and FSM warning if finalized */}
                      {selectedShipment.status === 'delivered' && (
                        <div className="flex items-start gap-2 p-3 rounded-lg bg-green-500/10 border border-green-200 mt-2">
                          <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400 shrink-0 mt-0.5" />
                          <p className="text-[10px] text-green-800 dark:text-green-300 font-semibold leading-normal">
                            Finalized State Reached: Shipment has completed its lifecycle. No further transitions are possible.
                          </p>
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {/* Chronological Audit Timeline Log */}
                  <Card className="border-primary/10 shadow-md">
                    <CardHeader className="pb-3 border-b">
                      <CardTitle className="text-sm font-bold uppercase flex items-center gap-1.5">
                        <span>📜</span>
                        <span>Chronological Audit Trail</span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-6">
                      <div className="relative border-l border-zinc-200 dark:border-zinc-800 ml-3 pl-6 space-y-6">
                        {events.length === 0 ? (
                          <div className="text-center py-4 text-xs text-muted-foreground font-semibold">
                            No logs registered for this shipment yet.
                          </div>
                        ) : (
                          events.map((ev, i) => {
                            const date = new Date(ev.created_at);
                            const dateStr = isNaN(date.getTime()) ? '' : date.toLocaleString();
                            
                            // Determine marker color depending on event type
                            let color = "bg-primary border-primary";
                            if (ev.event_type === 'created') color = "bg-zinc-400 border-zinc-500";
                            else if (ev.event_type === 'assigned') color = "bg-blue-500 border-blue-600";
                            else if (ev.event_type === 'in_transit') color = "bg-amber-500 border-amber-600";
                            else if (ev.event_type === 'delivered') color = "bg-green-500 border-green-600";

                            return (
                              <div key={ev.id} className="relative group">
                                {/* Chronological Marker dot */}
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
      </Layout>
    </>
  );
};

export default Track;