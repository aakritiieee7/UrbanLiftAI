import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface RouteRequest {
  start: { lat: number; lng: number };
  end: { lat: number; lng: number };
  vehicleType: 'light' | 'medium' | 'heavy' | 'container';
  options?: {
    avoidTraffic?: boolean;
    heavyVehicle?: boolean;
    industrialRoute?: boolean;
  };
}

interface DelhiTrafficData {
  roadSegmentId: string;
  currentSpeed: number;
  averageSpeed: number;
  congestionLevel: number; // 0-1
  timestamp: number;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
    )

    const { start, end, vehicleType, options = {} } = await req.json() as RouteRequest;

    // Validate input
    if (!start?.lat || !start?.lng || !end?.lat || !end?.lng) {
      throw new Error('Invalid start or end coordinates');
    }

    // Calculate basic route metrics
    const distance = calculateHaversineDistance(start, end);
    const bearing = calculateBearing(start, end);
    
    // Delhi-specific route optimization
    const delhiRouteData = await optimizeForDelhi({
      start,
      end,
      distance,
      bearing,
      vehicleType,
      options
    });

    // Generate optimized route points (simplified - in production, use MapMyIndia API)
    const routePoints = generateOptimizedRoute(start, end, delhiRouteData);

    // Predict traffic and travel time
    const trafficPrediction = await predictTrafficConditions(routePoints, vehicleType);

    // Calculate vehicle suitability score
    const suitabilityScore = calculateVehicleSuitability(
      vehicleType,
      distance,
      trafficPrediction.averageTrafficScore,
      options
    );

    // Store route optimization data for ML training
    await storeRouteData(supabase, {
      start,
      end,
      vehicleType,
      distance,
      estimatedTime: trafficPrediction.estimatedTime,
      trafficScore: trafficPrediction.averageTrafficScore,
      suitabilityScore,
      timestamp: Date.now()
    });

    const response = {
      success: true,
      route: {
        points: routePoints,
        distance: distance,
        estimatedTime: trafficPrediction.estimatedTime,
        trafficScore: trafficPrediction.averageTrafficScore,
        suitabilityScore: suitabilityScore,
        vehicleRecommendation: getVehicleRecommendation(distance, trafficPrediction.averageTrafficScore),
        optimizationInsights: delhiRouteData.insights
      }
    };

    return new Response(
      JSON.stringify(response),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    )

  } catch (error) {
    console.error('Route optimization error:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message 
      }),
      { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    )
  }
})

function calculateHaversineDistance(
  start: { lat: number; lng: number },
  end: { lat: number; lng: number }
): number {
  const R = 6371; // Earth's radius in km
  const dLat = toRad(end.lat - start.lat);
  const dLon = toRad(end.lng - start.lng);
  const lat1 = toRad(start.lat);
  const lat2 = toRad(end.lat);
  
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
           Math.cos(lat1) * Math.cos(lat2) *
           Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  
  return R * c;
}

function calculateBearing(
  start: { lat: number; lng: number },
  end: { lat: number; lng: number }
): number {
  const φ1 = toRad(start.lat);
  const φ2 = toRad(end.lat);
  const λ1 = toRad(start.lng);
  const λ2 = toRad(end.lng);
  
  const y = Math.sin(λ2 - λ1) * Math.cos(φ2);
  const x = Math.cos(φ1) * Math.sin(φ2) - Math.sin(φ1) * Math.cos(φ2) * Math.cos(λ2 - λ1);
  
  const θ = Math.atan2(y, x);
  return (toDeg(θ) + 360) % 360;
}

function toRad(deg: number): number {
  return deg * (Math.PI / 180);
}

function toDeg(rad: number): number {
  return rad * (180 / Math.PI);
}

async function optimizeForDelhi(params: {
  start: { lat: number; lng: number };
  end: { lat: number; lng: number };
  distance: number;
  bearing: number;
  vehicleType: string;
  options: any;
}) {
  const { start, end, distance, bearing, vehicleType, options } = params;
  
  // Delhi industrial areas coordinates (simplified)
  const industrialAreas = [
    { name: 'Okhla', center: { lat: 28.5355, lng: 77.2718 }, heavyVehicleAccess: true },
    { name: 'Mayapuri', center: { lat: 28.6458, lng: 77.1500 }, heavyVehicleAccess: true },
    { name: 'Wazirpur', center: { lat: 28.7041, lng: 77.1699 }, heavyVehicleAccess: true },
    { name: 'Narela', center: { lat: 28.8555, lng: 77.1025 }, heavyVehicleAccess: true },
  ];

  // Check if route involves industrial areas
  const nearbyIndustrialAreas = industrialAreas.filter(area => 
    calculateHaversineDistance(start, area.center) < 10 ||
    calculateHaversineDistance(end, area.center) < 10
  );

  // Delhi traffic corridors (major routes)
  const trafficCorridors = [
    { name: 'Ring Road', trafficLevel: 0.8, heavyVehicleRestricted: false },
    { name: 'Outer Ring Road', trafficLevel: 0.7, heavyVehicleRestricted: false },
    { name: 'NH1 (GT Road)', trafficLevel: 0.6, heavyVehicleRestricted: false },
    { name: 'NH8', trafficLevel: 0.5, heavyVehicleRestricted: false },
  ];

  // Route optimization insights
  const insights = [];
  let routeScore = 1.0;

  // Heavy vehicle restrictions
  if (vehicleType === 'heavy' || vehicleType === 'container') {
    const currentHour = new Date().getHours();
    if (currentHour >= 6 && currentHour <= 22) {
      insights.push('Heavy vehicle restrictions may apply during daytime hours');
      routeScore *= 0.8;
    }
  }

  // Industrial area access
  if (nearbyIndustrialAreas.length > 0) {
    insights.push(`Route involves industrial areas: ${nearbyIndustrialAreas.map(a => a.name).join(', ')}`);
    if (vehicleType === 'heavy' || vehicleType === 'container') {
      routeScore *= 1.1; // Bonus for appropriate vehicle type
    }
  }

  // Traffic corridor analysis
  const isNorthSouth = Math.abs(Math.sin(toRad(bearing))) > 0.7;
  if (isNorthSouth) {
    insights.push('Route follows major North-South corridor - expect higher traffic');
    routeScore *= 0.9;
  }

  // Peak hour analysis
  const currentHour = new Date().getHours();
  if ((currentHour >= 8 && currentHour <= 11) || (currentHour >= 17 && currentHour <= 20)) {
    insights.push('Peak traffic hours - consider alternate timing');
    routeScore *= 0.7;
  }

  return {
    score: routeScore,
    insights,
    industrialAreas: nearbyIndustrialAreas,
    recommendedCorridor: trafficCorridors[0] // Simplified
  };
}

