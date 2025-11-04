import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// Import clustering algorithm (inline copy for edge function compatibility)
const clusterShipments = (shipments: any[], opts: any = {}) => {
  const { maxPoolSize = 3, minPairScore = 0.45 } = opts;
  const remaining = new Set(shipments.map((s) => s.id));
  const byId = new Map(shipments.map((s) => [s.id, s] as const));
  const pools: any[] = [];

  for (const s of shipments) {
    if (!remaining.has(s.id)) continue;
    remaining.delete(s.id);

    const poolMembers: any[] = [s];

    while (poolMembers.length < maxPoolSize) {
      let bestId: string | null = null;
      let bestScore = 0;
      for (const id of remaining) {
        const cand = byId.get(id)!;
        const sum = poolMembers.reduce((acc, p) => acc + scoreShipmentPair(p, cand, opts), 0);
        const avg = sum / poolMembers.length;
        if (avg > bestScore) {
          bestScore = avg;
          bestId = id;
        }
      }
      if (bestId && bestScore >= minPairScore) {
        poolMembers.push(byId.get(bestId)!);
        remaining.delete(bestId);
      } else {
        break;
      }
    }

    pools.push(makePool(poolMembers));
  }

  return pools;
};

const scoreShipmentPair = (a: any, b: any, opts: any = {}) => {
  const { pickupJoinDistanceKm = 6, wPickupProximity = 0.4, wRouteSimilarity = 0.35, wTimeOverlap = 0.15, wDropProximity = 0.1 } = opts;
  
  const dPickup = haversineKm(a.pickup, b.pickup);
  const pickupScore = clamp01(1 - dPickup / pickupJoinDistanceKm);
  
  const bearA = initialBearingDeg(a.pickup, a.drop);
  const bearB = initialBearingDeg(b.pickup, b.drop);
  const diff = angleDiffDeg(bearA, bearB);
  const routeSim = clamp01(1 - diff / 180);
  
  const dDrop = haversineKm(a.drop, b.drop);
  const dropScore = clamp01(1 - dDrop / (pickupJoinDistanceKm * 2));
  
  const timeScore = 1; // Simplified for edge function
  
  return clamp01(wPickupProximity * pickupScore + wRouteSimilarity * routeSim + wTimeOverlap * timeScore + wDropProximity * dropScore);
};

const initialBearingDeg = (from: any, to: any): number => {
  const φ1 = toRad(from.lat);
  const φ2 = toRad(to.lat);
  const λ1 = toRad(from.lng);
  const λ2 = toRad(to.lng);
  const y = Math.sin(λ2 - λ1) * Math.cos(φ2);
  const x = Math.cos(φ1) * Math.sin(φ2) - Math.sin(φ1) * Math.cos(φ2) * Math.cos(λ2 - λ1);
  const θ = Math.atan2(y, x);
  return (toDeg(θ) + 360) % 360;
};

const angleDiffDeg = (a: number, b: number): number => {
  return Math.abs(((a - b + 540) % 360) - 180);
};

const toDeg = (r: number) => (r * 180) / Math.PI;

const mean = (ns: number[]) => (ns.length ? ns.reduce((a, b) => a + b, 0) / ns.length : 0);

const makePool = (shipments: any[]): any => {
  const totalWeight = shipments.reduce((a, s) => a + (s.weight ?? 0), 0);
  const pickupCentroid = {
    lat: mean(shipments.map((s) => s.pickup.lat)),
    lng: mean(shipments.map((s) => s.pickup.lng)),
  };
  const dropCentroid = {
    lat: mean(shipments.map((s) => s.drop.lat)),
    lng: mean(shipments.map((s) => s.drop.lng)),
  };
  const bearings = shipments.map((s) => initialBearingDeg(s.pickup, s.drop));
  const x = mean(bearings.map((b) => Math.cos(toRad(b))));
  const y = mean(bearings.map((b) => Math.sin(toRad(b))));
  const bearingDeg = (Math.atan2(y, x) * 180) / Math.PI;

  return {
    id: shipments.map((s) => s.id).join("+"),
    shipments,
    totalWeight,
    pickupCentroid,
    dropCentroid,
    bearingDeg: (bearingDeg + 360) % 360,
  };
};

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Matching algorithm utilities (copied from matching.ts)
type LatLng = { lat: number; lng: number };

type Shipment = {
  id: string;
  pickup: LatLng;
  drop: LatLng;
  weight?: number;
};

type Carrier = {
  id: string;
  currentLocation: LatLng;
  capacityWeight?: number;
  serviceRadiusKm?: number;
};

const toRad = (d: number) => (d * Math.PI) / 180;

