import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

interface LatLng {
  lat: number;
  lng: number;
}

interface Shipment {
  id: string;
  pickup: LatLng;
  drop: LatLng;
  weight?: number;
  priority?: 'high' | 'medium' | 'low';
}

interface Pool {
  id: string;
  shipments: Shipment[];
  totalWeight: number;
  pickupCentroid: LatLng;
  dropCentroid: LatLng;
  estimatedDistance: number;
  estimatedTime: number;
}

// Haversine distance calculation
function haversineDistance(point1: LatLng, point2: LatLng): number {
  const R = 6371; // Earth's radius in km
  const dLat = toRad(point2.lat - point1.lat);
  const dLon = toRad(point2.lng - point1.lng);
  const lat1 = toRad(point1.lat);
  const lat2 = toRad(point2.lat);
  
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
           Math.cos(lat1) * Math.cos(lat2) *
           Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  
  return R * c;
}

function toRad(deg: number): number {
  return deg * (Math.PI / 180);
}

// Calculate bearing between two points
function calculateBearing(from: LatLng, to: LatLng): number {
  const φ1 = toRad(from.lat);
  const φ2 = toRad(to.lat);
  const λ1 = toRad(from.lng);
  const λ2 = toRad(to.lng);
  const y = Math.sin(λ2 - λ1) * Math.cos(φ2);
  const x = Math.cos(φ1) * Math.sin(φ2) - Math.sin(φ1) * Math.cos(φ2) * Math.cos(λ2 - λ1);
  const θ = Math.atan2(y, x);
  return (θ * 180 / Math.PI + 360) % 360;
}

// Score shipment compatibility for pooling
function scoreShipmentPair(shipment1: Shipment, shipment2: Shipment): number {
  const pickupDistance = haversineDistance(shipment1.pickup, shipment2.pickup);
  const dropDistance = haversineDistance(shipment1.drop, shipment2.drop);
  
  // Calculate route similarity
  const bearing1 = calculateBearing(shipment1.pickup, shipment1.drop);
  const bearing2 = calculateBearing(shipment2.pickup, shipment2.drop);
  const bearingDiff = Math.abs(bearing1 - bearing2);
  const routeSimilarity = 1 - (Math.min(bearingDiff, 360 - bearingDiff) / 180);
  
  // Scoring weights
  const proximityScore = Math.max(0, 1 - pickupDistance / 10); // 10km threshold
  const dropProximityScore = Math.max(0, 1 - dropDistance / 15); // 15km threshold
  
  // Combined score
  return (proximityScore * 0.4 + routeSimilarity * 0.4 + dropProximityScore * 0.2);
}

// Simple clustering algorithm for shipment pooling
function clusterShipments(shipments: Shipment[], maxPoolSize: number = 4): Pool[] {
  const pools: Pool[] = [];
  const used = new Set<string>();
  
  for (const shipment of shipments) {
    if (used.has(shipment.id)) continue;
    
    const pool: Shipment[] = [shipment];
    used.add(shipment.id);
    
    // Find compatible shipments
    while (pool.length < maxPoolSize) {
      let bestMatch: Shipment | null = null;
      let bestScore = 0.3; // Minimum compatibility threshold
      
      for (const candidate of shipments) {
        if (used.has(candidate.id)) continue;
        
        // Calculate average compatibility with pool
        const scores = pool.map(poolShipment => scoreShipmentPair(poolShipment, candidate));
        const avgScore = scores.reduce((sum, score) => sum + score, 0) / scores.length;
        
        if (avgScore > bestScore) {
          bestScore = avgScore;
          bestMatch = candidate;
        }
      }
      
      if (bestMatch) {
        pool.push(bestMatch);
        used.add(bestMatch.id);
      } else {
        break;
      }
    }
    
    // Calculate pool metrics
    const totalWeight = pool.reduce((sum, s) => sum + (s.weight || 0), 0);
    const pickupCentroid: LatLng = {
      lat: pool.reduce((sum, s) => sum + s.pickup.lat, 0) / pool.length,
      lng: pool.reduce((sum, s) => sum + s.pickup.lng, 0) / pool.length
    };
    const dropCentroid: LatLng = {
      lat: pool.reduce((sum, s) => sum + s.drop.lat, 0) / pool.length,
      lng: pool.reduce((sum, s) => sum + s.drop.lng, 0) / pool.length
    };
    
    // Estimate route distance and time
    const estimatedDistance = pool.reduce((total, shipment) => {
      return total + haversineDistance(shipment.pickup, shipment.drop);
    }, 0);
    
    const estimatedTime = estimatedDistance / 35 * 60; // Assuming 35 km/h average speed
    
    pools.push({
      id: `pool_${pools.length + 1}`,
      shipments: pool,
      totalWeight,
      pickupCentroid,
      dropCentroid,
      estimatedDistance: Math.round(estimatedDistance * 100) / 100,
      estimatedTime: Math.round(estimatedTime)
    });
  }
  
  return pools;
}

