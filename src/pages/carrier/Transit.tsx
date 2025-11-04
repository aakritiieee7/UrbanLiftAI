import Navbar from "@/components/Navbar";
import { Helmet } from "react-helmet-async";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { MapPin, Package, Clock, Route, Navigation, MapPinIcon, CheckCircle, AlertCircle, Target } from "lucide-react";
import { match } from "@/lib/matching";

interface Shipment {
  id: string;
  origin: string;
  destination: string;
  origin_lat: number;
  origin_lng: number;
  destination_lat: number;
  destination_lng: number;
  origin_address?: string;
  destination_address?: string;
  capacity_kg?: number;
  pickup_time?: string;
  dropoff_time?: string;
  created_at: string;
  status: string;
}

interface RoutePool {
  id: string;
  shipments: Shipment[];
  totalVolume: number;
  totalWeight: number;
  pickupCentroid: { lat: number; lng: number };
  dropCentroid: { lat: number; lng: number };
  bearingDeg: number;
}

interface DeliveryStep {
  id: string;
  type: 'pickup' | 'dropoff';
  shipmentId: string;
  location: { lat: number; lng: number; address: string };
  completed: boolean;
  completedAt?: string;
}

interface ActiveRoute {
  poolId: string;
  steps: DeliveryStep[];
  currentStepIndex: number;
  startedAt: string;
}

