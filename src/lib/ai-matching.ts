// Enhanced AI-powered matching with Delhi transport optimization
import { pipeline } from '@huggingface/transformers';
import { haversineKm, initialBearingDeg, type LatLng, type Shipment, type Carrier, type Pool, type Match, type MatchOptions } from './matching';

// Delhi-specific types
export type DelhiRoadData = {
  roadId: string;
  maxWeight: number; // kg
  maxHeight: number; // meters
  roadType: 'highway' | 'arterial' | 'local' | 'industrial';
  trafficPattern: 'high' | 'medium' | 'low';
  industrialAccess: boolean;
};

export type TrafficPrediction = {
  roadId: string;
  timestamp: number;
  trafficScore: number; // 0-1 (0 = free flow, 1 = heavy congestion)
  predictedTravelTime: number; // minutes
  confidence: number; // 0-1
};

export type EnhancedShipment = Shipment & {
  vehicleTypeRequired?: 'light' | 'medium' | 'heavy' | 'container';
  industrialArea?: string;
  trafficSensitive?: boolean;
  priority?: 'low' | 'medium' | 'high' | 'urgent';
};

export type EnhancedCarrier = Carrier & {
  vehicleTypes: string[];
  maxWeight: number;
  maxHeight: number;
  preferredRoutes?: string[];
  trafficAdaptive?: boolean;
  currentLoad?: number;
};

export type AIMatchOptions = MatchOptions & {
  useTrafficPrediction?: boolean;
  useSemanticSimilarity?: boolean;
  vehicleTypeWeighting?: number;
  trafficWeighting?: number;
  industrialAccessWeighting?: number;
};

// AI Model Manager
class AIMatchingEngine {
  private embeddingModel: any = null;
  private trafficModel: any = null;
  private initialized = false;

  async initialize() {
    if (this.initialized) return;

    try {
      // Initialize embedding model for semantic similarity
      this.embeddingModel = await pipeline(
        'feature-extraction',
        'mixedbread-ai/mxbai-embed-xsmall-v1',
        { device: 'webgpu' }
      );

      this.initialized = true;
      console.log('AI Matching Engine initialized successfully');
    } catch (error) {
      console.warn('AI models not available, falling back to heuristic matching:', error);
      this.initialized = false;
    }
  }

  // Enhanced semantic similarity scoring using embeddings
  async computeSemanticSimilarity(shipmentA: EnhancedShipment, shipmentB: EnhancedShipment): Promise<number> {
    if (!this.embeddingModel) return 0.5; // fallback to neutral score

    try {
      const textA = `${shipmentA.industrialArea || 'general'} ${shipmentA.vehicleTypeRequired || 'any'} ${shipmentA.priority || 'medium'}`;
      const textB = `${shipmentB.industrialArea || 'general'} ${shipmentB.vehicleTypeRequired || 'any'} ${shipmentB.priority || 'medium'}`;

      const embeddings = await this.embeddingModel([textA, textB], { 
        pooling: 'mean', 
        normalize: true 
      });
      
      const [embA, embB] = embeddings.tolist();
      
      // Compute cosine similarity
      const dotProduct = embA.reduce((sum: number, val: number, i: number) => sum + val * embB[i], 0);
      return Math.max(0, dotProduct); // Ensure positive similarity
    } catch (error) {
      console.warn('Semantic similarity computation failed:', error);
      return 0.5;
    }
  }

  // Enhanced route optimization with traffic prediction
  async optimizeRoute(
    start: LatLng, 
    end: LatLng, 
    vehicleType: string,
    options: { avoidTraffic?: boolean; heavyVehicle?: boolean } = {}
  ): Promise<{
    route: LatLng[];
    estimatedTime: number;
    trafficScore: number;
    suitabilityScore: number;
  }> {
    // Simplified route optimization - in production, integrate with MapMyIndia API
    const distance = haversineKm(start, end);
    const bearing = initialBearingDeg(start, end);
    
    // Generate simplified route points
    const route = this.generateRoutePoints(start, end, 5);
    
    // Traffic prediction (simulated - replace with real traffic data)
    const currentHour = new Date().getHours();
    const trafficScore = this.predictTrafficScore(currentHour, bearing, distance);
    
    // Vehicle suitability scoring
    const suitabilityScore = this.calculateVehicleSuitability(vehicleType, distance, trafficScore);
    
    // Estimated time with traffic adjustment
    const baseTime = distance * 2; // 2 minutes per km base
    const trafficMultiplier = 1 + (trafficScore * 0.8); // Up to 80% increase
    const estimatedTime = baseTime * trafficMultiplier;

    return {
      route,
      estimatedTime,
      trafficScore,
      suitabilityScore
    };
  }

