import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface PoolingRequest {
  shipments: Array<{
    id: string;
    pickup: { lat: number; lng: number };
    drop: { lat: number; lng: number };
    volume?: number;
    weight?: number;
    vehicleTypeRequired?: string;
    priority?: string;
    readyAt?: string;
    dueBy?: string;
  }>;
  carriers: Array<{
    id: string;
    currentLocation: { lat: number; lng: number };
    vehicleTypes: string[];
    capacityVolume?: number;
    capacityWeight?: number;
    maxWeight?: number;
    serviceRadiusKm?: number;
  }>;
  options?: {
    maxPoolSize?: number;
    useAI?: boolean;
    prioritizeEfficiency?: boolean;
  };
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

    const { shipments, carriers, options = {} } = await req.json() as PoolingRequest;

    if (!shipments || !carriers || shipments.length === 0 || carriers.length === 0) {
      throw new Error('Invalid shipments or carriers data');
    }

    // Enhanced AI-powered shipment pooling
    const poolingResult = await performAIPooling(shipments, carriers, options);

    // Store pooling analytics for ML training
    await storePoolingData(supabase, {
      totalShipments: shipments.length,
      totalCarriers: carriers.length,
      poolsCreated: poolingResult.pools.length,
      averagePoolSize: poolingResult.pools.reduce((sum, p) => sum + p.shipments.length, 0) / poolingResult.pools.length,
      efficiency: poolingResult.efficiency,
      timestamp: Date.now()
    });

    const response = {
      success: true,
      pools: poolingResult.pools,
      matches: poolingResult.matches,
      analytics: {
        totalShipments: shipments.length,
        poolsCreated: poolingResult.pools.length,
        efficiency: poolingResult.efficiency,
        aiEnhanced: options.useAI !== false,
        recommendations: poolingResult.recommendations
      }
    };

    return new Response(
      JSON.stringify(response),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    )

  } catch (error) {
    console.error('AI Pooling error:', error);
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

async function performAIPooling(shipments: any[], carriers: any[], options: any) {
  const { maxPoolSize = 3, useAI = true, prioritizeEfficiency = true } = options;
  
  // Calculate pairwise compatibility scores
  const pairScores = new Map<string, number>();
  
  for (let i = 0; i < shipments.length; i++) {
    for (let j = i + 1; j < shipments.length; j++) {
      const shipA = shipments[i];
      const shipB = shipments[j];
      const score = await calculateShipmentCompatibility(shipA, shipB, useAI);
      pairScores.set(`${shipA.id}-${shipB.id}`, score);
    }
  }

  // Create optimal pools using enhanced clustering
  const pools = await createOptimalPools(shipments, pairScores, maxPoolSize);
  
  // Match pools with carriers
  const matches = await matchPoolsWithCarriers(pools, carriers, options);
  
  // Calculate efficiency metrics
  const efficiency = calculatePoolingEfficiency(shipments, pools, matches);
  
  // Generate recommendations
  const recommendations = generatePoolingRecommendations(pools, matches, efficiency);

  return {
    pools,
    matches: matches.slice(0, 10), // Top 10 matches
    efficiency,
    recommendations
  };
}

async function calculateShipmentCompatibility(shipA: any, shipB: any, useAI: boolean): Promise<number> {
  let totalScore = 0;
  let weightSum = 0;

  // Geographic proximity scoring
  const pickupDistance = calculateDistance(shipA.pickup, shipB.pickup);
  const dropDistance = calculateDistance(shipA.drop, shipB.drop);
  const proximityScore = Math.exp(-pickupDistance / 8) * 0.7 + Math.exp(-dropDistance / 12) * 0.3;
  totalScore += proximityScore * 0.4;
  weightSum += 0.4;

  // Route similarity scoring
  const bearingA = calculateBearing(shipA.pickup, shipA.drop);
  const bearingB = calculateBearing(shipB.pickup, shipB.drop);
  const bearingDiff = Math.abs(bearingA - bearingB);
  const normalizedBearingDiff = Math.min(bearingDiff, 360 - bearingDiff);
  const routeSimilarity = 1 - (normalizedBearingDiff / 180);
  totalScore += routeSimilarity * 0.3;
  weightSum += 0.3;

  // Time window compatibility
  const timeOverlap = calculateTimeOverlap(shipA, shipB);
  totalScore += timeOverlap * 0.2;
  weightSum += 0.2;

  // Vehicle type compatibility
  const vehicleCompatibility = calculateVehicleCompatibility(shipA, shipB);
  totalScore += vehicleCompatibility * 0.1;
  weightSum += 0.1;

  // AI-enhanced semantic similarity (if enabled)
  if (useAI) {
    const semanticScore = await calculateSemanticSimilarity(shipA, shipB);
    totalScore += semanticScore * 0.1;
    weightSum += 0.1;
  }

  return totalScore / weightSum;
}

function calculateDistance(pointA: { lat: number; lng: number }, pointB: { lat: number; lng: number }): number {
  const R = 6371; // Earth's radius in km
  const dLat = toRad(pointB.lat - pointA.lat);
  const dLon = toRad(pointB.lng - pointA.lng);
  const lat1 = toRad(pointA.lat);
  const lat2 = toRad(pointB.lat);
  
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
           Math.cos(lat1) * Math.cos(lat2) *
           Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  
  return R * c;
}

function calculateBearing(start: { lat: number; lng: number }, end: { lat: number; lng: number }): number {
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

function calculateTimeOverlap(shipA: any, shipB: any): number {
  if (!shipA.readyAt || !shipA.dueBy || !shipB.readyAt || !shipB.dueBy) {
    return 0.8; // Assume flexible if no time constraints
  }

  const aStart = new Date(shipA.readyAt).getTime();
  const aEnd = new Date(shipA.dueBy).getTime();
  const bStart = new Date(shipB.readyAt).getTime();
  const bEnd = new Date(shipB.dueBy).getTime();

  const overlapStart = Math.max(aStart, bStart);
  const overlapEnd = Math.min(aEnd, bEnd);

  if (overlapEnd <= overlapStart) return 0;

  const overlapDuration = overlapEnd - overlapStart;
  const totalDuration = Math.max(aEnd - aStart, bEnd - bStart);

  return Math.min(overlapDuration / totalDuration, 1);
}

function calculateVehicleCompatibility(shipA: any, shipB: any): number {
  if (!shipA.vehicleTypeRequired || !shipB.vehicleTypeRequired) return 0.9;

  const compatibility: Record<string, string[]> = {
    'light': ['light', 'medium'],
    'medium': ['light', 'medium', 'heavy'],
    'heavy': ['medium', 'heavy', 'container'],
    'container': ['container', 'heavy']
  };

  const compatibleA = compatibility[shipA.vehicleTypeRequired] || [];
  const compatibleB = compatibility[shipB.vehicleTypeRequired] || [];

  const isCompatible = compatibleA.includes(shipB.vehicleTypeRequired) || 
                      compatibleB.includes(shipA.vehicleTypeRequired);

  return isCompatible ? 1.0 : 0.3;
}

async function calculateSemanticSimilarity(shipA: any, shipB: any): Promise<number> {
  // Simplified semantic similarity - in production, use actual embeddings
  const textA = `${shipA.vehicleTypeRequired || 'any'} ${shipA.priority || 'medium'}`;
  const textB = `${shipB.vehicleTypeRequired || 'any'} ${shipB.priority || 'medium'}`;
  
  // Simple text similarity (fallback)
  const wordsA = textA.toLowerCase().split(' ');
  const wordsB = textB.toLowerCase().split(' ');
  const intersection = wordsA.filter(word => wordsB.includes(word));
  const union = [...new Set([...wordsA, ...wordsB])];
  
  return intersection.length / union.length;
}

async function createOptimalPools(
  shipments: any[],
  pairScores: Map<string, number>,
  maxPoolSize: number
): Promise<any[]> {
  const pools: any[] = [];
  const remaining = new Set(shipments.map(s => s.id));

  for (const seed of shipments) {
    if (!remaining.has(seed.id)) continue;

    const pool = { 
      id: seed.id,
      shipments: [seed],
      totalVolume: seed.volume || 0,
      totalWeight: seed.weight || 0
    };
    remaining.delete(seed.id);

    // Greedily add compatible shipments
    while (pool.shipments.length < maxPoolSize) {
      let bestCandidate: any = null;
      let bestScore = 0;

      for (const candidate of shipments) {
        if (!remaining.has(candidate.id)) continue;

        // Calculate average compatibility with pool members
        let totalScore = 0;
        for (const member of pool.shipments) {
          const pairKey = `${member.id}-${candidate.id}`;
          const reverseKey = `${candidate.id}-${member.id}`;
          const score = pairScores.get(pairKey) || pairScores.get(reverseKey) || 0;
          totalScore += score;
        }
        const avgScore = totalScore / pool.shipments.length;

        if (avgScore > bestScore && avgScore >= 0.5) {
          bestScore = avgScore;
          bestCandidate = candidate;
        }
      }

      if (bestCandidate) {
        pool.shipments.push(bestCandidate);
        pool.totalVolume += bestCandidate.volume || 0;
        pool.totalWeight += bestCandidate.weight || 0;
        remaining.delete(bestCandidate.id);
      } else {
        break;
      }
    }

    // Calculate pool centroid
    const pickup = {
      lat: pool.shipments.reduce((sum: number, s: any) => sum + s.pickup.lat, 0) / pool.shipments.length,
      lng: pool.shipments.reduce((sum: number, s: any) => sum + s.pickup.lng, 0) / pool.shipments.length
    };
    
    const drop = {
      lat: pool.shipments.reduce((sum: number, s: any) => sum + s.drop.lat, 0) / pool.shipments.length,
      lng: pool.shipments.reduce((sum: number, s: any) => sum + s.drop.lng, 0) / pool.shipments.length
    };

    pool.pickupCentroid = pickup;
    pool.dropCentroid = drop;
    pool.id = pool.shipments.map((s: any) => s.id).join('+');

    pools.push(pool);
  }

  return pools;
}

async function matchPoolsWithCarriers(pools: any[], carriers: any[], options: any): Promise<any[]> {
  const matches: any[] = [];

  for (const pool of pools) {
    for (const carrier of carriers) {
      const matchScore = await calculateCarrierPoolMatch(carrier, pool, options);
      matches.push({
        poolId: pool.id,
        carrierId: carrier.id,
        score: matchScore.score,
        reasons: matchScore.reasons,
        estimatedTime: matchScore.estimatedTime
      });
    }
  }

  return matches.sort((a, b) => b.score - a.score);
}

async function calculateCarrierPoolMatch(carrier: any, pool: any, options: any): Promise<any> {
  const reasons: string[] = [];
  let totalScore = 0;
  let weightSum = 0;

  // Distance scoring
  const distance = calculateDistance(carrier.currentLocation, pool.pickupCentroid);
  const distanceScore = Math.exp(-distance / 15);
  totalScore += distanceScore * 0.35;
  weightSum += 0.35;
  reasons.push(`Distance: ${distance.toFixed(1)}km`);

  // Capacity scoring
  const weightFit = carrier.capacityWeight ? 
    Math.max(0, Math.min(1, carrier.capacityWeight / pool.totalWeight)) : 1;
  const volumeFit = carrier.capacityVolume ? 
    Math.max(0, Math.min(1, carrier.capacityVolume / pool.totalVolume)) : 1;
  const capacityScore = Math.min(weightFit, volumeFit);
  totalScore += capacityScore * 0.25;
  weightSum += 0.25;
  reasons.push(`Capacity: ${(capacityScore * 100).toFixed(0)}%`);

  // Vehicle type matching
  const requiredTypes = pool.shipments
    .map((s: any) => s.vehicleTypeRequired)
    .filter(Boolean);
  
  let vehicleScore = 1;
  if (requiredTypes.length > 0) {
    const compatibilityScores = requiredTypes.map((required: string) => {
      return carrier.vehicleTypes.some((available: string) => 
        isVehicleCompatible(available, required)
      ) ? 1 : 0;
    });
    vehicleScore = compatibilityScores.reduce((sum: number, score: number) => sum + score, 0) / compatibilityScores.length;
  }
  totalScore += vehicleScore * 0.25;
  weightSum += 0.25;
  reasons.push(`Vehicle match: ${(vehicleScore * 100).toFixed(0)}%`);

  // Service radius check
  const serviceScore = carrier.serviceRadiusKm ? 
    (distance <= carrier.serviceRadiusKm ? 1 : Math.max(0, 1 - (distance - carrier.serviceRadiusKm) / carrier.serviceRadiusKm)) : 1;
  totalScore += serviceScore * 0.15;
  weightSum += 0.15;
  reasons.push(`Service area: ${(serviceScore * 100).toFixed(0)}%`);

  const finalScore = totalScore / weightSum;
  
  // Estimate pickup time
  const estimatedTime = Math.round(distance * 2.5); // 2.5 minutes per km average

  return {
    score: Math.min(finalScore, 1),
    reasons,
    estimatedTime
  };
}

function isVehicleCompatible(available: string, required: string): boolean {
  const compatibility: Record<string, string[]> = {
    'light': ['light'],
    'medium': ['light', 'medium'],
    'heavy': ['medium', 'heavy'],
    'container': ['heavy', 'container']
  };
  
  return compatibility[available]?.includes(required) || false;
}

function calculatePoolingEfficiency(shipments: any[], pools: any[], matches: any[]): any {
  const totalShipments = shipments.length;
  const totalPools = pools.length;
  const averagePoolSize = totalPools > 0 ? 
    pools.reduce((sum, p) => sum + p.shipments.length, 0) / totalPools : 0;
  
  const consolidationRatio = totalShipments > 0 ? 1 - (totalPools / totalShipments) : 0;
  const matchedPools = new Set(matches.filter(m => m.score > 0.6).map(m => m.poolId)).size;
  const matchingEfficiency = totalPools > 0 ? matchedPools / totalPools : 0;

  return {
    consolidationRatio: Math.round(consolidationRatio * 100),
    averagePoolSize: Math.round(averagePoolSize * 10) / 10,
    matchingEfficiency: Math.round(matchingEfficiency * 100),
    totalSavings: Math.round(consolidationRatio * 30) // Estimated % cost savings
  };
}

function generatePoolingRecommendations(pools: any[], matches: any[], efficiency: any): string[] {
  const recommendations: string[] = [];

  if (efficiency.consolidationRatio < 20) {
    recommendations.push('Consider relaxing pooling constraints to improve consolidation');
  }

  if (efficiency.averagePoolSize < 2) {
    recommendations.push('Increase maximum pool size for better efficiency');
  }

  if (efficiency.matchingEfficiency < 70) {
    recommendations.push('Add more carriers to improve matching options');
  }

  const smallPools = pools.filter(p => p.shipments.length === 1).length;
  if (smallPools > pools.length * 0.5) {
    recommendations.push('Many single-shipment pools - consider broader geographic clustering');
  }

  if (efficiency.totalSavings > 25) {
    recommendations.push('Excellent pooling efficiency achieved!');
  }

  return recommendations;
}

async function storePoolingData(supabase: any, data: any) {
  try {
    const { error } = await supabase
      .from('pooling_analytics')
      .insert([{
        total_shipments: data.totalShipments,
        total_carriers: data.totalCarriers,
        pools_created: data.poolsCreated,
        average_pool_size: data.averagePoolSize,
        efficiency_score: data.efficiency.consolidationRatio,
        created_at: new Date(data.timestamp).toISOString()
      }]);
    
    if (error) {
      console.error('Error storing pooling data:', error);
    }
  } catch (error) {
    console.error('Failed to store pooling data:', error);
  }
}