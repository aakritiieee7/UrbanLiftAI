import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import LocationPicker, { LocationData } from "@/components/shipment/LocationPicker";
import { clusterShipments, type Shipment as AlgoShipment } from "@/lib/logistics/pooling";
import { useAuth } from "@/contexts/AuthContext";
import { Badge } from "@/components/ui/badge";
import { Clock, User, Loader2, Star, Truck, CreditCard } from "lucide-react";
import RazorpayPayment from "@/components/payment/RazorpayPayment";
import { rankAndScoreCarriers } from "@/lib/dispatch/recommender";
import { logShipmentEvent } from "@/lib/timeline/audit-logger";

type ProcessingStep = 'form' | 'creating' | 'pooling' | 'matching' | 'selection' | 'payment' | 'tracking';

interface CarrierProfile {
  user_id: string;
  business_name?: string;
  company_name?: string;
  phone?: string;
  vehicle_type?: string;
  vehicle_capacity_kg?: number;
  years_experience?: number;
  service_areas?: string[];
  service_regions?: string;
  vehicle_types?: string;
  users?: {
    avatar_url?: string;
  };
  distance?: number;
  score?: number;
  isRecommended?: boolean;
  assignmentScore?: number;
  assignmentReasons?: string[];
  whyRecommended?: string[];
  calculatedCost?: number;
  baseMultiplier?: number;
  breakdown?: {
    proximity: number;
    capacity: number;
    reputation: number;
    reliability: number;
  };
}