  private generateRoutePoints(start: LatLng, end: LatLng, numPoints: number): LatLng[] {
    const points: LatLng[] = [start];
    
    for (let i = 1; i < numPoints - 1; i++) {
      const ratio = i / (numPoints - 1);
      points.push({
        lat: start.lat + (end.lat - start.lat) * ratio,
        lng: start.lng + (end.lng - start.lng) * ratio
      });
    }
    
    points.push(end);
    return points;
  }

  private predictTrafficScore(hour: number, bearing: number, distance: number): number {
    // Delhi traffic patterns - peak hours: 8-11 AM, 5-8 PM
    let baseTraffic = 0.3;
    
    if ((hour >= 8 && hour <= 11) || (hour >= 17 && hour <= 20)) {
      baseTraffic = 0.8; // Peak hours
    } else if ((hour >= 7 && hour <= 8) || (hour >= 16 && hour <= 17)) {
      baseTraffic = 0.6; // Pre-peak
    } else if (hour >= 22 || hour <= 6) {
      baseTraffic = 0.1; // Night time
    }

    // Adjust for direction (simplified Delhi geography)
    // North-South routes (NH1, Ring Road) typically more congested
    const nsComponent = Math.abs(Math.sin(bearing * Math.PI / 180));
    baseTraffic += nsComponent * 0.2;

    // Distance factor - longer routes more likely to hit traffic
    const distanceFactor = Math.min(distance / 50, 1) * 0.1;
    
    return Math.min(baseTraffic + distanceFactor, 1);
  }

  private calculateVehicleSuitability(vehicleType: string, distance: number, trafficScore: number): number {
    let suitability = 1.0;
    
    // Heavy vehicles less suitable for high traffic areas
    if (vehicleType === 'heavy' || vehicleType === 'container') {
      suitability -= trafficScore * 0.3;
    }
    
    // Long distance preference for larger vehicles
    if (distance > 30 && (vehicleType === 'light')) {
      suitability -= 0.2;
    } else if (distance < 10 && vehicleType === 'heavy') {
      suitability -= 0.1;
    }
    
    return Math.max(0.1, suitability);
  }
}

// Enhanced shipment clustering with AI
export class AIShipmentPooler {
  private aiEngine: AIMatchingEngine;
  
  constructor() {
    this.aiEngine = new AIMatchingEngine();
  }

  async initialize() {
    await this.aiEngine.initialize();
  }