function generateOptimizedRoute(
  start: { lat: number; lng: number },
  end: { lat: number; lng: number },
  optimizationData: any
): Array<{ lat: number; lng: number }> {
  const route = [start];
  
  // Generate intermediate points (simplified - in production, use real routing API)
  const numIntermediatePoints = Math.floor(calculateHaversineDistance(start, end) / 10) + 2;
  
  for (let i = 1; i < numIntermediatePoints - 1; i++) {
    const ratio = i / (numIntermediatePoints - 1);
    const lat = start.lat + (end.lat - start.lat) * ratio;
    const lng = start.lng + (end.lng - start.lng) * ratio;
    
    // Add slight deviation for traffic avoidance (simplified)
    const deviation = 0.001 * Math.random() * optimizationData.score;
    route.push({
      lat: lat + deviation,
      lng: lng + deviation
    });
  }
  
  route.push(end);
  return route;
}

async function predictTrafficConditions(
  routePoints: Array<{ lat: number; lng: number }>,
  vehicleType: string
) {
  const currentHour = new Date().getHours();
  const dayOfWeek = new Date().getDay();
  
  // Simplified traffic prediction model
  let baseTrafficScore = 0.3;
  
  // Peak hours
  if ((currentHour >= 8 && currentHour <= 11) || (currentHour >= 17 && currentHour <= 20)) {
    baseTrafficScore = 0.8;
  } else if ((currentHour >= 7 && currentHour <= 8) || (currentHour >= 16 && currentHour <= 17)) {
    baseTrafficScore = 0.6;
  } else if (currentHour >= 22 || currentHour <= 6) {
    baseTrafficScore = 0.1;
  }
  
  // Weekend adjustment
  if (dayOfWeek === 0 || dayOfWeek === 6) {
    baseTrafficScore *= 0.7;
  }
  
  // Distance-based adjustment
  const totalDistance = routePoints.length > 1 ? 
    calculateHaversineDistance(routePoints[0], routePoints[routePoints.length - 1]) : 0;
  const distanceMultiplier = Math.min(totalDistance / 30, 1) * 0.2 + 1;
  
  const finalTrafficScore = Math.min(baseTrafficScore * distanceMultiplier, 1);
  
  // Estimate travel time
  const baseSpeed = vehicleType === 'heavy' || vehicleType === 'container' ? 25 : 35; // km/h
  const trafficReducedSpeed = baseSpeed * (1 - finalTrafficScore * 0.6);
  const estimatedTime = totalDistance / trafficReducedSpeed * 60; // minutes
  
  return {
    averageTrafficScore: finalTrafficScore,
    estimatedTime: Math.round(estimatedTime),
    confidence: 0.8
  };
}

function calculateVehicleSuitability(
  vehicleType: string,
  distance: number,
  trafficScore: number,
  options: any
): number {
  let suitability = 1.0;
  
  // Distance-vehicle type fit
  if (vehicleType === 'light' && distance > 50) {
    suitability *= 0.8; // Light vehicles less suitable for long distances
  } else if ((vehicleType === 'heavy' || vehicleType === 'container') && distance < 10) {
    suitability *= 0.9; // Heavy vehicles less efficient for short distances
  }
  
  // Traffic sensitivity
  if (vehicleType === 'heavy' || vehicleType === 'container') {
    suitability *= (1 - trafficScore * 0.3); // Heavy vehicles more affected by traffic
  }
  
  // Industrial route bonus
  if (options.industrialRoute && (vehicleType === 'heavy' || vehicleType === 'container')) {
    suitability *= 1.2;
  }
  
  return Math.max(0.1, Math.min(1.0, suitability));
}

function getVehicleRecommendation(distance: number, trafficScore: number): string {
  if (distance < 10) {
    return 'light';
  } else if (distance < 30) {
    return trafficScore > 0.7 ? 'medium' : 'heavy';
  } else {
    return distance > 50 ? 'container' : 'heavy';
  }
}

async function storeRouteData(supabase: any, data: any) {
  try {
    const { error } = await supabase
      .from('route_optimization_data')
      .insert([{
        start_lat: data.start.lat,
        start_lng: data.start.lng,
        end_lat: data.end.lat,
        end_lng: data.end.lng,
        vehicle_type: data.vehicleType,
        distance_km: data.distance,
        estimated_time_minutes: data.estimatedTime,
        traffic_score: data.trafficScore,
        suitability_score: data.suitabilityScore,
        created_at: new Date(data.timestamp).toISOString()
      }]);
    
    if (error) {
      console.error('Error storing route data:', error);
    }
  } catch (error) {
    console.error('Failed to store route data:', error);
  }
}