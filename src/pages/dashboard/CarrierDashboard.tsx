import { Helmet } from "react-helmet-async";
import Navbar from "@/components/Navbar";
import LiveMap from "@/components/LiveMap";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";
import { MapPin, Package, Clock, ExternalLink, Truck, CheckCircle } from "lucide-react";

const CarrierDashboard = () => {
  const { userId } = useAuth();
  const [jobs, setJobs] = useState<any[]>([]);
  const [carrierProfile, setCarrierProfile] = useState<any>(null);
  const navigate = useNavigate();

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
    if (experience < 0.5) experienceMultiplier = 0.8; // New drivers: 20% discount
    else if (experience >= 2) experienceMultiplier = 1.1; // Experienced: 10% premium
    
    // Vehicle type multiplier (simplified - assuming based on capacity)
    let vehicleMultiplier = 1;
    const capacity = carrierProfile.vehicle_capacity_kg || 1000;
    if (capacity < 500) vehicleMultiplier = 0.9; // Light vehicles: 10% discount
    else if (capacity > 2000) vehicleMultiplier = 1.2; // Heavy trucks: 20% premium
    
    // Distance adjustment
    let distanceMultiplier = 1;
    const distance = shipment.distance_km || 0;
    if (distance > 50) distanceMultiplier = 0.95; // Long distance: 5% discount
    else if (distance < 10) distanceMultiplier = 1.05; // Short distance: small premium
    
    return Math.round(baseAmount * experienceMultiplier * vehicleMultiplier * distanceMultiplier);
  };

  useEffect(() => {
    console.log("CarrierDashboard useEffect running - userId:", userId);
    const checkAndLoadProfile = async () => {
      if (!userId) return;
      const { data } = await (supabase as any)
        .from("carrier_profiles")
        .select("user_id, role, years_experience, vehicle_capacity_kg")
        .eq("user_id", userId)
        .maybeSingle();
      if (!data || data.role !== "carrier") {
        navigate("/profile-setup?role=carrier", { replace: true });
      } else {
        setCarrierProfile(data);
      }
    };
    checkAndLoadProfile();
  }, [userId]); // Removed navigate from dependency array

  const load = async () => {
    if (!userId) return;
    console.log("Loading shipments for carrier:", userId);
    const { data, error } = await supabase
      .from("shipments")
      .select("id, origin, destination, status, pickup_time, dropoff_time, created_at, capacity_kg, pickup_address, delivery_address")
      .eq("carrier_id", userId)
      .order("created_at", { ascending: false });
    
    if (error) {
      console.error("Error loading carrier shipments:", error);
    } else {
      console.log("Carrier shipments loaded:", data);
      setJobs(data ?? []);
    }
  };

  useEffect(() => {
    load();
    if (!userId) return;
    const ch = supabase
      .channel("carrier-jobs")
      .on('postgres_changes', { event: '*', schema: 'public', table: 'shipments', filter: `carrier_id=eq.${userId}` }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  const markPickedUp = async (id: string) => {
    await supabase.from("shipments").update({ 
      status: "in_transit", 
      pickup_time: new Date().toISOString() 
    }).eq("id", id);
    await load();
  };

  const markDelivered = async (id: string) => {
    await supabase.from("shipments").update({ 
      status: "delivered", 
      dropoff_time: new Date().toISOString() 
    }).eq("id", id);
    if (userId) await supabase.rpc("award_points", { _user_id: userId, _points: 10, _source: "shipment_delivered" });
    await load();
  };

  const openInGoogleMaps = (origin: string, destination: string) => {
    const url = `https://www.google.com/maps/dir/${encodeURIComponent(origin)}/${encodeURIComponent(destination)}`;
    window.open(url, '_blank');
  };

  const openRouteInGoogleMaps = () => {
    if (jobs.length === 0) return;
    
    // Create waypoints for all pickup and delivery locations
    const pickupLocations = jobs.filter(j => j.status === 'assigned').map(j => j.origin);
    const deliveryLocations = jobs.filter(j => j.status === 'in_transit').map(j => j.destination);
    
    const allWaypoints = [...pickupLocations, ...deliveryLocations];
    
    if (allWaypoints.length > 0) {
      const waypointsStr = allWaypoints.map(w => encodeURIComponent(w)).join('/');
      const url = `https://www.google.com/maps/dir/${waypointsStr}`;
      window.open(url, '_blank');
    }
  };

  return (
    <>
      <Helmet>
        <title>Carrier Dashboard | UrbanLift.AI</title>
        <meta name="description" content="View assigned shipments and update delivery status with live tracking." />
        <link rel="canonical" href="/carrier-dashboard" />
      </Helmet>
      <Navbar />
      <main className="container mx-auto px-4 py-8">
        <section className="mb-6">
          <h1 className="text-3xl font-semibold">Carrier Dashboard</h1>
          <p className="text-muted-foreground">Your live location and assigned shipments.</p>
        </section>
        <section className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-6">
            {/* Route Planning */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <Truck className="h-5 w-5" />
                    Your Route Plan
                  </span>
                  <Button 
                    onClick={openRouteInGoogleMaps}
                    variant="outline"
                    size="sm"
                    className="flex items-center gap-2"
                    disabled={jobs.length === 0}
                  >
                    <ExternalLink className="h-4 w-4" />
                    Open Full Route
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {jobs.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No assigned shipments.
                  </div>
                ) : (
                  <div className="space-y-4">
                    {/* Pending Pickups */}
                    {jobs.filter(j => j.status === 'assigned').length > 0 && (
                      <div>
                        <h3 className="font-medium text-orange-600 mb-3 flex items-center gap-2">
                          <Package className="h-4 w-4" />
                          Pending Pickups ({jobs.filter(j => j.status === 'assigned').length})
                        </h3>
                        <div className="space-y-3">
                          {jobs.filter(j => j.status === 'assigned').map(j => (
                            <div key={`pickup-${j.id}`} className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                              <div className="flex items-start justify-between">
                                <div className="flex-1">
                                  <div className="flex items-center gap-2 mb-2">
                                    <MapPin className="h-4 w-4 text-orange-600" />
                                    <span className="font-medium">Pickup: {j.origin}</span>
                                  </div>
                                  <div className="text-sm text-muted-foreground mb-2">
                                    Deliver to: {j.destination}
                                  </div>
                                   {j.capacity_kg && (
                                     <div className="text-sm text-muted-foreground flex items-center gap-1">
                                       <Package className="h-3 w-3" />
                                       {j.capacity_kg} kg
                                     </div>
                                   )}
                                   <div className="text-sm font-medium text-green-600 flex items-center gap-1">
                                     <span className="text-green-600">💰</span>
                                     Earn: ₹{calculateEarnings(j).toLocaleString()}
                                   </div>
                                </div>
                                <div className="flex gap-2">
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => openInGoogleMaps(j.origin, j.destination)}
                                  >
                                    <ExternalLink className="h-3 w-3 mr-1" />
                                    Route
                                  </Button>
                                  <Button
                                    size="sm"
                                    onClick={() => markPickedUp(j.id)}
                                    className="bg-orange-600 hover:bg-orange-700"
                                  >
                                    Mark Picked Up
                                  </Button>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* In Transit (Ready for Delivery) */}
                    {jobs.filter(j => j.status === 'in_transit').length > 0 && (
                      <div>
                        <h3 className="font-medium text-blue-600 mb-3 flex items-center gap-2">
                          <Truck className="h-4 w-4" />
                          Ready for Delivery ({jobs.filter(j => j.status === 'in_transit').length})
                        </h3>
                        <div className="space-y-3">
                          {jobs.filter(j => j.status === 'in_transit').map(j => (
                            <div key={`delivery-${j.id}`} className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                              <div className="flex items-start justify-between">
                                <div className="flex-1">
                                  <div className="flex items-center gap-2 mb-2">
                                    <MapPin className="h-4 w-4 text-blue-600" />
                                    <span className="font-medium">Deliver to: {j.destination}</span>
                                  </div>
                                  <div className="text-sm text-muted-foreground mb-2">
                                    Picked up from: {j.origin}
                                  </div>
                       {j.pickup_time && (
                         <div className="text-sm text-muted-foreground flex items-center gap-1">
                           <Clock className="h-3 w-3" />
                           Picked up: {new Date(j.pickup_time).toLocaleString()}
                         </div>
                       )}
                                   <div className="text-sm font-medium text-green-600 flex items-center gap-1">
                                     <span className="text-green-600">💰</span>
                                     Earn: ₹{calculateEarnings(j).toLocaleString()}
                                   </div>
                                </div>
                                <div className="flex gap-2">
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => openInGoogleMaps(j.origin, j.destination)}
                                  >
                                    <ExternalLink className="h-3 w-3 mr-1" />
                                    Route
                                  </Button>
                                  <Button
                                    size="sm"
                                    onClick={() => markDelivered(j.id)}
                                    className="bg-green-600 hover:bg-green-700"
                                  >
                                    <CheckCircle className="h-3 w-3 mr-1" />
                                    Mark Delivered
                                  </Button>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Completed Deliveries */}
                    {jobs.filter(j => j.status === 'delivered').length > 0 && (
                      <div>
                        <h3 className="font-medium text-green-600 mb-3 flex items-center gap-2">
                          <CheckCircle className="h-4 w-4" />
                          Completed ({jobs.filter(j => j.status === 'delivered').length})
                        </h3>
                        <div className="space-y-3">
                          {jobs.filter(j => j.status === 'delivered').slice(0, 5).map(j => (
                            <div key={`completed-${j.id}`} className="bg-green-50 border border-green-200 rounded-lg p-4">
                              <div className="flex items-center justify-between">
                                <div>
                                  <div className="flex items-center gap-2 mb-1">
                                    <CheckCircle className="h-4 w-4 text-green-600" />
                                    <span className="font-medium">{j.origin} → {j.destination}</span>
                                  </div>
                       {j.dropoff_time && (
                         <div className="text-sm text-muted-foreground">
                           Delivered: {new Date(j.dropoff_time).toLocaleString()}
                         </div>
                       )}
                                   <div className="text-sm font-medium text-green-600 flex items-center gap-1">
                                     <span className="text-green-600">💰</span>
                                     Earned: ₹{calculateEarnings(j).toLocaleString()}
                                   </div>
                                </div>
                                <Badge className="bg-green-100 text-green-800">
                                  Completed
                                </Badge>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            {/* Live Map */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Live Map</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="aspect-square rounded-lg overflow-hidden">
                  <LiveMap userRole="carrier" showDelivered={false} />
                </div>
              </CardContent>
            </Card>

            {/* Quick Stats */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Today's Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Pending Pickups</span>
                    <Badge variant="outline" className="bg-orange-50 text-orange-600">
                      {jobs.filter(j => j.status === 'assigned').length}
                    </Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Ready for Delivery</span>
                    <Badge variant="outline" className="bg-blue-50 text-blue-600">
                      {jobs.filter(j => j.status === 'in_transit').length}
                    </Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Completed</span>
                    <Badge variant="outline" className="bg-green-50 text-green-600">
                      {jobs.filter(j => j.status === 'delivered').length}
                    </Badge>
                  </div>
                  <div className="flex justify-between items-center border-t pt-3 mt-3">
                    <span className="text-sm font-medium">Total Earnings Today</span>
                    <span className="text-lg font-bold text-green-600">
                      ₹{jobs.reduce((total, job) => total + calculateEarnings(job), 0).toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Completed Earnings</span>
                    <span className="text-sm font-medium text-green-600">
                      ₹{jobs.filter(j => j.status === 'delivered').reduce((total, job) => total + calculateEarnings(job), 0).toLocaleString()}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </section>
      </main>
    </>
  );
};

export default CarrierDashboard;
