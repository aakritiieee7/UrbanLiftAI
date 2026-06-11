import { haversineKm, type LatLng } from '../logistics/pooling';

export interface ShipmentInput {
  origin_lat: number;
  origin_lng: number;
  capacity_kg: number; // weight of package
}

export interface CarrierInput {
  user_id: string;
  business_name?: string | null;
  company_name?: string | null;
  phone?: string | null;
  contact_phone?: string | null;
  vehicle_type?: string | null;
  vehicle_types?: string | null;
  vehicle_capacity_kg?: number | null;
  years_experience?: number | null;
  last_known_lat?: number | null;
  last_known_lng?: number | null;
  average_rating?: number | null;
  reliability_score?: number | null;
  acceptance_rate?: number | null;
  completion_rate?: number | null;
  on_time_performance?: number | null;
}

export interface RecommendedCarrier extends CarrierInput {
  distance: number;
  score: number; // 0 to 1
  isRecommended: boolean;
  whyRecommended: string[];
  calculatedCost: number;
  baseMultiplier: number;
  breakdown?: {
    proximity: number;
    capacity: number;
    reputation: number;
    reliability: number;
  };
}

// Haversine distance limit: if carrier is >50km away, they aren't considered
const MAX_DISTANCE_KM = 50;

export const calculateMatchScore = (
  shipment: ShipmentInput,
  carrier: CarrierInput
): {
  score: number;
  reasons: string[];
  distance: number;
  breakdown: {
    proximity: number;
    capacity: number;
    reputation: number;
    reliability: number;
  };
} => {
  const reasons: string[] = [];
  
  // 1. Proximity Score (35%)
  const origin: LatLng = { lat: shipment.origin_lat, lng: shipment.origin_lng };
  
  // Default carrier coordinates if missing (e.g. Connaught Place for fallback)
  const carrierLat = carrier.last_known_lat ?? 28.6304;
  const carrierLng = carrier.last_known_lng ?? 77.2177;
  const carrierLoc: LatLng = { lat: carrierLat, lng: carrierLng };
  
  const distance = haversineKm(origin, carrierLoc);
  
  // S_dist = e^(-d / 15)
  const proximityScore = Math.exp(-distance / 15);
  
  if (distance <= 5) {
    reasons.push(`Exceptionally close: only ${distance.toFixed(1)}km away from pickup`);
  } else if (distance <= 15) {
    reasons.push(`Close proximity: ${distance.toFixed(1)}km away`);
  } else {
    reasons.push(`Located ${distance.toFixed(1)}km away`);
  }

  // 2. Capacity Fit Score (25%)
  const reqCapacity = shipment.capacity_kg || 0;
  const carrierCapacity = carrier.vehicle_capacity_kg ?? 1000; // default 1 ton if null
  
  let capacityScore = 0;
  if (carrierCapacity < reqCapacity) {
    capacityScore = 0; // Exclude! Too small.
    reasons.push(`Exceeded capacity: vehicle holds ${carrierCapacity}kg but shipment is ${reqCapacity}kg`);
  } else {
    // S_cap = 1.0 - (0.4 * (C_c - W_s) / C_c)
    capacityScore = 1.0 - (0.4 * (carrierCapacity - reqCapacity)) / carrierCapacity;
    
    if (carrierCapacity <= reqCapacity * 1.3) {
      reasons.push(`Optimal vehicle sizing: ${carrier.vehicle_type || 'Vehicle'} holds ${carrierCapacity}kg (weight match)`);
    } else {
      reasons.push(`Sufficient space: ${carrier.vehicle_type || 'Vehicle'} holds up to ${carrierCapacity}kg`);
    }
  }

  // 3. Reputation & Experience Score (20%)
  const expYears = carrier.years_experience ?? 1;
  const rating = carrier.average_rating ?? 5.0;
  
  const cappedExp = Math.max(0, Math.min(5, expYears)); // Cap at 5 years
  const normalizedExp = cappedExp / 5;
  const normalizedRating = (rating - 1) / 4; // Map 1-5 to 0-1
  
  const reputationScore = (0.4 * normalizedExp) + (0.6 * normalizedRating);
  
  if (rating >= 4.8) {
    reasons.push(`Top-rated carrier (${rating.toFixed(1)}/5 stars) with outstanding delivery record`);
  } else if (rating >= 4.4) {
    reasons.push(`Highly reliable driver (${rating.toFixed(1)}/5 stars)`);
  } else {
    reasons.push(`Standard service profile (${rating.toFixed(1)}/5 stars)`);
  }

  if (expYears >= 5) {
    reasons.push(`Veteran freight handler (${expYears}+ years experienced)`);
  } else if (expYears >= 2) {
    reasons.push(`Experienced handler (${expYears} years in logistics)`);
  }

  // 4. Carrier Reliability Score (20%)
  const reliabilityRaw = carrier.reliability_score ?? 85;
  const normalizedReliability = reliabilityRaw / 100;
  
  reasons.push(`Logistics reliability score: ${reliabilityRaw}% (Acceptance: ${carrier.acceptance_rate ?? 90}%, Completion: ${carrier.completion_rate ?? 92}%)`);

  // Composite Match Score
  // If capacity is 0 (exceeded), total score is 0
  const compositeScore = capacityScore === 0 
    ? 0 
    : (0.35 * proximityScore) + (0.25 * capacityScore) + (0.20 * reputationScore) + (0.20 * normalizedReliability);
  
  return {
    score: compositeScore,
    reasons,
    distance,
    breakdown: {
      proximity: proximityScore,
      capacity: capacityScore,
      reputation: reputationScore,
      reliability: normalizedReliability
    }
  };
};