const haversineKm = (a: LatLng, b: LatLng): number => {
  const R = 6371; // km
  const dLat = toRad(b.lat - a.lat);
  const dLon = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const sinDLat = Math.sin(dLat / 2);
  const sinDLon = Math.sin(dLon / 2);
  const h = sinDLat * sinDLat + Math.cos(lat1) * Math.cos(lat2) * sinDLon * sinDLon;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
};

const clamp01 = (v: number) => Math.max(0, Math.min(1, v));

const scoreCarrierForShipment = (carrier: Carrier, shipment: Shipment) => {
  const maxDistanceKm = 25; // Maximum reasonable distance for assignment
  const distance = haversineKm(carrier.currentLocation, shipment.pickup);
  
  // Distance score (closer is better)
  const distanceScore = clamp01(1 - distance / maxDistanceKm);
  
  // Capacity score (can handle the weight)
  let capacityScore = 1;
  if (carrier.capacityWeight && shipment.weight) {
    capacityScore = carrier.capacityWeight >= shipment.weight ? 1 : 0;
  }
  
  // Service radius score
  let radiusScore = 1;
  if (carrier.serviceRadiusKm) {
    radiusScore = distance <= carrier.serviceRadiusKm ? 1 : 0;
  }
  
  // Combined score
  const score = (distanceScore * 0.6 + capacityScore * 0.3 + radiusScore * 0.1);
  
  return {
    score,
    distance,
    reasons: [
      `distance: ${distance.toFixed(1)}km`,
      `capacity: ${capacityScore === 1 ? 'OK' : 'overweight'}`,
      `radius: ${radiusScore === 1 ? 'in-range' : 'out-of-range'}`
    ]
  };
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { shipmentId } = await req.json();
    
    if (!shipmentId) {
      return new Response(
        JSON.stringify({ error: 'Shipment ID is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Starting auto-assignment for shipment: ${shipmentId}`);

    // Get the shipment details
    const { data: shipment, error: shipmentError } = await supabase
      .from('shipments')
      .select('id, origin_lat, origin_lng, destination_lat, destination_lng, capacity_kg, carrier_id')
      .eq('id', shipmentId)
      .single();

    if (shipmentError || !shipment) {
      console.error('Shipment not found:', shipmentError);
      return new Response(
        JSON.stringify({ error: 'Shipment not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Skip if already assigned
    if (shipment.carrier_id) {
      console.log('Shipment already assigned to carrier:', shipment.carrier_id);
      return new Response(
        JSON.stringify({ message: 'Shipment already assigned', carrierId: shipment.carrier_id }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // STEP 1: Get all pending shipments for pooling analysis
    const { data: allShipments, error: shipmentsError } = await supabase
      .from('shipments')
      .select('id, origin_lat, origin_lng, destination_lat, destination_lng, capacity_kg, pickup_time, dropoff_time')
      .eq('status', 'pending')
      .limit(50);

    if (shipmentsError) {
      console.error('Error fetching shipments for pooling:', shipmentsError);
    }

    // STEP 2: Advanced Pooling Analysis
    let poolAnalysis = null;
    if (allShipments && allShipments.length >= 2) {
      console.log(`Running pooling analysis on ${allShipments.length} shipments`);
      
      const algoShipments = allShipments.map(s => ({
        id: s.id,
        pickup: { lat: s.origin_lat, lng: s.origin_lng },
        drop: { lat: s.destination_lat, lng: s.destination_lng },
        weight: s.capacity_kg || 0,
        readyAt: s.pickup_time,
        dueBy: s.dropoff_time
      }));

      // Use advanced clustering algorithm
      const pools = clusterShipments(algoShipments, {
        maxPoolSize: 4,
        pickupJoinDistanceKm: 8,
        minPairScore: 0.4,
        wPickupProximity: 0.4,
        wRouteSimilarity: 0.35,
        wTimeOverlap: 0.15,
        wDropProximity: 0.1
      });

      // Find the pool containing our shipment
      const relevantPool = pools.find(pool => 
        pool.shipments.some(s => s.id === shipmentId)
      );

      if (relevantPool && relevantPool.shipments.length > 1) {
        poolAnalysis = relevantPool;
        console.log(`Shipment pooled with ${relevantPool.shipments.length - 1} other shipments`);
      }
    }

    // STEP 3: Get available carriers from database and enhance with mock operational data
    const { data: realCarriers, error: carriersError } = await supabase
      .from('carrier_profiles')
      .select('user_id, business_name, years_experience, vehicle_capacity_kg')
      .limit(10);

    if (carriersError) {
      console.error('Error fetching carriers:', carriersError);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch carriers' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Enhance real carriers with mock operational data for simulation
    const enhancedCarriers = (realCarriers || []).map((carrier, index) => {
      const mockLocations = [
        { lat: 28.6448, lng: 77.2167 }, // Connaught Place
        { lat: 28.7041, lng: 77.1025 }, // Rohini
        { lat: 28.5355, lng: 77.3910 }, // Noida
        { lat: 28.6517, lng: 77.2219 }, // Khan Market
      ];
      
      return {
        user_id: carrier.user_id,
        business_name: carrier.business_name || `Carrier ${index + 1}`,
        years_experience: carrier.years_experience || (5 + index * 2),
        vehicle_capacity_kg: carrier.vehicle_capacity_kg || (300 + index * 200),
        current_load_kg: Math.floor(Math.random() * 200), // Random current load
        current_location: mockLocations[index % mockLocations.length],
        is_available: true,
        last_delivery_time: Date.now() - Math.random() * 5 * 60 * 60 * 1000, // Random 0-5 hours ago
        service_radius_km: 25 + index * 5
      };
    });

    console.log(`Evaluating ${enhancedCarriers.length} available carriers`);

    // STEP 4: Enhanced scoring with burden and availability factors
    let bestCarrier = null;
    let bestScore = 0;
    let bestReasons: string[] = [];

    const targetShipment = poolAnalysis ? {
      id: poolAnalysis.id,
      pickup: poolAnalysis.pickupCentroid,
      drop: poolAnalysis.dropCentroid,
      weight: poolAnalysis.totalWeight
    } : {
      id: shipment.id,
      pickup: { lat: shipment.origin_lat, lng: shipment.origin_lng },
      drop: { lat: shipment.destination_lat, lng: shipment.destination_lng },
      weight: shipment.capacity_kg || 0
    };

    for (const carrier of enhancedCarriers) {
      if (!carrier.is_available) continue;

      // Enhanced scoring algorithm
      const distance = haversineKm(carrier.current_location, targetShipment.pickup);
      const distanceScore = clamp01(1 - distance / 25); // 25km max

      // Capacity utilization score (prefer carriers with available capacity)
      const utilizationRatio = carrier.current_load_kg / carrier.vehicle_capacity_kg;
      const capacityAvailable = carrier.vehicle_capacity_kg - carrier.current_load_kg;
      const capacityScore = capacityAvailable >= targetShipment.weight ? 
        clamp01(1 - utilizationRatio) : 0; // Penalize overutilization

      // Availability/freshness score (prefer recently active carriers)
      const timeSinceLastDelivery = Date.now() - carrier.last_delivery_time;
      const hoursIdle = timeSinceLastDelivery / (60 * 60 * 1000);
      const availabilityScore = clamp01(1 - hoursIdle / 24); // Prefer active carriers

      // Service radius score
      const radiusScore = distance <= carrier.service_radius_km ? 1 : 0;

      // Experience score
      const experienceScore = clamp01(carrier.years_experience / 15);

      // Combined weighted score
      const combinedScore = 
        distanceScore * 0.3 +
        capacityScore * 0.25 +
        availabilityScore * 0.2 +
        radiusScore * 0.15 +
        experienceScore * 0.1;

      const reasons = [
        `${distance.toFixed(1)}km away`,
        `${Math.round((1 - utilizationRatio) * 100)}% capacity available`,
        `${hoursIdle.toFixed(1)}h since last delivery`,
        `${carrier.years_experience}y experience`,
        radiusScore === 1 ? 'in service area' : 'outside service area'
      ];

      console.log(`${carrier.business_name}: score=${combinedScore.toFixed(3)}, reasons=[${reasons.join(', ')}]`);

      if (combinedScore > bestScore && combinedScore > 0.4) { // Higher threshold
        bestCarrier = carrier;
        bestScore = combinedScore;
        bestReasons = reasons;
      }
    }

    if (!bestCarrier) {
      console.log('No suitable carrier found');
      return new Response(
        JSON.stringify({ message: 'No suitable carrier found for assignment' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Best carrier found: ${bestCarrier.user_id} with score ${bestScore.toFixed(2)}`);

    // Assign the carrier to the shipment
    const { error: updateError } = await supabase
      .from('shipments')
      .update({ 
        carrier_id: bestCarrier.user_id,
        status: 'assigned'
      })
      .eq('id', shipmentId);

    if (updateError) {
      console.error('Failed to assign carrier:', updateError);
      return new Response(
        JSON.stringify({ error: 'Failed to assign carrier' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Successfully assigned carrier ${bestCarrier.user_id} to shipment ${shipmentId}`);

    return new Response(
      JSON.stringify({ 
        message: 'Carrier assigned successfully', 
        carrierId: bestCarrier.user_id,
        score: bestScore,
        reasons: bestReasons
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Auto-assignment error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});