  async enhancedClusterShipments(
    shipments: EnhancedShipment[], 
    carriers: EnhancedCarrier[],
    options: AIMatchOptions = {}
  ): Promise<{ pools: Pool[]; matches: Match[]; aiInsights: any }> {
    await this.initialize();

    const {
      useSemanticSimilarity = true,
      useTrafficPrediction = true,
      vehicleTypeWeighting = 0.3,
      trafficWeighting = 0.2,
      maxPoolSize = 3,
      minPairScore = 0.5
    } = options;

    const pools: Pool[] = [];
    const remaining = new Set(shipments.map(s => s.id));
    const pairScores = new Map<string, number>();

    // Compute enhanced similarity scores for all pairs
    for (let i = 0; i < shipments.length; i++) {
      for (let j = i + 1; j < shipments.length; j++) {
        const shipA = shipments[i];
        const shipB = shipments[j];
        const pairKey = `${shipA.id}-${shipB.id}`;

        let totalScore = 0;
        let weightSum = 0;

        // Geometric proximity (existing logic)
        const geoScore = this.computeGeometricScore(shipA, shipB);
        totalScore += geoScore * 0.4;
        weightSum += 0.4;

        // Vehicle type compatibility
        if (vehicleTypeWeighting > 0) {
          const vehicleScore = this.computeVehicleCompatibility(shipA, shipB);
          totalScore += vehicleScore * vehicleTypeWeighting;
          weightSum += vehicleTypeWeighting;
        }

        // Semantic similarity (AI-powered)
        if (useSemanticSimilarity) {
          const semanticScore = await this.aiEngine.computeSemanticSimilarity(shipA, shipB);
          totalScore += semanticScore * 0.2;
          weightSum += 0.2;
        }

        // Traffic compatibility
        if (useTrafficPrediction && trafficWeighting > 0) {
          const trafficScore = await this.computeTrafficCompatibility(shipA, shipB);
          totalScore += trafficScore * trafficWeighting;
          weightSum += trafficWeighting;
        }

        const finalScore = totalScore / weightSum;
        pairScores.set(pairKey, finalScore);
      }
    }

    // Create pools using enhanced scoring
    for (const shipment of shipments) {
      if (!remaining.has(shipment.id)) continue;
      
      const pool = await this.createOptimalPool(shipment, shipments, remaining, pairScores, maxPoolSize, minPairScore);
      pools.push(pool);
    }

    // Match pools with carriers using enhanced scoring
    const matches = await this.matchPoolsWithCarriers(pools, carriers, options);

    // Generate AI insights
    const aiInsights = {
      totalShipments: shipments.length,
      poolsCreated: pools.length,
      averagePoolSize: pools.reduce((sum, p) => sum + p.shipments.length, 0) / pools.length,
      aiEnhancedMatches: matches.filter(m => m.score > 0.7).length,
      trafficOptimized: useTrafficPrediction,
      semanticSimilarityUsed: useSemanticSimilarity
    };

    return { pools, matches: matches.slice(0, options.topK || 10), aiInsights };
  }

  private computeGeometricScore(shipA: EnhancedShipment, shipB: EnhancedShipment): number {
    const pickupDist = haversineKm(shipA.pickup, shipB.pickup);
    const dropDist = haversineKm(shipA.drop, shipB.drop);
    const bearingA = initialBearingDeg(shipA.pickup, shipA.drop);
    const bearingB = initialBearingDeg(shipB.pickup, shipB.drop);
    
    const bearingDiff = Math.abs(bearingA - bearingB);
    const normalizedBearingDiff = Math.min(bearingDiff, 360 - bearingDiff) / 180;
    
    const proximityScore = Math.exp(-pickupDist / 10) * 0.6 + Math.exp(-dropDist / 15) * 0.4;
    const directionScore = 1 - normalizedBearingDiff;
    
    return (proximityScore + directionScore) / 2;
  }

  private computeVehicleCompatibility(shipA: EnhancedShipment, shipB: EnhancedShipment): number {
    if (!shipA.vehicleTypeRequired || !shipB.vehicleTypeRequired) return 0.8;
    
    const typeCompatibility: Record<string, string[]> = {
      'light': ['light', 'medium'],
      'medium': ['light', 'medium', 'heavy'],
      'heavy': ['medium', 'heavy', 'container'],
      'container': ['container', 'heavy']
    };
    
    const compatibleA = typeCompatibility[shipA.vehicleTypeRequired] || [];
    const compatibleB = typeCompatibility[shipB.vehicleTypeRequired] || [];
    
    const isCompatible = compatibleA.includes(shipB.vehicleTypeRequired!) || 
                        compatibleB.includes(shipA.vehicleTypeRequired!);
    
    return isCompatible ? 1.0 : 0.3;
  }

  private async computeTrafficCompatibility(shipA: EnhancedShipment, shipB: EnhancedShipment): Promise<number> {
    // Simplified traffic compatibility - same time windows and routes benefit from pooling
    const timeOverlap = this.computeTimeOverlap(shipA, shipB);
    const routeAlignment = this.computeRouteAlignment(shipA, shipB);
    
    // Both routes benefit from avoiding traffic at similar times
    return (timeOverlap + routeAlignment) / 2;
  }