export const calculateCarrierPrice = (
  distance: number,
  weight: number,
  carrier: CarrierInput
): { cost: number; multiplier: number; priceReasons: string[] } => {
  const basePrice = 50;
  const distanceRate = 5;
  const weightRate = 10;
  
  const standardCost = basePrice + (distance * distanceRate) + (weight * weightRate);
  let multiplier = 1.0;
  const priceReasons: string[] = [];

  // 1. Experience Level Adjustments
  const yearsExp = carrier.years_experience || 1;
  if (yearsExp < 1) {
    multiplier *= 0.8;
    priceReasons.push(`New driver discount: 20% off standard rates`);
  } else if (yearsExp >= 5) {
    multiplier *= 1.15;
    priceReasons.push(`Premium veteran driver charge (+15%)`);
  } else if (yearsExp >= 2) {
    multiplier *= 1.05;
    priceReasons.push(`Experienced driver standard plus rate (+5%)`);
  }

  // 2. Rating-based Pricing
  const rating = carrier.average_rating || 5.0;
  if (rating >= 4.8) {
    multiplier *= 1.10;
    priceReasons.push(`Top-tier reliability premium (+10%)`);
  } else if (rating < 4.0) {
    multiplier *= 0.90;
    priceReasons.push(`Competitive budget pricing (-10%)`);
  }

  // 3. Vehicle Type Adjustments
  const vehicleType = (carrier.vehicle_type || carrier.vehicle_types || '').toLowerCase();
  if (vehicleType.includes('electric') || vehicleType.includes('3-wheeler') || vehicleType.includes('light')) {
    multiplier *= 0.85;
    priceReasons.push(`Eco-friendly light cargo vehicle discount (-15%)`);
  } else if (vehicleType.includes('heavy') || vehicleType.includes('407') || vehicleType.includes('truck')) {
    multiplier *= 1.25;
    priceReasons.push(`Heavy-duty transport premium (+25%)`);
  }

  // 4. Distance Adjustments
  if (distance >= 30) {
    multiplier *= 0.90;
    priceReasons.push(`Long-distance bulk shipping discount (-10%)`);
  } else if (distance < 5) {
    multiplier *= 1.05;
    priceReasons.push(`Local pickup convenience rate (+5%)`);
  }

  const finalCost = Math.round(standardCost * multiplier);
  return {
    cost: finalCost,
    multiplier,
    priceReasons
  };
};

export const rankAndScoreCarriers = (
  shipment: ShipmentInput,
  carriers: CarrierInput[]
): RecommendedCarrier[] => {
  return carriers
    .map(carrier => {
      const { score, reasons, distance, breakdown } = calculateMatchScore(shipment, carrier);
      const { cost, multiplier, priceReasons } = calculateCarrierPrice(distance, shipment.capacity_kg, carrier);
      
      return {
        ...carrier,
        distance,
        score,
        whyRecommended: [...reasons, ...priceReasons],
        calculatedCost: cost,
        baseMultiplier: multiplier,
        isRecommended: false,
        breakdown
      };
    })
    // Filter out carriers whose vehicle is too small or who are too far
    .filter(c => c.score > 0 && c.distance <= MAX_DISTANCE_KM)
    // Sort by match score descending
    .sort((a, b) => b.score - a.score);
};

export const getTop3Carriers = (
  shipment: ShipmentInput,
  carriers: CarrierInput[]
): RecommendedCarrier[] => {
  const scored = rankAndScoreCarriers(shipment, carriers);
  return scored.slice(0, 3).map((carrier, index) => ({
    ...carrier,
    isRecommended: index === 0
  }));
};