// Optimize route order within a pool
function optimizeRouteOrder(pool: Pool): LatLng[] {
  const route: LatLng[] = [];
  
  // Simple nearest neighbor algorithm
  // Start from pickup centroid
  route.push(pool.pickupCentroid);
  
  // Visit all pickups first (in order of proximity)
  const pickups = [...pool.shipments.map(s => s.pickup)];
  const remainingPickups = [...pickups];
  let currentPoint = pool.pickupCentroid;
  
  while (remainingPickups.length > 0) {
    let nearestIndex = 0;
    let nearestDistance = haversineDistance(currentPoint, remainingPickups[0]);
    
    for (let i = 1; i < remainingPickups.length; i++) {
      const distance = haversineDistance(currentPoint, remainingPickups[i]);
      if (distance < nearestDistance) {
        nearestDistance = distance;
        nearestIndex = i;
      }
    }
    
    const nearestPickup = remainingPickups.splice(nearestIndex, 1)[0];
    route.push(nearestPickup);
    currentPoint = nearestPickup;
  }
  
  // Then visit all deliveries
  const deliveries = [...pool.shipments.map(s => s.drop)];
  const remainingDeliveries = [...deliveries];
  
  while (remainingDeliveries.length > 0) {
    let nearestIndex = 0;
    let nearestDistance = haversineDistance(currentPoint, remainingDeliveries[0]);
    
    for (let i = 1; i < remainingDeliveries.length; i++) {
      const distance = haversineDistance(currentPoint, remainingDeliveries[i]);
      if (distance < nearestDistance) {
        nearestDistance = distance;
        nearestIndex = i;
      }
    }
    
    const nearestDelivery = remainingDeliveries.splice(nearestIndex, 1)[0];
    route.push(nearestDelivery);
    currentPoint = nearestDelivery;
  }
  
  return route;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: { 'Access-Control-Allow-Origin': '*' } });
  }

  try {
    const { shipments, options = {} } = await req.json();
    
    if (!shipments || !Array.isArray(shipments)) {
      return new Response(
        JSON.stringify({ error: 'Invalid shipments data' }),
        { status: 400, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } }
      );
    }

    // Validate shipments format
    const validShipments: Shipment[] = shipments.filter(s => 
      s.id && 
      s.pickup && typeof s.pickup.lat === 'number' && typeof s.pickup.lng === 'number' &&
      s.drop && typeof s.drop.lat === 'number' && typeof s.drop.lng === 'number'
    );

    if (validShipments.length === 0) {
      return new Response(
        JSON.stringify({ error: 'No valid shipments found' }),
        { status: 400, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } }
      );
    }

    // Perform shipment pooling
    const maxPoolSize = options.maxPoolSize || 4;
    const pools = clusterShipments(validShipments, maxPoolSize);
    
    // Generate optimized routes for each pool
    const optimizedPools = pools.map(pool => ({
      ...pool,
      optimizedRoute: optimizeRouteOrder(pool),
      efficiency: Math.round((pool.shipments.length / Math.max(1, pool.estimatedTime / 60)) * 100) / 100
    }));

    // Calculate summary statistics
    const totalShipments = validShipments.length;
    const totalPools = pools.length;
    const totalDistance = pools.reduce((sum, pool) => sum + pool.estimatedDistance, 0);
    const totalTime = pools.reduce((sum, pool) => sum + pool.estimatedTime, 0);
    const avgEfficiency = pools.reduce((sum, pool) => sum + (pool.shipments.length / Math.max(1, pool.estimatedTime / 60)), 0) / pools.length;

    const result = {
      success: true,
      summary: {
        totalShipments,
        totalPools,
        totalDistance: Math.round(totalDistance * 100) / 100,
        totalTimeMinutes: Math.round(totalTime),
        averageShipmentsPerPool: Math.round((totalShipments / totalPools) * 100) / 100,
        efficiencyScore: Math.round(avgEfficiency * 100) / 100
      },
      pools: optimizedPools,
      metadata: {
        generatedAt: new Date().toISOString(),
        algorithm: 'Greedy Clustering + Nearest Neighbor',
        maxPoolSize
      }
    };

    return new Response(
      JSON.stringify(result),
      { 
        status: 200, 
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        } 
      }
    );

  } catch (error) {
    console.error('Route optimization error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error.message }),
      { 
        status: 500, 
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        } 
      }
    );
  }
})