  private computeTimeOverlap(shipA: EnhancedShipment, shipB: EnhancedShipment): number {
    // Simplified time overlap calculation
    const aStart = shipA.readyAt ? new Date(shipA.readyAt).getTime() : Date.now();
    const aEnd = shipA.dueBy ? new Date(shipA.dueBy).getTime() : aStart + 24 * 60 * 60 * 1000;
    const bStart = shipB.readyAt ? new Date(shipB.readyAt).getTime() : Date.now();
    const bEnd = shipB.dueBy ? new Date(shipB.dueBy).getTime() : bStart + 24 * 60 * 60 * 1000;
    
    const overlapStart = Math.max(aStart, bStart);
    const overlapEnd = Math.min(aEnd, bEnd);
    
    if (overlapEnd <= overlapStart) return 0;
    
    const overlapDuration = overlapEnd - overlapStart;
    const totalDuration = Math.max(aEnd - aStart, bEnd - bStart);
    
    return Math.min(overlapDuration / totalDuration, 1);
  }

  private computeRouteAlignment(shipA: EnhancedShipment, shipB: EnhancedShipment): number {
    const bearingA = initialBearingDeg(shipA.pickup, shipA.drop);
    const bearingB = initialBearingDeg(shipB.pickup, shipB.drop);
    
    const diff = Math.abs(bearingA - bearingB);
    const normalizedDiff = Math.min(diff, 360 - diff) / 180;
    
    return 1 - normalizedDiff;
  }

  private async createOptimalPool(
    seed: EnhancedShipment,
    allShipments: EnhancedShipment[],
    remaining: Set<string>,
    pairScores: Map<string, number>,
    maxPoolSize: number,
    minPairScore: number
  ): Promise<Pool> {
    const poolMembers = [seed];
    remaining.delete(seed.id);

    while (poolMembers.length < maxPoolSize) {
      let bestCandidate: EnhancedShipment | null = null;
      let bestScore = 0;

      for (const candidate of allShipments) {
        if (!remaining.has(candidate.id)) continue;

        // Calculate average compatibility with all pool members
        let totalScore = 0;
        let scoreCount = 0;

        for (const member of poolMembers) {
          const pairKey = `${member.id}-${candidate.id}`;
          const reverseKey = `${candidate.id}-${member.id}`;
          const score = pairScores.get(pairKey) || pairScores.get(reverseKey) || 0;
          totalScore += score;
          scoreCount++;
        }

        const avgScore = totalScore / scoreCount;
        if (avgScore > bestScore && avgScore >= minPairScore) {
          bestScore = avgScore;
          bestCandidate = candidate;
        }
      }

      if (bestCandidate) {
        poolMembers.push(bestCandidate);
        remaining.delete(bestCandidate.id);
      } else {
        break;
      }
    }

    return this.createPoolFromShipments(poolMembers);
  }

  private createPoolFromShipments(shipments: EnhancedShipment[]): Pool {
    const totalVolume = shipments.reduce((sum, s) => sum + (s.volume || 0), 0);
    const totalWeight = shipments.reduce((sum, s) => sum + (s.weight || 0), 0);
    
    const pickupCentroid = {
      lat: shipments.reduce((sum, s) => sum + s.pickup.lat, 0) / shipments.length,
      lng: shipments.reduce((sum, s) => sum + s.pickup.lng, 0) / shipments.length
    };
    
    const dropCentroid = {
      lat: shipments.reduce((sum, s) => sum + s.drop.lat, 0) / shipments.length,
      lng: shipments.reduce((sum, s) => sum + s.drop.lng, 0) / shipments.length
    };
    
    const bearings = shipments.map(s => initialBearingDeg(s.pickup, s.drop));
    const avgBearing = bearings.reduce((sum, b) => sum + b, 0) / bearings.length;

    return {
      id: shipments.map(s => s.id).join('+'),
      shipments,
      totalVolume,
      totalWeight,
      pickupCentroid,
      dropCentroid,
      bearingDeg: avgBearing
    };
  }

  private async matchPoolsWithCarriers(
    pools: Pool[],
    carriers: EnhancedCarrier[],
    options: AIMatchOptions
  ): Promise<Match[]> {
    const matches: Match[] = [];

    for (const pool of pools) {
      for (const carrier of carriers) {
        const matchScore = await this.scoreCarrierPoolMatch(carrier, pool, options);
        matches.push({
          poolId: pool.id,
          carrierId: carrier.id,
          score: matchScore.score,
          reasons: matchScore.reasons
        });
      }
    }

    return matches.sort((a, b) => b.score - a.score);
  }

