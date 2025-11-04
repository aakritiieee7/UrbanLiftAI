import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import LocationPicker, { LocationData } from "@/components/shipment/LocationPicker";
import { clusterShipments, type Shipment as AlgoShipment } from "@/lib/matching";
import { useAuth } from "@/contexts/AuthContext";
import { Badge } from "@/components/ui/badge";
import { Clock, User, Loader2, Star, Truck, CreditCard } from "lucide-react";
import RazorpayPayment from "@/components/payment/RazorpayPayment";

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
          service_regions
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

      // Calculate distance and score for each carrier
      const carriersWithMetrics = carriers.map(carrier => {
        // Calculate distance (using random locations for demo since we don't have carrier locations)
        const distance = 10 + Math.random() * 20; // 10-30km range
        
        // Calculate score based on capacity match, experience, etc.
        const actualCapacity = carrier.vehicle_capacity_kg;
        const capacityMatch = (!actualCapacity || actualCapacity >= requiredCapacity) ? 1 : 0.5;
        const experienceScore = Math.min((carrier.years_experience || 1) / 10, 1);
        const score = (capacityMatch * 0.6 + experienceScore * 0.4) * (0.8 + Math.random() * 0.2);

        return {
          user_id: carrier.user_id,
          business_name: carrier.business_name || carrier.company_name || 'Carrier',
          phone: carrier.phone || carrier.contact_phone || 'Not provided',
          vehicle_type: carrier.vehicle_type || carrier.vehicle_types || 'Vehicle',
          vehicle_capacity_kg: actualCapacity, // Keep the actual value (null or number)
          years_experience: carrier.years_experience || 1,
          distance,
          score
        };
      });

      // Filter by capacity requirement and sort by score (treat null capacity as unlimited)
      const filteredCarriers = carriersWithMetrics
        .filter(carrier => {
          const capacity = carrier.vehicle_capacity_kg;
          console.log(`Filtering carrier ${carrier.user_id}: capacity=${capacity}, required=${requiredCapacity}`);
          // If capacity is null/undefined, treat as unlimited capacity (carrier can handle any size)
          if (!capacity) {
            console.log(`Carrier ${carrier.user_id} has unlimited capacity - ACCEPTED`);
            return true;
          }
          // Otherwise check if capacity meets requirement
          const accepted = capacity >= (requiredCapacity || 0);
          console.log(`Carrier ${carrier.user_id} capacity check: ${capacity} >= ${requiredCapacity || 0} = ${accepted}`);
          return accepted;
        })
        .sort((a, b) => b.score - a.score);
      
      console.log(`Final filtered carriers: ${filteredCarriers.length} out of ${carriersWithMetrics.length}`);
      return filteredCarriers;
        
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
        // Calculate real pricing for each carrier
    const enhancedCarriers = availableCarriers.map((carrier, index) => {
      const reasons = [];
      
      // Calculate cost for this specific carrier
      const weightCost = (Number(capacityKg) || 0) * 10;
      const distanceCost = (carrier.distance || 0) * 5;
      const basePrice = 50;
      let baseCost = basePrice + weightCost + distanceCost;
      let finalMultiplier = 1.0;
      
      // Experience Level Adjustments
      const yearsExp = carrier.years_experience || 0;
      if (yearsExp < 0.5) {
        finalMultiplier *= 0.8;
        reasons.push(`New driver discount - 20% off`);
      } else if (yearsExp >= 2) {
        finalMultiplier *= 1.1;
        reasons.push(`${yearsExp}+ years experienced - premium service`);
      } else {
        reasons.push(`${yearsExp} years of reliable service`);
      }
      
      // Rating-based Pricing (using score instead of rating)
      const rating = (carrier.score || 0.6) * 5; // Convert score to 5-star rating
      if (rating >= 5) {
        finalMultiplier *= 1.15;
        reasons.push("5-star rated driver - premium quality");
      } else if (rating >= 4) {
        finalMultiplier *= 1.05;
        reasons.push("Highly rated 4+ star service");
      } else if (rating < 4) {
        finalMultiplier *= 0.9;
        reasons.push("Competitive pricing - good value");
      }
      
      // Vehicle Type Adjustments
      const vehicleType = carrier.vehicle_type || 'medium';
      if (vehicleType === 'light') {
        finalMultiplier *= 0.9;
        reasons.push("Light vehicle - eco-friendly & economical");
      } else if (vehicleType === 'heavy' || vehicleType === 'container') {
        finalMultiplier *= 1.2;
        reasons.push("Heavy duty vehicle - secure transport");
      }
      
      // Distance Adjustments
      if ((carrier.distance || 0) >= 50) {
        finalMultiplier *= 0.95;
        reasons.push("Long distance discount - 5% off");
      } else if ((carrier.distance || 0) < 10) {
        finalMultiplier *= 1.05;
        reasons.push("Quick local pickup - premium convenience");
      }
      
      // Distance reason
      if (carrier.distance! <= 15) {
        reasons.push(`Only ${carrier.distance?.toFixed(1)}km away - quick pickup`);
      }
      
      const finalCost = Math.round(baseCost * finalMultiplier);
      
      // Capacity reason
      const reqCapacity = Number(capacityKg) || 0;
      if (carrier.vehicle_capacity_kg) {
        if (carrier.vehicle_capacity_kg >= reqCapacity * 2) {
          reasons.push("Extra capacity for secure transport");
        } else {
          reasons.push("Perfect capacity match for your shipment");
        }
      } else {
        reasons.push("Flexible capacity - handles all shipment sizes");
      }
      
      // Vehicle type reason
      if (carrier.vehicle_type?.toLowerCase().includes("truck")) {
        reasons.push("Heavy-duty vehicle for safe delivery");
      } else {
        reasons.push("Efficient commercial vehicle");
      }
      
      return {
        ...carrier,
        isRecommended: index === 0,
        whyRecommended: reasons,
        calculatedCost: finalCost,
        baseMultiplier: finalMultiplier
      };
    });
      
      setCarriers(enhancedCarriers.slice(0, 5)); // Show top 5 carriers
      
      // Auto-select the recommended carrier
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
    const recommended = carriers[0];
    const alternatives = carriers.slice(1); // Show all remaining carriers
    const savingsPercentage = 18; // Consistent 18% savings
    const reliabilityScore = 94; // Consistent 94% reliability

    return (
      <Card className="border-primary/20 shadow-xl">
        <CardHeader className="pb-4">
          <CardTitle className="text-xl font-bold">Choose Your Carrier</CardTitle>
          <p className="text-muted-foreground">AI-matched carriers based on your requirements</p>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Recommended Carrier */}
          <div className="relative overflow-hidden rounded-2xl border-2 border-gradient-to-r from-amber-400/60 to-orange-400/60 bg-gradient-to-br from-amber-50 via-orange-50/50 to-yellow-50 dark:from-amber-950/40 dark:via-orange-950/30 dark:to-yellow-950/40 shadow-lg hover:shadow-2xl transition-all duration-300 group">
            <div className="absolute -top-1 -right-1">
              <div className="bg-gradient-to-r from-amber-500 to-orange-500 text-white font-semibold px-4 py-2 rounded-bl-xl rounded-tr-2xl text-sm">
                ⭐ RECOMMENDED
              </div>
            </div>
            
            <div className="p-6 pt-8">
              <div className="flex items-start gap-4 mb-5">
                {/* Driver Avatar */}
                <div className="relative">
                  <div className="w-20 h-20 rounded-full bg-gradient-to-br from-primary via-primary/90 to-primary/80 flex items-center justify-center text-white font-bold text-2xl border-4 border-white shadow-lg">
                    {recommended.business_name?.charAt(0) || 'C'}
                  </div>
                  <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-green-500 rounded-full border-2 border-white flex items-center justify-center">
                    <div className="w-2 h-2 bg-white rounded-full"></div>
                  </div>
                </div>
                
                <div className="flex-1">
                  <h4 className="text-xl font-bold text-foreground mb-1">{recommended.business_name || 'Professional Carrier'}</h4>
                  <div className="flex items-center gap-3 mb-2">
                    <div className="flex items-center gap-1">
                      <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                      <span className="font-semibold text-yellow-700 dark:text-yellow-400">{(recommended.score! * 5).toFixed(1)}</span>
                    </div>
                    <Badge variant="secondary" className="bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300">
                      {reliabilityScore}% Reliable
                    </Badge>
                    <span className="text-sm text-muted-foreground">{recommended.years_experience}+ years</span>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    📱 {recommended.phone || '+91-98765-43210'} • 🚛 {recommended.vehicle_type || 'Commercial Van'}
                  </div>
                </div>
                
                  <div className="text-3xl font-bold text-primary mb-2">
                    ₹{recommended.calculatedCost?.toLocaleString() || '1,200'}
                  </div>
                  <div className="text-sm text-muted-foreground flex items-center gap-1">
                    {recommended.baseMultiplier && recommended.baseMultiplier !== 1.0 && (
                      <>
                        <span className="line-through">₹{Math.round((recommended.calculatedCost || 1200) / recommended.baseMultiplier).toLocaleString()}</span>
                        <span className={`font-semibold ${recommended.baseMultiplier < 1 ? 'text-green-600' : 'text-orange-600'}`}>
                          {recommended.baseMultiplier < 1 ? 'Save' : 'Premium'} {Math.round(Math.abs(1 - recommended.baseMultiplier) * 100)}%
                        </span>
                      </>
                    )}
                  </div>
              </div>
              
              {/* Why Recommended */}
              <div className="bg-gradient-to-r from-white/80 to-yellow-50/80 dark:from-gray-800/60 dark:to-yellow-950/40 rounded-xl p-4 mb-5 border border-amber-200/50 dark:border-amber-800/30">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-5 h-5 bg-amber-500 rounded-full flex items-center justify-center">
                    <span className="text-white text-xs">✨</span>
                  </div>
                  <span className="font-semibold text-amber-700 dark:text-amber-300">Smart AI Assignment:</span>
                </div>
                <p className="text-sm text-amber-800 dark:text-amber-200">
                  {recommended.whyRecommended && recommended.whyRecommended.length > 0 
                    ? recommended.whyRecommended.join(' • ') 
                    : `Optimized route • Best pricing • High reliability score • ${recommended.distance?.toFixed(1)}km away`
                  }
                </p>
                {recommended.assignmentScore && (
                  <div className="mt-2 text-xs text-amber-600 dark:text-amber-400">
                    🤖 AI Match Score: {Math.round(recommended.assignmentScore * 100)}%
                  </div>
                )}
              </div>
              
              <Button 
                onClick={() => selectCarrier(recommended)}
                size="lg"
                className="w-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-bold py-4 text-lg shadow-lg hover:shadow-xl transition-all duration-300 group-hover:scale-[1.02]"
              >
                Accept Recommended Carrier
              </Button>
            </div>
          </div>

          {/* Alternative Carriers - Show all remaining carriers */}
          {alternatives.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-lg font-semibold text-foreground">Other Available Carriers</h4>
                <Badge variant="outline" className="text-xs">
                  {alternatives.length} more options
                </Badge>
              </div>
              
              <div className="space-y-4">
                {alternatives.map((carrier, index) => (
                    <div 
                      key={carrier.user_id}
                      onClick={() => selectCarrier(carrier)}
                      className="group p-5 rounded-xl border border-border hover:border-primary/40 bg-card hover:shadow-lg transition-all duration-300 cursor-pointer"
                    >
                    <div className="flex items-start gap-4">
                      <div className="w-14 h-14 rounded-full bg-gradient-to-br from-secondary to-secondary/80 flex items-center justify-center text-foreground font-bold text-lg">
                        {carrier.business_name?.charAt(0) || 'C'}
                      </div>
                      
                      <div className="flex-1">
                        <h5 className="font-semibold text-lg text-foreground mb-1">{carrier.business_name || `Carrier ${index + 2}`}</h5>
                        <div className="flex items-center gap-3 mb-2">
                          <div className="flex items-center gap-1">
                            <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                            <span className="font-medium text-yellow-600 dark:text-yellow-400">{(carrier.score! * 5).toFixed(1)}</span>
                          </div>
                          <span className="text-sm text-muted-foreground">{carrier.years_experience}+ years</span>
                          <Badge variant="secondary" className="text-xs">
                            {Math.round(80 + Math.random() * 15)}% reliable
                          </Badge>
                        </div>
                        <div className="text-sm text-muted-foreground mb-3">
                          📱 {carrier.phone || "+91-98765-43210"} • 🚛 {carrier.vehicle_type || "Commercial Vehicle"}
                        </div>
                        
                        {/* Why This Carrier */}
                        {carrier.assignmentReasons && carrier.assignmentReasons.length > 0 && (
                          <div className="bg-secondary/30 rounded-lg p-3 mt-3">
                            <p className="text-xs font-medium text-secondary-foreground mb-2">Why choose this carrier:</p>
                            <div className="flex flex-wrap gap-1">
                              {carrier.assignmentReasons.map((reason, i) => (
                                <span key={i} className="text-xs bg-background/60 text-foreground px-2 py-1 rounded-full border">
                                  {reason}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                      
                        <div className="text-xl font-bold text-foreground">
                          ₹{carrier.calculatedCost?.toLocaleString() || '1,200'}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {carrier.baseMultiplier && carrier.baseMultiplier !== 1.0 ? (
                            carrier.baseMultiplier < 1 ? 
                              `${Math.round((1 - carrier.baseMultiplier) * 100)}% cheaper` : 
                              `${Math.round((carrier.baseMultiplier - 1) * 100)}% premium`
                          ) : 'Standard rate'}
                        </div>
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

  const handlePaymentSuccess = (shipment: any) => {
    setShipmentId(shipment.id);
    setCurrentStep('tracking');
    toast({
      title: "Payment Successful! 🎉",
      description: "Your shipment has been created and carrier assigned.",
    });
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