const Transit = () => {
  const { userId } = useAuth();
  const { toast } = useToast();
  const [assignedShipments, setAssignedShipments] = useState<Shipment[]>([]);
  const [pools, setPools] = useState<RoutePool[]>([]);
  const [loading, setLoading] = useState(false);
  const [currentLocation, setCurrentLocation] = useState<{lat: number; lng: number} | null>(null);
  const [locationPermission, setLocationPermission] = useState<'granted' | 'denied' | 'prompt' | null>(null);
  const [activeRoute, setActiveRoute] = useState<ActiveRoute | null>(null);
  const [trackingInterval, setTrackingInterval] = useState<NodeJS.Timeout | null>(null);

  const loadAssignedShipments = async () => {
    if (!userId) return;
    
    setLoading(true);
    console.log("Loading assigned shipments for carrier:", userId);
    
    const { data, error } = await supabase
      .from("shipments")
      .select("*")
      .eq("carrier_id", userId)
      .in("status", ["pending", "assigned", "in_transit"]) // include pending shipments assigned via payment flow
      .order("created_at", { ascending: false });

    console.log("Query executed with userId:", userId);
    console.log("Database response:", { data, error });

    if (error) {
      console.error("Error loading assigned shipments:", error);
      toast({ title: "Error", description: "Failed to load your shipments" });
    } else {
      console.log("Assigned shipments loaded:", data?.length, "shipments");
      setAssignedShipments(data || []);
      
      // Create pools for route optimization
      if (data && data.length > 1) {
        const shipmentsForMatching = data.map(s => ({
          id: s.id,
          pickup: { lat: s.origin_lat, lng: s.origin_lng },
          drop: { lat: s.destination_lat, lng: s.destination_lng },
          volume: (s.capacity_kg || 0) * 0.001, // Convert kg to cubic meters estimate
          weight: s.capacity_kg || 0,
          priority: 1
        }));

        const result = match(shipmentsForMatching, [], {
          maxPoolSize: 4,
          pickupJoinDistanceKm: 8,
          minPairScore: 0.4
        });

        // Map the pools to include full shipment data
        const routePools: RoutePool[] = result.pools.map(pool => ({
          id: pool.id,
          totalVolume: pool.totalVolume,
          totalWeight: pool.totalWeight,
          pickupCentroid: pool.pickupCentroid,
          dropCentroid: pool.dropCentroid,
          bearingDeg: pool.bearingDeg,
          shipments: pool.shipments.map(ps => 
            data.find(s => s.id === ps.id)!
          ).filter(Boolean)
        }));

        setPools(routePools);
      }
    }
    
    setLoading(false);
  };

  useEffect(() => {
    loadAssignedShipments();
    
    // Set up real-time updates for shipment status changes
    const channel = supabase
      .channel("carrier-shipments")
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'shipments',
        filter: `carrier_id=eq.${userId}`
      }, () => {
        loadAssignedShipments();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  const updateShipmentStatus = async (shipmentId: string, status: string) => {
    const { error } = await supabase
      .from("shipments")
      .update({ status })
      .eq("id", shipmentId);

    if (error) {
      console.error("Error updating shipment status:", error);
      toast({ title: "Error", description: "Failed to update shipment status" });
    } else {
      toast({ title: "Success", description: `Shipment ${status}` });
      loadAssignedShipments();
    }
  };

  const requestLocationAccess = useCallback(async () => {
    if (!navigator.geolocation) {
      toast({ title: "Error", description: "Geolocation is not supported by this browser" });
      return;
    }

    try {
      const permission = await navigator.permissions.query({ name: 'geolocation' });
      setLocationPermission(permission.state as 'granted' | 'denied' | 'prompt');
      
      if (permission.state === 'granted') {
        getCurrentLocation();
      } else {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            setCurrentLocation({
              lat: position.coords.latitude,
              lng: position.coords.longitude
            });
            setLocationPermission('granted');
            toast({ title: "Success", description: "Location access granted!" });
          },
          (error) => {
            console.error("Location error:", error);
            setLocationPermission('denied');
            toast({ title: "Error", description: "Location access denied. Enable location for step-by-step guidance." });
          }
        );
      }
    } catch (error) {
      console.error("Permission error:", error);
      // Fallback to direct geolocation request
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setCurrentLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          });
          setLocationPermission('granted');
          toast({ title: "Success", description: "Location access granted!" });
        },
        (error) => {
          setLocationPermission('denied');
          toast({ title: "Error", description: "Location access required for guided delivery" });
        }
      );
    }
  }, [toast]);

  const getCurrentLocation = useCallback(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setCurrentLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          });
        },
        (error) => {
          console.error("Location error:", error);
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
      );
    }
  }, []);

  const startGuidedRoute = useCallback((pool: RoutePool) => {
    // Create delivery steps from pool shipments
    const steps: DeliveryStep[] = [];
    
    pool.shipments.forEach(shipment => {
      // Add pickup step
      steps.push({
        id: `pickup-${shipment.id}`,
        type: 'pickup',
        shipmentId: shipment.id,
        location: {
          lat: shipment.origin_lat,
          lng: shipment.origin_lng,
          address: shipment.origin_address || shipment.origin
        },
        completed: false
      });
      
      // Add dropoff step
      steps.push({
        id: `dropoff-${shipment.id}`,
        type: 'dropoff',
        shipmentId: shipment.id,
        location: {
          lat: shipment.destination_lat,
          lng: shipment.destination_lng,
          address: shipment.destination_address || shipment.destination
        },
        completed: false
      });
    });

    // Optimize step order based on distance
    const optimizedSteps = [...steps].sort((a, b) => {
      if (!currentLocation) return 0;
      const distanceA = Math.sqrt(
        Math.pow(a.location.lat - currentLocation.lat, 2) + 
        Math.pow(a.location.lng - currentLocation.lng, 2)
      );
      const distanceB = Math.sqrt(
        Math.pow(b.location.lat - currentLocation.lat, 2) + 
        Math.pow(b.location.lng - currentLocation.lng, 2)
      );
      return distanceA - distanceB;
    });

    const route: ActiveRoute = {
      poolId: pool.id,
      steps: optimizedSteps,
      currentStepIndex: 0,
      startedAt: new Date().toISOString()
    };

    setActiveRoute(route);
    
    // Start real-time location tracking
    const interval = setInterval(getCurrentLocation, 30000); // Update every 30 seconds
    setTrackingInterval(interval);
    
    toast({ 
      title: "Route Started!", 
      description: `Step-by-step guidance activated. ${optimizedSteps.length} stops ahead.` 
    });
  }, [currentLocation, getCurrentLocation, toast]);

  const completeStep = useCallback(async (stepId: string) => {
    if (!activeRoute) return;

    const stepIndex = activeRoute.steps.findIndex(step => step.id === stepId);
    if (stepIndex === -1) return;

    const step = activeRoute.steps[stepIndex];
    const updatedSteps = [...activeRoute.steps];
    updatedSteps[stepIndex] = {
      ...step,
      completed: true,
      completedAt: new Date().toISOString()
    };

    // Update shipment status based on step type
    const newStatus = step.type === 'pickup' ? 'in_transit' : 'delivered';
    await updateShipmentStatus(step.shipmentId, newStatus);

    const updatedRoute: ActiveRoute = {
      ...activeRoute,
      steps: updatedSteps,
      currentStepIndex: stepIndex + 1
    };

    setActiveRoute(updatedRoute);

    // Check if route is complete
    if (updatedRoute.currentStepIndex >= updatedRoute.steps.length) {
      // Route completed
      if (trackingInterval) {
        clearInterval(trackingInterval);
        setTrackingInterval(null);
      }
      setActiveRoute(null);
      toast({ 
        title: "Route Completed! 🎉", 
        description: "All deliveries finished successfully." 
      });
      loadAssignedShipments(); // Refresh data
    } else {
      toast({ 
        title: "Step Completed ✅", 
        description: `${step.type === 'pickup' ? 'Pickup' : 'Delivery'} marked complete. Next stop ready.` 
      });
    }
  }, [activeRoute, trackingInterval, updateShipmentStatus, toast, loadAssignedShipments]);

  const getDistanceToLocation = useCallback((targetLat: number, targetLng: number) => {
    if (!currentLocation) return null;
    
    const R = 6371; // Earth's radius in km
    const dLat = (targetLat - currentLocation.lat) * Math.PI / 180;
    const dLng = (targetLng - currentLocation.lng) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(currentLocation.lat * Math.PI / 180) * Math.cos(targetLat * Math.PI / 180) * 
      Math.sin(dLng/2) * Math.sin(dLng/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    const distance = R * c; // Distance in km
    
    return distance < 1 ? `${Math.round(distance * 1000)}m` : `${distance.toFixed(1)}km`;
  }, [currentLocation]);

  // Check location permission on mount
  useEffect(() => {
    const checkLocation = async () => {
      try {
        const permission = await navigator.permissions.query({ name: 'geolocation' });
        setLocationPermission(permission.state as 'granted' | 'denied' | 'prompt');
        if (permission.state === 'granted') {
          getCurrentLocation();
        }
      } catch (error) {
        console.log("Permission API not supported");
      }
    };
    
    checkLocation();
  }, [getCurrentLocation]);

  // Cleanup tracking interval on unmount
  useEffect(() => {
    return () => {
      if (trackingInterval) {
        clearInterval(trackingInterval);
      }
    };
  }, [trackingInterval]);

  const openMapRoute = (shipments: Shipment[]) => {
    console.log("🗺️ openMapRoute called with shipments:", shipments);
    
    const validateCoords = (lat: number, lng: number) => 
      lat && lng && !isNaN(lat) && !isNaN(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;

    try {
      if (shipments.length === 1) {
        const s = shipments[0];
        let url;
        
        if (validateCoords(s.origin_lat, s.origin_lng) && validateCoords(s.destination_lat, s.destination_lng)) {
          // Use coordinates for better accuracy
          url = `https://www.google.com/maps/dir/${s.origin_lat},${s.origin_lng}/${s.destination_lat},${s.destination_lng}`;
        } else {
          // Fallback to address
          const origin = encodeURIComponent(s.origin_address || s.origin || 'Origin');
          const dest = encodeURIComponent(s.destination_address || s.destination || 'Destination');
          url = `https://www.google.com/maps/dir/${origin}/${dest}`;
        }
        
        console.log("🌐 Opening Google Maps URL:", url);
        console.log("🔧 User agent:", navigator.userAgent);
        console.log("🎯 Attempting to open window...");
        
        // Try to open in new tab - simplified approach
        const newWindow = window.open(url, "_blank");
        
        console.log("🪟 New window result:", newWindow);
        console.log("🚪 Window closed?", newWindow?.closed);
        
        if (!newWindow) {
          console.log("❌ Popup completely blocked");
          // Direct navigation approach
          window.location.href = url;
        } else {
          console.log("✅ Window opened successfully");
          toast({ 
            title: "Navigation Opened", 
            description: "Opening Google Maps..."
          });
        }
      } else {
        // For multiple shipments - simplified approach
        const validShipments = shipments.filter(s => 
          validateCoords(s.origin_lat, s.origin_lng) && validateCoords(s.destination_lat, s.destination_lng)
        );
        
        if (validShipments.length === 0) {
          toast({ 
            title: "Navigation Error", 
            description: "No valid coordinates found for navigation" 
          });
          return;
        }

        // Just use first origin to last destination for simplicity
        const firstShipment = validShipments[0];
        const lastShipment = validShipments[validShipments.length - 1];
        
        const url = `https://www.google.com/maps/dir/${firstShipment.origin_lat},${firstShipment.origin_lng}/${lastShipment.destination_lat},${lastShipment.destination_lng}`;
        
        console.log("Opening multi-shipment route:", url);
        
        const newWindow = window.open(url, "_blank", "noopener,noreferrer");
        
        if (!newWindow || newWindow.closed || typeof newWindow.closed == 'undefined') {
          navigator.clipboard.writeText(url).then(() => {
            toast({ 
              title: "Link Copied", 
              description: "Paste in browser to open route with " + validShipments.length + " shipments"
            });
          });
        } else {
          toast({ 
            title: "Multi-Route Opened", 
            description: `Navigation for ${validShipments.length} shipments opened`
          });
        }
      }
    } catch (error) {
      console.error("Navigation error:", error);
      toast({ 
        title: "Navigation Error", 
        description: "Failed to open Google Maps. Please try again."
      });
    }
  };

  return (
    <>
      <Helmet>
        <title>Carrier Transit | UrbanLift.AI</title>
        <meta name="description" content="Carrier transit management: plan routes, manage pickups and drop-offs efficiently." />
        <link rel="canonical" href="/carrier/transit" />
      </Helmet>
      <Navbar />
      <main className="min-h-screen bg-background">
        <section className="container mx-auto px-4 py-8">
          <header className="mb-8">
            <h1 className="text-3xl md:text-4xl font-bold">Your Transit Routes</h1>
            <p className="text-muted-foreground mt-2">Manage your assigned shipments and optimized routes.</p>
          </header>

          {loading ? (
            <div className="text-center py-8">Loading your shipments...</div>
          ) : assignedShipments.length === 0 ? (
            <Card>
              <CardContent className="text-center py-8">
                <Package className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">No Assigned Shipments</h3>
                <p className="text-muted-foreground">
                  You don't have any assigned shipments yet. Check available shipments to claim some!
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-6">
              {/* Location Access Section */}
              {locationPermission !== 'granted' && (
                <Card className="border-amber-200 bg-amber-50">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-amber-800">
                      <MapPinIcon className="h-5 w-5" />
                      Enable Location for Step-by-Step Guidance
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-amber-700 mb-4 text-sm">
                      Grant location access to get real-time navigation, distance tracking, and step-by-step delivery guidance.
                    </p>
                    <div className="flex items-center gap-2">
                      <Button 
                        onClick={requestLocationAccess}
                        className="bg-amber-600 hover:bg-amber-700"
                      >
                        <MapPinIcon className="h-4 w-4 mr-2" />
                        Enable Location Access
                      </Button>
                      {currentLocation && (
                        <Badge variant="outline" className="text-green-700 border-green-300">
                          📍 Location: {currentLocation.lat.toFixed(4)}, {currentLocation.lng.toFixed(4)}
                        </Badge>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Active Route Guidance */}
              {activeRoute && (
                <Card className="border-green-300 bg-green-50">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-green-800">
                      <Target className="h-5 w-5" />
                      Active Delivery Route
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="text-sm text-green-700">
                        Progress: {activeRoute.currentStepIndex} / {activeRoute.steps.length} stops
                      </div>
                      <Badge variant="outline" className="text-green-700 border-green-300">
                        {Math.round((activeRoute.currentStepIndex / activeRoute.steps.length) * 100)}% Complete
                      </Badge>
                    </div>

                    {activeRoute.currentStepIndex < activeRoute.steps.length ? (
                      <div className="space-y-4">
                        {/* Current Step */}
                        <div className="bg-white rounded-lg p-4 border-2 border-blue-300">
                          <div className="flex items-start justify-between mb-3">
                            <h3 className="font-semibold text-blue-800 flex items-center gap-2">
                              {activeRoute.steps[activeRoute.currentStepIndex].type === 'pickup' ? 
                                <Package className="h-4 w-4" /> : <Target className="h-4 w-4" />
                              }
                              NEXT: {activeRoute.steps[activeRoute.currentStepIndex].type === 'pickup' ? 'Pickup' : 'Drop-off'}
                            </h3>
                            <Badge className="bg-blue-100 text-blue-800">
                              Step {activeRoute.currentStepIndex + 1}
                            </Badge>
                          </div>
                          
                          <div className="text-sm mb-3">
                            <div className="flex items-center gap-2 mb-1">
                              <MapPin className="h-3 w-3 text-blue-600" />
                              {activeRoute.steps[activeRoute.currentStepIndex].location.address}
                            </div>
                            {currentLocation && (
                              <div className="text-xs text-muted-foreground">
                                Distance: {getDistanceToLocation(
                                  activeRoute.steps[activeRoute.currentStepIndex].location.lat,
                                  activeRoute.steps[activeRoute.currentStepIndex].location.lng
                                )}
                              </div>
                            )}
                          </div>

                          <div className="flex gap-2">
                            <Button 
                              onClick={() => {
                                console.log("🎯 Navigate button clicked!");
                                try {
                                  const step = activeRoute.steps[activeRoute.currentStepIndex];
                                  console.log("📍 Current step:", step);
                                  console.log("📱 Current location:", currentLocation);
                                  
                                  let url;
                                  
                                  if (currentLocation && currentLocation.lat && currentLocation.lng) {
                                    // Use current location as starting point
                                    url = `https://www.google.com/maps/dir/${currentLocation.lat},${currentLocation.lng}/${step.location.lat},${step.location.lng}`;
                                  } else {
                                    // Just open destination location
                                    url = `https://www.google.com/maps/search/${step.location.lat},${step.location.lng}`;
                                  }
                                  
                                  console.log("🌐 Navigation URL:", url);
                                  console.log("🚀 Attempting to open...");
                                  
                                  // Try simple direct navigation first
                                  window.location.href = url;
                                  
                                  toast({ 
                                    title: "Opening Navigation", 
                                    description: "Redirecting to Google Maps..."
                                  });

                                } catch (error) {
                                  console.error("❌ Navigation error:", error);
                                  toast({ 
                                    title: "Navigation Error", 
                                    description: "Failed to open navigation. Please try again."
                                  });
                                }
                              }}
                              variant="outline"
                              size="sm"
                              className="flex-1"
                            >
                              <Navigation className="h-3 w-3 mr-1" />
                              Navigate
                            </Button>
                            <Button 
                              onClick={() => completeStep(activeRoute.steps[activeRoute.currentStepIndex].id)}
                              size="sm"
                              className="flex-1 bg-green-600 hover:bg-green-700"
                            >
                              <CheckCircle className="h-3 w-3 mr-1" />
                              Mark Complete
                            </Button>
                          </div>
                        </div>

                        {/* Upcoming Steps Preview */}
                        <div className="space-y-2">
                          <h4 className="font-medium text-sm text-muted-foreground">Upcoming Steps:</h4>
                          {activeRoute.steps.slice(activeRoute.currentStepIndex + 1, activeRoute.currentStepIndex + 4).map((step, index) => (
                            <div key={step.id} className="bg-gray-50 rounded p-2 text-sm">
                              <div className="flex items-center gap-2">
                                <div className="w-6 h-6 rounded-full bg-gray-300 text-xs flex items-center justify-center">
                                  {activeRoute.currentStepIndex + index + 2}
                                </div>
                                <div className="flex-1">
                                  <div className="font-medium">
                                    {step.type === 'pickup' ? '📦 Pickup' : '🎯 Drop-off'}
                                  </div>
                                  <div className="text-xs text-muted-foreground truncate">
                                    {step.location.address}
                                  </div>
                                </div>
                                {currentLocation && (
                                  <div className="text-xs text-muted-foreground">
                                    {getDistanceToLocation(step.location.lat, step.location.lng)}
                                  </div>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-4">
                        <CheckCircle className="h-12 w-12 text-green-600 mx-auto mb-2" />
                        <h3 className="font-semibold text-green-800">Route Completed!</h3>
                        <p className="text-sm text-green-700">All deliveries finished successfully.</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {pools.length > 0 && (
                <section>
                  <h2 className="text-2xl font-semibold mb-4 flex items-center gap-2">
                    <Route className="h-6 w-6" />
                    Optimized Routes ({pools.length} pools)
                  </h2>
                  
                  <div className="grid gap-4">
                    {pools.map((pool, index) => (
                      <Card key={pool.id} className="border-l-4 border-l-blue-500">
                        <CardHeader>
                          <CardTitle className="flex items-center justify-between">
                            <span>Route Pool #{index + 1}</span>
                            <Badge variant="outline">{pool.shipments.length} shipments</Badge>
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <div className="text-sm text-muted-foreground">
                            Total Weight: {pool.totalWeight}kg | 
                            Pickup Area: {pool.pickupCentroid.lat.toFixed(3)}, {pool.pickupCentroid.lng.toFixed(3)}
                          </div>
                          
                          <div className="space-y-2">
                            {pool.shipments.map((shipment) => (
                              <div key={shipment.id} className="bg-accent/20 rounded p-3">
                                <div className="flex justify-between items-start mb-2">
                                  <div className="font-medium">#{shipment.id.slice(-8)}</div>
                                  <Badge variant={shipment.status === "assigned" ? "secondary" : "default"}>
                                    {shipment.status}
                                  </Badge>
                                </div>
                                <div className="text-sm space-y-1">
                                  <div className="flex items-center gap-2">
                                    <MapPin className="h-3 w-3 text-green-600" />
                                    {shipment.origin_address || shipment.origin}
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <MapPin className="h-3 w-3 text-red-600" />
                                    {shipment.destination_address || shipment.destination}
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>

                          <div className="flex gap-2">
                            <Button 
                              onClick={() => openMapRoute(pool.shipments)}
                              className="flex-1"
                              variant="outline"
                            >
                              <Navigation className="h-4 w-4 mr-2" />
                              🧭 Open Route in Maps
                            </Button>
                            {currentLocation && !activeRoute ? (
                              <Button 
                                onClick={() => startGuidedRoute(pool)}
                                className="flex-1 bg-blue-600 hover:bg-blue-700"
                              >
                                <Target className="h-4 w-4 mr-2" />
                                🎯 Start Guided Route
                              </Button>
                            ) : !activeRoute ? (
                              <Button 
                                onClick={() => {
                                  toast({ 
                                    title: "Location Required", 
                                    description: "Enable location access for step-by-step guidance" 
                                  });
                                }}
                                className="flex-1"
                                variant="outline"
                              >
                                🚀 Start Route
                              </Button>
                            ) : (
                              <Button 
                                disabled
                                className="flex-1"
                                variant="outline"
                              >
                                Route Active
                              </Button>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </section>
              )}

              <section>
                <h2 className="text-2xl font-semibold mb-4 flex items-center gap-2">
                  <Package className="h-6 w-6" />
                  Individual Shipments
                </h2>
                <div className="grid gap-4">
                  {assignedShipments.map((shipment) => (
                    <Card key={shipment.id} className="border-l-4 border-l-primary/50">
                      <CardHeader className="pb-3">
                        <div className="flex justify-between items-start">
                          <CardTitle className="text-lg flex items-center gap-2">
                            <Package className="h-5 w-5" />
                            Shipment #{shipment.id.slice(-8)}
                          </CardTitle>
                          <Badge variant={shipment.status === "assigned" ? "secondary" : "default"}>
                            {shipment.status}
                          </Badge>
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
                            Assigned {new Date(shipment.created_at).toLocaleDateString()}
                          </div>
                        </div>

                        <div className="flex gap-2">
                          <Button 
                            onClick={() => openMapRoute([shipment])}
                            variant="outline"
                            className="flex-1"
                          >
                            <Navigation className="h-4 w-4 mr-2" />
                            Open in Maps
                          </Button>
                          {shipment.status === "assigned" && (
                            <Button 
                              onClick={() => updateShipmentStatus(shipment.id, "in_transit")}
                              className="flex-1"
                            >
                              Start Transit
                            </Button>
                          )}
                          {shipment.status === "in_transit" && (
                            <Button 
                              onClick={() => updateShipmentStatus(shipment.id, "delivered")}
                              className="flex-1"
                              variant="default"
                            >
                              Mark Delivered
                            </Button>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </section>
            </div>
          )}
        </section>
      </main>
    </>
  );
};

export default Transit;