  private async scoreCarrierPoolMatch(
    carrier: EnhancedCarrier,
    pool: Pool,
    options: AIMatchOptions
  ): Promise<{ score: number; reasons: string[] }> {
    const reasons: string[] = [];
    let totalScore = 0;
    let weightSum = 0;

    // Distance scoring
    const distance = haversineKm(carrier.currentLocation, pool.pickupCentroid);
    const distanceScore = Math.exp(-distance / 20);
    totalScore += distanceScore * 0.3;
    weightSum += 0.3;
    reasons.push(`Distance: ${distance.toFixed(1)}km`);

    // Capacity scoring
    const capacityScore = this.scoreCapacityFit(carrier, pool);
    totalScore += capacityScore * 0.25;
    weightSum += 0.25;
    reasons.push(`Capacity fit: ${(capacityScore * 100).toFixed(0)}%`);

    // Vehicle type compatibility
    const vehicleScore = this.scoreVehicleTypeMatch(carrier, pool);
    totalScore += vehicleScore * 0.25;
    weightSum += 0.25;
    reasons.push(`Vehicle match: ${(vehicleScore * 100).toFixed(0)}%`);

    // Traffic optimization (if enabled)
    if (options.useTrafficPrediction) {
      const trafficScore = await this.scoreTrafficOptimization(carrier, pool);
      totalScore += trafficScore * 0.2;
      weightSum += 0.2;
      reasons.push(`Traffic optimization: ${(trafficScore * 100).toFixed(0)}%`);
    }

    const finalScore = totalScore / weightSum;
    return { score: Math.min(finalScore, 1), reasons };
  }

  private scoreCapacityFit(carrier: EnhancedCarrier, pool: Pool): number {
    const weightFit = carrier.capacityWeight ? 
      Math.max(0, Math.min(1, (carrier.capacityWeight - (carrier.currentLoad || 0)) / pool.totalWeight)) : 1;
    
    const volumeFit = carrier.capacityVolume ? 
      Math.max(0, Math.min(1, carrier.capacityVolume / pool.totalVolume)) : 1;
    
    return Math.min(weightFit, volumeFit);
  }

  private scoreVehicleTypeMatch(carrier: EnhancedCarrier, pool: Pool): number {
    const requiredTypes = pool.shipments
      .map(s => (s as EnhancedShipment).vehicleTypeRequired)
      .filter(Boolean);
    
    if (requiredTypes.length === 0) return 1;
    
    const compatibilityScores = requiredTypes.map(required => {
      const hasCompatible = carrier.vehicleTypes.some(available => 
        this.isVehicleTypeCompatible(available, required!)
      );
      return hasCompatible ? 1 : 0;
    });
    
    return compatibilityScores.reduce((sum, score) => sum + score, 0) / compatibilityScores.length;
  }

  private isVehicleTypeCompatible(available: string, required: string): boolean {
    const compatibility: Record<string, string[]> = {
      'light': ['light'],
      'medium': ['light', 'medium'],
      'heavy': ['medium', 'heavy'],
      'container': ['heavy', 'container']
    };
    
    return compatibility[available]?.includes(required) || false;
  }

  private async scoreTrafficOptimization(carrier: EnhancedCarrier, pool: Pool): Promise<number> {
    // Simplified traffic scoring - in production, use real traffic data
    const currentHour = new Date().getHours();
    const isPeakHour = (currentHour >= 8 && currentHour <= 11) || (currentHour >= 17 && currentHour <= 20);
    
    // Carriers with traffic adaptive capability score higher during peak hours
    if (carrier.trafficAdaptive && isPeakHour) {
      return 0.9;
    } else if (!isPeakHour) {
      return 0.8; // Good traffic conditions
    } else {
      return 0.4; // Peak hour without adaptive capability
    }
  }
}

// Singleton instance for the AI engine
export const aiMatchingEngine = new AIShipmentPooler();