export const ShipmentForm = ({ onCreated }: { onCreated?: () => void }) => {
  const { userId } = useAuth();
  const { toast } = useToast();
  const [origin, setOrigin] = useState<LocationData | undefined>();
  const [destination, setDestination] = useState<LocationData | undefined>();
  const [capacityKg, setCapacityKg] = useState<number | "">("");
  const [pickup, setPickup] = useState<string>("");
  const [dropoff, setDropoff] = useState<string>("");
  const [currentStep, setCurrentStep] = useState<ProcessingStep>('form');
  const [shipmentId, setShipmentId] = useState<string | null>(null);
  const [carriers, setCarriers] = useState<CarrierProfile[]>([]);
  const [selectedCarrier, setSelectedCarrier] = useState<CarrierProfile | null>(null);
  const [poolingResults, setPoolingResults] = useState<any>(null);

  const resetForm = () => {
    setOrigin(undefined);
    setDestination(undefined);
    setCapacityKg("");
    setPickup("");
    setDropoff("");
    setCurrentStep('form');
    setShipmentId(null);
    setCarriers([]);
    setSelectedCarrier(null);
    setPoolingResults(null);
  };

  const calculateDistance = (lat1: number, lng1: number, lat2: number, lng2: number): number => {
    const R = 6371; // Earth's radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng/2) * Math.sin(dLng/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };

  const calculatePrice = (distance: number, weight: number): number => {
    // Much more reasonable pricing: ₹10 per kg + ₹5 per km + base fee of ₹50
    const basePrice = 50;
    const distanceRate = 5;
    const weightRate = 10;
    return Math.round(basePrice + (distance * distanceRate) + (weight * weightRate));
  };

  const calculateETA = (distance: number): number => {
    const avgSpeed = 25; // km/h in city traffic
    return Math.round(distance / avgSpeed * 60); // in minutes
  };

  const fetchAvailableCarriers = async (originLat: number, originLng: number, requiredCapacity: number) => {
    try {
      console.log('fetchAvailableCarriers called with:', { originLat, originLng, requiredCapacity });
      
      // Fetch real carriers from the database
      const { data: carriers, error } = await supabase
        .from('carrier_profiles')
        .select(`
          user_id,
          business_name,
          company_name,
          phone,
          contact_phone,
          vehicle_type,
          vehicle_types,
          vehicle_capacity_kg,
          years_experience,
          service_areas,
          service_regions,
          last_known_lat,
          last_known_lng,
          average_rating
        `);

      console.log('Supabase query result:', { carriers, error });

      if (error) {
        console.error('Error fetching carriers:', error);
        return [];
      }

      if (!carriers || carriers.length === 0) {
        console.log('No carriers found in database');
        return [];
      }

      console.log(`Found ${carriers.length} carriers in database`);

      // Convert database formats
      const carrierInputs = carriers.map(c => ({
        user_id: c.user_id,
        business_name: c.business_name || c.company_name || 'Carrier',
        company_name: c.company_name,
        phone: c.phone || c.contact_phone || 'Not provided',
        contact_phone: c.contact_phone,
        vehicle_type: c.vehicle_type || c.vehicle_types || 'Vehicle',
        vehicle_types: c.vehicle_types,
        vehicle_capacity_kg: c.vehicle_capacity_kg,
        years_experience: c.years_experience,
        last_known_lat: c.last_known_lat ? Number(c.last_known_lat) : null,
        last_known_lng: c.last_known_lng ? Number(c.last_known_lng) : null,
        average_rating: c.average_rating ? Number(c.average_rating) : null
      }));

      // Calculate distances, scores, pricing, reasons
      const ranked = rankAndScoreCarriers(
        {
          origin_lat: originLat,
          origin_lng: originLng,
          capacity_kg: requiredCapacity,
        },
        carrierInputs
      );

      return ranked.map(c => ({
        ...c,
        assignmentScore: c.score,
        assignmentReasons: c.whyRecommended
      }));
        
    } catch (error) {
      console.error('Failed to fetch carriers:', error);
      return [];
    }
  };

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId) {
      toast({ title: "Login required", description: "Please login to create a shipment." });
      return;
    }
    if (!origin || !destination) {
      toast({ title: "Select locations", description: "Pick pickup and drop-off locations." });
      return;
    }

    // Validate coordinates exist
    if (!origin.lat || !origin.lng || !destination.lat || !destination.lng) {
      toast({ title: "Missing coordinates", description: "Please select locations on the map by clicking or searching." });
      return;
    }

    // Step 1: Creating temporary shipment data (not saved yet)
    setCurrentStep('creating');
    
    const originStr = origin.address ?? `${origin.lat},${origin.lng}`;
    const destStr = destination.address ?? `${destination.lat},${destination.lng}`;

    // Store shipment data for later creation after payment
    const shipmentData = {
      origin: originStr,
      destination: destStr,
      origin_lat: origin.lat,
      origin_lng: origin.lng,
      origin_address: origin.address,
      destination_lat: destination.lat,
      destination_lng: destination.lng,
      destination_address: destination.address,
      shipper_id: userId,
      capacity_kg: capacityKg === "" ? null : Number(capacityKg),
      pickup_time: pickup || null,
      dropoff_time: dropoff || null,
      status: "pending",
      carrier_id: null,
    };
    
    // Skip database insertion - we'll create the shipment after payment
    // Just continue to carrier matching

    // Step 2: AI Pooling
    setCurrentStep('pooling');
    await new Promise(resolve => setTimeout(resolve, 2000)); // Simulate processing time

    // Pull recent shipments and run pooling
    const { data: allShipments } = await supabase
      .from("shipments")
      .select("id, origin, destination, shipper_id, pickup_time, dropoff_time")
      .eq("status", "pending")
      .limit(25);

    let poolingResult = null;
    if (allShipments && allShipments.length >= 2) {
      const parseCoord = (s: string): { lat: number; lng: number } | null => {
        const m = s.match(/(-?\d+\.\d+)\s*,\s*(-?\d+\.\d+)/);
        if (!m) return null;
        return { lat: parseFloat(m[1]), lng: parseFloat(m[2]) };
      };
      const toAlgo = (r: any): AlgoShipment | null => {
        const po = parseCoord(r.origin);
        const pd = parseCoord(r.destination);
        if (!po || !pd) return null;
        return {
          id: r.id,
          pickup: po,
          drop: pd,
          readyAt: r.pickup_time ?? undefined,
          dueBy: r.dropoff_time ?? undefined,
        };
      };
      const algos = allShipments.map(toAlgo).filter(Boolean) as AlgoShipment[];
      if (algos.length >= 2) {
        const pools = clusterShipments(algos);
        const best = pools.sort((a, b) => b.shipments.length - a.shipments.length)[0];
        poolingResult = best;
        setPoolingResults(best);
      }
    }

  // Step 3: Intelligent Carrier Assignment
  setCurrentStep('matching');
  
  try {
    // For now, skip auto-assignment and go directly to manual selection
    // We'll do the assignment after payment
    const assignError = null; // Simulate no auto-assignment for this flow

    // Always show manual selection with smart recommendations
    const availableCarriers = await fetchAvailableCarriers(
      origin.lat,
      origin.lng,
      Number(capacityKg) || 0
    );
    
    if (availableCarriers.length > 0) {
      const enhancedCarriers = availableCarriers.map((carrier, index) => ({
        ...carrier,
        isRecommended: index === 0,
        whyRecommended: carrier.whyRecommended || [],
        assignmentScore: carrier.score,
        assignmentReasons: carrier.whyRecommended || []
      }));
      
      setCarriers(enhancedCarriers); // Show all matched carriers
      
      // Auto-select the recommended carrier (the top ranked match)
      setSelectedCarrier(enhancedCarriers[0]);
      
      toast({ 
        title: "Smart Recommendations Ready", 
        description: `Found ${enhancedCarriers.length} available carriers with AI matching` 
      });
      
      setCurrentStep('selection');
    } else {
      // No carriers available
      toast({ 
        title: "No Carriers Available", 
        description: "No carriers found in your area. Please try again later." 
      });
      setCurrentStep('form');
    }
  } catch (error) {
    console.error('Carrier matching failed:', error);
    toast({ 
      title: "Error Finding Carriers", 
      description: "Failed to find carriers. Please try again." 
    });
    setCurrentStep('form');
  }

  // Award points for creating shipment (with error handling)
  try {
    await supabase.rpc("award_points", { _user_id: userId, _points: 5, _source: "shipment_created" });
  } catch (error) {
    console.log("Points award failed (non-critical):", error);
  }
  };

  const selectCarrier = async (carrier: CarrierProfile) => {
    setSelectedCarrier(carrier);
    // Move to payment step (don't assign carrier yet, will be done after payment)
    setCurrentStep('payment');
  };


  const finishFlow = () => {
    resetForm();
    onCreated?.();
  };

  // Render different UI based on current step
  if (currentStep === 'creating') {
    return (
      <Card className="border-primary/20">
        <CardContent className="p-8 text-center">
          <Loader2 className="h-12 w-12 animate-spin mx-auto mb-4 text-primary" />
          <h3 className="text-lg font-semibold mb-2">Creating Your Shipment</h3>
          <p className="text-muted-foreground">Setting up your delivery request...</p>
        </CardContent>
      </Card>
    );
  }

  if (currentStep === 'pooling') {
    return (
      <Card className="border-primary/20">
        <CardContent className="p-8 text-center">
          <Loader2 className="h-12 w-12 animate-spin mx-auto mb-4 text-blue-500" />
          <h3 className="text-lg font-semibold mb-2">AI Pooling in Progress</h3>
          <p className="text-muted-foreground">Analyzing nearby shipments for optimal grouping...</p>
          {poolingResults && (
            <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-950/30 rounded-lg">
              <p className="text-sm text-blue-700 dark:text-blue-300">
                🔄 Found {poolingResults.shipments?.length || 0} shipments for pooling
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  if (currentStep === 'matching') {
    return (
      <Card className="border-primary/20">
        <CardContent className="p-8 text-center">
          <Loader2 className="h-12 w-12 animate-spin mx-auto mb-4 text-green-500" />
          <h3 className="text-lg font-semibold mb-2">Finding Best Carriers</h3>
          <p className="text-muted-foreground">Matching your shipment with available drivers...</p>
        </CardContent>
      </Card>
    );
  }

  if (currentStep === 'selection' && carriers.length > 0) {
    const recommendations = carriers.slice(0, 3);
    const alternatives = carriers.slice(3);

    const getRecommendationStyles = (index: number) => {
      switch (index) {
        case 0:
          return {
            border: "border-2 border-amber-400 dark:border-amber-500/60 shadow-lg shadow-amber-100/30 dark:shadow-none",
            bg: "bg-gradient-to-br from-amber-50/90 via-orange-50/40 to-yellow-50/60 dark:from-amber-950/35 dark:via-orange-950/15 dark:to-yellow-950/25",
            badge: "bg-gradient-to-r from-amber-500 to-yellow-500 text-white font-bold",
            badgeText: "⭐ 1st MATCH - RECOMMENDED",
            avatar: "bg-gradient-to-br from-amber-500 to-yellow-500 text-white border-amber-200"
          };
        case 1:
          return {
            border: "border-2 border-slate-300 dark:border-slate-600 shadow-md",
            bg: "bg-gradient-to-br from-slate-50/90 via-zinc-50/40 to-slate-100/50 dark:from-slate-900/30 dark:via-zinc-900/10 dark:to-slate-950/20",
            badge: "bg-gradient-to-r from-slate-400 to-slate-500 text-white font-bold",
            badgeText: "🥈 2nd MATCH",
            avatar: "bg-gradient-to-br from-slate-400 to-slate-500 text-white border-slate-200"
          };
        case 2:
          return {
            border: "border-2 border-orange-300 dark:border-orange-700/60 shadow-md",
            bg: "bg-gradient-to-br from-orange-50/80 via-amber-50/30 to-orange-100/40 dark:from-orange-950/25 dark:via-amber-950/10 dark:to-orange-950/15",
            badge: "bg-gradient-to-r from-orange-400 to-amber-600 text-white font-bold",
            badgeText: "🥉 3rd MATCH",
            avatar: "bg-gradient-to-br from-orange-400 to-amber-600 text-white border-orange-200"
          };
        default:
          return {
            border: "border border-border",
            bg: "bg-card",
            badge: "bg-secondary text-secondary-foreground",
            badgeText: "MATCH",
            avatar: "bg-secondary text-foreground border-border"
          };
      }
    };

    return (
      <Card className="border-primary/20 shadow-xl overflow-hidden backdrop-blur-sm bg-white/95 dark:bg-black/95">
        <CardHeader className="pb-4 border-b border-primary/10 bg-gradient-to-r from-primary/5 via-transparent to-primary/5">
          <CardTitle className="text-2xl font-bold flex items-center gap-2">
            🤖 AI Dispatch Assistant
          </CardTitle>
          <p className="text-muted-foreground text-sm">
            Smart carrier recommendations optimized for your cargo weight, Delhi traffic patterns, and driver experience.
          </p>
        </CardHeader>
        
        <CardContent className="p-6 space-y-6">
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
              ✨ Top Recommended Carriers
            </h3>
            
            <div className="grid gap-6">
              {recommendations.map((carrier, index) => {
                const styles = getRecommendationStyles(index);
                const scorePct = Math.round((carrier.score || 0) * 100);
                const rating = carrier.average_rating || 5.0;
                
                return (
                  <div 
                    key={carrier.user_id}
                    className={`relative overflow-hidden rounded-2xl transition-all duration-300 hover:scale-[1.01] hover:shadow-xl ${styles.border} ${styles.bg}`}
                  >
                    {/* Recommendation Badge */}
                    <div className="absolute top-0 right-0">
                      <div className={`${styles.badge} px-4 py-1.5 rounded-bl-xl text-xs uppercase tracking-wider shadow-sm`}>
                        {styles.badgeText}
                      </div>
                    </div>
                    
                    <div className="p-6 pt-8">
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="flex items-start gap-4">
                          {/* Driver Icon */}
                          <div className={`w-16 h-16 rounded-full flex items-center justify-center font-bold text-xl border-2 shadow-inner shrink-0 ${styles.avatar}`}>
                            {carrier.business_name?.charAt(0) || 'C'}
                          </div>
                          
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <h4 className="text-lg font-bold text-foreground">
                                {carrier.business_name || 'Professional Carrier'}
                              </h4>
                              <Badge className="bg-primary/10 text-primary hover:bg-primary/20 border-none font-semibold text-xs">
                                {scorePct}% Match
                              </Badge>
                            </div>
                            
                            <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                              <div className="flex items-center gap-1 text-sm font-medium text-yellow-600 dark:text-yellow-400">
                                <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                                <span>{rating.toFixed(1)}</span>
                              </div>
                              <span className="text-xs text-muted-foreground">•</span>
                              <span className="text-sm text-muted-foreground">{carrier.years_experience || 1} years exp</span>
                              <span className="text-xs text-muted-foreground">•</span>
                              <Badge variant="outline" className="text-[10px] py-0 border-primary/20 bg-background/50">
                                🚛 {carrier.vehicle_type || 'Commercial Van'}
                              </Badge>
                            </div>
                            
                            <p className="text-xs text-muted-foreground mt-1.5">
                              📱 {carrier.phone || 'Contact via dashboard'}
                            </p>
                          </div>
                        </div>

                        {/* Price Details */}
                        <div className="text-left md:text-right border-t md:border-t-0 pt-3 md:pt-0 flex md:flex-col justify-between items-center md:items-end">
                          <span className="text-xs text-muted-foreground uppercase tracking-wider block">Estimated Price</span>
                          <div className="text-3xl font-extrabold text-primary">
                            ₹{carrier.calculatedCost?.toLocaleString() || '1,200'}
                          </div>
                          {carrier.baseMultiplier && carrier.baseMultiplier !== 1.0 && (
                            <span className={`text-xs font-semibold ${carrier.baseMultiplier < 1 ? 'text-green-600 dark:text-green-400' : 'text-orange-600 dark:text-orange-400'}`}>
                              {carrier.baseMultiplier < 1 ? 'Save' : 'Premium'} {Math.round(Math.abs(1 - carrier.baseMultiplier) * 100)}% Applied
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Score Breakdown Progress Bars */}
                      {carrier.breakdown && (
                        <div className="mt-4 space-y-2.5 bg-white/50 dark:bg-black/25 p-3 rounded-xl border border-primary/5">
                          <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                            📊 Matching Factors Score Breakdown
                          </div>
                          <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                            <div className="space-y-1">
                              <div className="flex justify-between text-[10px] text-muted-foreground font-medium">
                                <span>Proximity (35%)</span>
                                <span>{Math.round(carrier.breakdown.proximity * 100)}%</span>
                              </div>
                              <div className="w-full bg-muted rounded-full h-1 overflow-hidden">
                                <div 
                                  className="bg-blue-500 h-1 rounded-full transition-all duration-500" 
                                  style={{ width: `${Math.round(carrier.breakdown.proximity * 100)}%` }}
                                />
                              </div>
                            </div>

                            <div className="space-y-1">
                              <div className="flex justify-between text-[10px] text-muted-foreground font-medium">
                                <span>Capacity (25%)</span>
                                <span>{Math.round(carrier.breakdown.capacity * 100)}%</span>
                              </div>
                              <div className="w-full bg-muted rounded-full h-1 overflow-hidden">
                                <div 
                                  className="bg-emerald-500 h-1 rounded-full transition-all duration-500" 
                                  style={{ width: `${Math.round(carrier.breakdown.capacity * 100)}%` }}
                                />
                              </div>
                            </div>

                            <div className="space-y-1">
                              <div className="flex justify-between text-[10px] text-muted-foreground font-medium">
                                <span>Reputation (20%)</span>
                                <span>{Math.round(carrier.breakdown.reputation * 100)}%</span>
                              </div>
                              <div className="w-full bg-muted rounded-full h-1 overflow-hidden">
                                <div 
                                  className="bg-amber-500 h-1 rounded-full transition-all duration-500" 
                                  style={{ width: `${Math.round(carrier.breakdown.reputation * 100)}%` }}
                                />
                              </div>
                            </div>

                            <div className="space-y-1">
                              <div className="flex justify-between text-[10px] text-muted-foreground font-medium">
                                <span>Reliability (20%)</span>
                                <span>{Math.round(carrier.breakdown.reliability * 100)}%</span>
                              </div>
                              <div className="w-full bg-muted rounded-full h-1 overflow-hidden">
                                <div 
                                  className="bg-indigo-500 h-1 rounded-full transition-all duration-500" 
                                  style={{ width: `${Math.round(carrier.breakdown.reliability * 100)}%` }}
                                />
                              </div>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* AI Reasoning Panel */}
                      <div className="mt-5 p-4 rounded-xl bg-white/75 dark:bg-black/45 border border-primary/10">
                        <div className="flex items-center gap-2 mb-2 text-xs font-semibold text-primary">
                          <span>🤖</span>
                          <span>Dispatch Factors:</span>
                        </div>
                        <ul className="grid gap-1.5">
                          {(carrier.whyRecommended || []).map((reason, i) => (
                            <li key={i} className="text-xs text-muted-foreground flex items-start gap-1.5">
                              <span className="text-primary mt-0.5">•</span>
                              <span>{reason}</span>
                            </li>
                          ))}
                        </ul>
                      </div>

                      {/* Selection Action Button */}
                      <div className="mt-5">
                        <Button 
                          onClick={() => selectCarrier(carrier)}
                          className="w-full font-bold shadow-md transition-all duration-300 hover:shadow-lg hover:scale-[1.01]"
                          variant={index === 0 ? "default" : "outline"}
                          size="lg"
                        >
                          Select {carrier.business_name || 'Carrier'}
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Alternatives Accordion/Collapsible */}
          {alternatives.length > 0 && (
            <div className="pt-4 border-t border-primary/10 space-y-3">
              <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                Other Available Carriers ({alternatives.length})
              </h4>
              <div className="grid gap-3">
                {alternatives.map((carrier, index) => (
                  <div 
                    key={carrier.user_id}
                    onClick={() => selectCarrier(carrier)}
                    className="flex items-center justify-between p-4 rounded-xl border border-border bg-card/50 hover:bg-card hover:border-primary/40 transition-all duration-200 cursor-pointer group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center text-sm font-bold text-secondary-foreground">
                        {carrier.business_name?.charAt(0) || 'C'}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h5 className="font-semibold text-sm group-hover:text-primary transition-colors">
                            {carrier.business_name}
                          </h5>
                          <span className="text-xs text-muted-foreground">•</span>
                          <span className="text-xs text-yellow-600 dark:text-yellow-400 font-medium">
                            ⭐ {(carrier.average_rating || 5.0).toFixed(1)}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {carrier.vehicle_type} • {carrier.distance?.toFixed(1)}km away
                        </p>
                      </div>
                    </div>
                    
                    <div className="text-right">
                      <div className="font-bold text-sm text-foreground">
                        ₹{carrier.calculatedCost?.toLocaleString()}
                      </div>
                      <span className="text-[10px] text-muted-foreground">
                        {Math.round((carrier.score || 0) * 100)}% match
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  const handlePaymentSuccess = async (shipment: any) => {
    setShipmentId(shipment.id);
    setCurrentStep('tracking');
    toast({
      title: "Payment Successful! 🎉",
      description: "Your shipment has been created and carrier assigned.",
    });

    try {
      // 1. Log Shipment Created Event
      await logShipmentEvent(
        shipment.id,
        'created',
        'Shipment Created',
        `Shipper created shipment order of ${shipment.capacity_kg || 0} kg.`,
        {
          origin: shipment.origin,
          destination: shipment.destination,
          weight_kg: shipment.capacity_kg
        }
      );

      // 2. Log AI Match Recommendations Event
      if (carriers && carriers.length > 0) {
        const recommendations = carriers.slice(0, 5).map(c => ({
          carrier_name: c.business_name || c.company_name || 'Carrier',
          score: c.assignmentScore || c.score || 0,
          reason: c.whyRecommended && c.whyRecommended.length > 0 
            ? c.whyRecommended[0] 
            : `${c.years_experience || 1} years experience, ${c.vehicle_type}`
        }));
        
        await logShipmentEvent(
          shipment.id,
          'recommended',
          'AI Match Recommendations Calculated',
          `AI Dispatch Assistant evaluated available carriers and suggested ${carriers[0]?.business_name || 'best matches'}.`,
          { recommendations }
        );
      }

      // 3. Log Carrier Assigned Event
      if (selectedCarrier) {
        // Calculate price
        const weightCost = (shipment.capacity_kg || 0) * 10;
        const originLat = origin?.lat || 28.6304;
        const originLng = origin?.lng || 77.2177;
        const destLat = destination?.lat || 28.6304;
        const destLng = destination?.lng || 77.2177;
        const distanceKm = calculateDistance(originLat, originLng, destLat, destLng);
        const distanceCost = distanceKm * 5;
        const totalAmount = Math.round(weightCost + distanceCost);

        await logShipmentEvent(
          shipment.id,
          'assigned',
          'Carrier Assigned',
          `${selectedCarrier.business_name} was selected and assigned.`,
          {
            carrier_id: selectedCarrier.user_id,
            carrier_name: selectedCarrier.business_name,
            final_cost: selectedCarrier.calculatedCost || totalAmount
          }
        );
      }
    } catch (err) {
      console.error("Failed to log shipment creation events:", err);
    }
  };

  const handlePaymentFailure = () => {
    toast({
      title: "Payment Failed",
      description: "Please try again or select a different carrier.",
      variant: "destructive",
    });
    setCurrentStep('selection');
  };

  if (currentStep === 'payment' && selectedCarrier && origin && destination) {
    // Calculate distance for payment
    const distanceKm = calculateDistance(origin.lat!, origin.lng!, destination.lat!, destination.lng!);
    
    // Prepare shipment data for payment
    const shipmentData = {
      origin: origin.address ?? `${origin.lat},${origin.lng}`,
      destination: destination.address ?? `${destination.lat},${destination.lng}`,
      origin_lat: origin.lat,
      origin_lng: origin.lng,
      origin_address: origin.address,
      destination_lat: destination.lat,
      destination_lng: destination.lng,
      destination_address: destination.address,
      shipper_id: userId,
      capacity_kg: capacityKg === "" ? null : Number(capacityKg),
      pickup_time: pickup || null,
      dropoff_time: dropoff || null,
      carrier_id: selectedCarrier.user_id,
    };

    return (
      <div className="space-y-6">
        {/* Selected Carrier Info */}
        <Card className="border-primary/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Payment & Confirmation
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="bg-green-50 dark:bg-green-950/30 p-4 rounded-lg">
              <h4 className="font-semibold text-green-700 dark:text-green-300 mb-2">Selected Carrier</h4>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center text-white font-bold">
                  {selectedCarrier.business_name?.charAt(0) || 'C'}
                </div>
                <div>
                  <p className="font-medium">{selectedCarrier.business_name}</p>
                  <p className="text-sm text-muted-foreground">{selectedCarrier.vehicle_type} • {selectedCarrier.phone}</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Razorpay Payment Component */}
        <RazorpayPayment
          shipmentData={shipmentData}
          distanceKm={distanceKm}
          onPaymentSuccess={handlePaymentSuccess}
          onPaymentFailure={handlePaymentFailure}
        />
      </div>
    );
  }

  if (currentStep === 'tracking' && selectedCarrier) {
    return (
      <Card className="border-primary/20 shadow-xl">
        <CardHeader className="bg-gradient-to-r from-green-50 to-blue-50 dark:from-green-950/30 dark:to-blue-950/30">
          <CardTitle className="flex items-center gap-2 text-green-700 dark:text-green-300">
            <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
              <span className="text-white text-sm">✓</span>
            </div>
            Shipment Confirmed & Live Tracking
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6 space-y-6">
          {/* Carrier Details */}
          <div className="bg-gradient-to-r from-white via-green-50/30 to-blue-50/30 dark:from-gray-800/60 dark:via-green-950/20 dark:to-blue-950/20 rounded-xl p-5 border border-green-200/50 dark:border-green-800/30">
            <h4 className="font-bold text-lg mb-4 text-green-700 dark:text-green-300">Your Assigned Carrier</h4>
            <div className="flex items-center gap-4 mb-4">
              <div className="relative">
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary via-primary/90 to-primary/80 flex items-center justify-center text-white font-bold text-xl border-4 border-white shadow-lg">
                  {selectedCarrier.business_name?.charAt(0) || 'C'}
                </div>
                <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-green-500 rounded-full border-2 border-white flex items-center justify-center animate-pulse">
                  <div className="w-2 h-2 bg-white rounded-full"></div>
                </div>
              </div>
              <div className="flex-1">
                <h5 className="text-xl font-bold">{selectedCarrier.business_name}</h5>
                <p className="text-muted-foreground">{selectedCarrier.vehicle_type} • {selectedCarrier.phone}</p>
                <div className="flex items-center gap-2 mt-1">
                  <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                  <span className="font-medium">{(selectedCarrier.score! * 5).toFixed(1)} Rating</span>
                  <Badge variant="outline" className="ml-2 bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300">
                    Live
                  </Badge>
                </div>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="bg-white/60 dark:bg-gray-800/60 rounded-lg p-3">
                <span className="text-muted-foreground">Distance:</span>
                <div className="font-semibold text-lg">{selectedCarrier.distance?.toFixed(1)} km</div>
              </div>
              <div className="bg-white/60 dark:bg-gray-800/60 rounded-lg p-3">
                <span className="text-muted-foreground">ETA:</span>
                <div className="font-semibold text-lg text-green-600">{calculateETA(selectedCarrier.distance!)} min</div>
              </div>
            </div>
          </div>

          {/* Live Map Placeholder */}
          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 rounded-xl p-6 border border-blue-200/50 dark:border-blue-800/30 min-h-[200px] flex items-center justify-center">
            <div className="text-center">
              <div className="w-16 h-16 bg-blue-500 rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse">
                <span className="text-white text-2xl">🚛</span>
              </div>
              <h4 className="font-semibold text-blue-700 dark:text-blue-300 mb-2">Live Tracking Active</h4>
              <p className="text-blue-600 dark:text-blue-400 text-sm mb-3">
                Your carrier is on the way to pickup location
              </p>
              <div className="text-xs text-blue-500">
                📍 Real-time GPS tracking • 📱 SMS updates • 🔔 Push notifications
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="grid grid-cols-2 gap-3">
            <Button variant="outline" className="h-12">
              📞 Call Carrier
            </Button>
            <Button onClick={finishFlow} className="h-12 bg-green-600 hover:bg-green-700">
              View Full Tracking
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Default form view
  return (
    <Card className="border-primary/20">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Truck className="h-5 w-5" />
          Create New Shipment
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={create} className="space-y-6">
          {/* Location Selection */}
          <LocationPicker
            origin={origin}
            destination={destination}
            onOriginChange={setOrigin}
            onDestinationChange={setDestination}
          />

          {/* Time Selection */}
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="pickup" className="flex items-center gap-2 text-lg font-semibold">
                <Clock className="h-5 w-5" />
                Pickup Time
              </Label>
              <Input 
                id="pickup" 
                type="datetime-local" 
                value={pickup} 
                onChange={(e) => setPickup(e.target.value)}
                className="text-base"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="dropoff" className="flex items-center gap-2 text-lg font-semibold">
                <Clock className="h-5 w-5" />
                Drop-off Time
              </Label>
              <Input 
                id="dropoff" 
                type="datetime-local" 
                value={dropoff} 
                onChange={(e) => setDropoff(e.target.value)}
                className="text-base"
              />
            </div>
          </div>

          {/* Capacity */}
          <div className="space-y-2">
            <Label htmlFor="capacity" className="text-lg font-semibold">Package Weight (kg)</Label>
            <Input 
              id="capacity" 
              type="number" 
              min={0} 
              placeholder="Enter weight in kg"
              value={capacityKg} 
              onChange={(e) => setCapacityKg(e.target.value === "" ? "" : Number(e.target.value))}
              className="text-base"
            />
          </div>

          <Button type="submit" className="w-full" size="lg">
            Create Shipment & Find Carriers
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};

export default ShipmentForm;
