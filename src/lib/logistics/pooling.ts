// AI Matching utilities for shipment pooling and carrier assignment
// Focus: Pure TypeScript, no external deps. Heuristic scoring with clear hooks for future ML.

export type LatLng = { lat: number; lng: number };

export type TimeWindow = {
  // ISO strings recommended; numbers accepted (ms since epoch)
  readyAt?: string | number; // earliest pickup ready time
  dueBy?: string | number; // latest delivery due time
};

export type Shipment = {
  id: string;
  pickup: LatLng;
  drop: LatLng;
  volume?: number; // cubic meters
  weight?: number; // kilograms
  priority?: number; // 0..1 (1 = highest)
} & TimeWindow;

export type Carrier = {
  id: string;
  currentLocation: LatLng;
  capacityVolume?: number; // cubic meters
  capacityWeight?: number; // kilograms
  serviceRadiusKm?: number; // max radius from currentLocation for pickups
  availableUntil?: string | number; // time they stop accepting new pickups
};

export type Pool = {
  id: string;
  shipments: Shipment[];
  totalVolume: number;
  totalWeight: number;
  pickupCentroid: LatLng;
  dropCentroid: LatLng;
  // Approximate main bearing of pool (avg of shipment bearings)
  bearingDeg: number;
};

export type Match = {
  poolId: string;
  carrierId: string;
  score: number; // 0..1
  reasons: string[]; // human-readable factors
};

export type MatchOptions = {
  // Pooling
  maxPoolSize?: number; // max shipments per pool
  pickupJoinDistanceKm?: number; // join threshold
  minPairScore?: number; // minimum score for two shipments to be grouped

  // Scoring weights for shipment pair
  wPickupProximity?: number;
  wRouteSimilarity?: number;
  wTimeOverlap?: number;
  wDropProximity?: number;

  // Carrier vs Pool
  wCarrierToPickupDist?: number;
  wCapacityFit?: number;
  wServiceRadius?: number;
  wTimeFeasibility?: number;

  // Hard limits
  maxCarrierToPickupKm?: number; // beyond this, score is near 0

  // Result control
  topK?: number;
};

// -------------------- Math helpers --------------------
const toRad = (d: number) => (d * Math.PI) / 180;
const toDeg = (r: number) => (r * 180) / Math.PI;

export const haversineKm = (a: LatLng, b: LatLng): number => {
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

export const initialBearingDeg = (from: LatLng, to: LatLng): number => {
  const φ1 = toRad(from.lat);
  const φ2 = toRad(to.lat);
  const λ1 = toRad(from.lng);
  const λ2 = toRad(to.lng);
  const y = Math.sin(λ2 - λ1) * Math.cos(φ2);
  const x = Math.cos(φ1) * Math.sin(φ2) - Math.sin(φ1) * Math.cos(φ2) * Math.cos(λ2 - λ1);
  const θ = Math.atan2(y, x);
  return (toDeg(θ) + 360) % 360; // 0..360
};

const angleDiffDeg = (a: number, b: number): number => {
  const d = Math.abs(((a - b + 540) % 360) - 180);
  return d; // 0..180
};

const clamp01 = (v: number) => Math.max(0, Math.min(1, v));

const dateNum = (d?: string | number) => (typeof d === "string" ? Date.parse(d) : typeof d === "number" ? d : undefined);

const timeOverlap01 = (a: TimeWindow, b: TimeWindow): number => {
  const aStart = dateNum(a.readyAt);
  const aEnd = dateNum(a.dueBy);
  const bStart = dateNum(b.readyAt);
  const bEnd = dateNum(b.dueBy);
  if (aStart == null || aEnd == null || bStart == null || bEnd == null) return 1; // if missing, assume flexible
  const start = Math.max(aStart, bStart);
  const end = Math.min(aEnd, bEnd);
  if (end <= start) return 0;
  const total = Math.max(aEnd - aStart, bEnd - bStart, 1);
  return clamp01((end - start) / total);
};

// -------------------- Shipment pair scoring --------------------
export const scoreShipmentPair = (a: Shipment, b: Shipment, opts?: MatchOptions): number => {
  const {
    pickupJoinDistanceKm = 6,
    wPickupProximity = 0.4,
    wRouteSimilarity = 0.35,
    wTimeOverlap = 0.15,
    wDropProximity = 0.1,
  } = opts || {};

  const dPickup = haversineKm(a.pickup, b.pickup);
  const pickupScore = clamp01(1 - dPickup / pickupJoinDistanceKm);

  const bearA = initialBearingDeg(a.pickup, a.drop);
  const bearB = initialBearingDeg(b.pickup, b.drop);
  const diff = angleDiffDeg(bearA, bearB);
  const routeSim = clamp01(1 - diff / 180); // 1 when same direction

  const dDrop = haversineKm(a.drop, b.drop);
  const dropScore = clamp01(1 - dDrop / (pickupJoinDistanceKm * 2));

  const timeScore = timeOverlap01(a, b);

  const total =
    wPickupProximity * pickupScore +
    wRouteSimilarity * routeSim +
    wTimeOverlap * timeScore +
    wDropProximity * dropScore;

  return clamp01(total);
};

// -------------------- Pooling --------------------
export const clusterShipments = (shipments: Shipment[], opts?: MatchOptions): Pool[] => {
  const { maxPoolSize = 3, minPairScore = 0.45 } = opts || {};
  const remaining = new Set(shipments.map((s) => s.id));
  const byId = new Map(shipments.map((s) => [s.id, s] as const));
  const pools: Pool[] = [];

  for (const s of shipments) {
    if (!remaining.has(s.id)) continue;
    remaining.delete(s.id);

    const poolMembers: Shipment[] = [s];

    // Greedily add best compatible shipments up to maxPoolSize
    while (poolMembers.length < maxPoolSize) {
      let bestId: string | null = null;
      let bestScore = 0;
      for (const id of remaining) {
        const cand = byId.get(id)!;
        // score relative to current pool: average of pair scores
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

const mean = (ns: number[]) => (ns.length ? ns.reduce((a, b) => a + b, 0) / ns.length : 0);

const makePool = (shipments: Shipment[]): Pool => {
  const totalVolume = shipments.reduce((a, s) => a + (s.volume ?? 0), 0);
  const totalWeight = shipments.reduce((a, s) => a + (s.weight ?? 0), 0);
  const pickupCentroid: LatLng = {
    lat: mean(shipments.map((s) => s.pickup.lat)),
    lng: mean(shipments.map((s) => s.pickup.lng)),
  };
  const dropCentroid: LatLng = {
    lat: mean(shipments.map((s) => s.drop.lat)),
    lng: mean(shipments.map((s) => s.drop.lng)),
  };
  const bearings = shipments.map((s) => initialBearingDeg(s.pickup, s.drop));
  // Average bearing on the circle (use vector mean to avoid wrap issues)
  const x = mean(bearings.map((b) => Math.cos(toRad(b))));
  const y = mean(bearings.map((b) => Math.sin(toRad(b))));
  const bearingDeg = (Math.atan2(y, x) * 180) / Math.PI;

  return {
    id: shipments.map((s) => s.id).join("+"),
    shipments,
    totalVolume,
    totalWeight,
    pickupCentroid,
    dropCentroid,
    bearingDeg: (bearingDeg + 360) % 360,
  };
};

// -------------------- Carrier scoring --------------------
export const scoreCarrierForPool = (carrier: Carrier, pool: Pool, opts?: MatchOptions) => {
  const {
    wCarrierToPickupDist = 0.45,
    wCapacityFit = 0.3,
    wServiceRadius = 0.1,
    wTimeFeasibility = 0.15,
    maxCarrierToPickupKm = 18,
  } = opts || {};

  const reasons: string[] = [];

  const d = haversineKm(carrier.currentLocation, pool.pickupCentroid);
  const distScore = clamp01(1 - d / maxCarrierToPickupKm);
  reasons.push(`distance ${d.toFixed(1)} km`);

  const capV = carrier.capacityVolume ?? Infinity;
  const capW = carrier.capacityWeight ?? Infinity;
  const fitV = capV === Infinity ? 1 : clamp01(1 - Math.max(0, pool.totalVolume - capV) / Math.max(1, capV));
  const fitW = capW === Infinity ? 1 : clamp01(1 - Math.max(0, pool.totalWeight - capW) / Math.max(1, capW));
  const capacityScore = Math.min(fitV, fitW);
  if (capV !== Infinity || capW !== Infinity) reasons.push(`capacity ${(capacityScore * 100).toFixed(0)}%`);

  const serviceRadius = carrier.serviceRadiusKm ?? Infinity;
  const serviceOk = d <= serviceRadius ? 1 : clamp01(1 - (d - serviceRadius) / Math.max(1, serviceRadius));
  reasons.push(`service radius ${serviceRadius === Infinity ? '∞' : serviceRadius + ' km'}`);

  // Time feasibility: if carrier availableUntil before typical pickup time, penalize
  const avail = dateNum(carrier.availableUntil);
  let timeScore = 1;
  if (avail != null) {
    // Approximate pickup window as min readyAt of pool
    const earliestReady = Math.min(
      ...pool.shipments.map((s) => dateNum(s.readyAt) ?? avail - 1)
    );
    timeScore = earliestReady <= avail ? 1 : clamp01(1 - (earliestReady - avail) / (2 * 60 * 60 * 1000)); // 2h grace
    reasons.push(`time ${(timeScore * 100).toFixed(0)}%`);
  }

  const score = clamp01(
    wCarrierToPickupDist * distScore +
      wCapacityFit * capacityScore +
      wServiceRadius * serviceOk +
      wTimeFeasibility * timeScore
  );

  return { score, reasons };
};

// -------------------- End-to-end match --------------------
export const match = (
  shipments: Shipment[],
  carriers: Carrier[],
  opts?: MatchOptions
): { pools: Pool[]; matches: Match[] } => {
  const pools = clusterShipments(shipments, opts);
  const all: Match[] = [];
  for (const pool of pools) {
    const scored = carriers.map((c) => {
      const { score, reasons } = scoreCarrierForPool(c, pool, opts);
      return { poolId: pool.id, carrierId: c.id, score, reasons } as Match;
    });
    scored.sort((a, b) => b.score - a.score);
    const k = opts?.topK ?? 3;
    all.push(...scored.slice(0, k));
  }
  // Sort global matches by score desc
  all.sort((a, b) => b.score - a.score);
  return { pools, matches: all };
};

// -------------------- Example usage --------------------
// (Remove or replace with real data wiring when integrating with Supabase)
// const shipments: Shipment[] = [
//   { id: 'S1', pickup: { lat: 28.6448, lng: 77.2167 }, drop: { lat: 28.5355, lng: 77.391 }, volume: 2 },
//   { id: 'S2', pickup: { lat: 28.65, lng: 77.22 }, drop: { lat: 28.55, lng: 77.39 }, volume: 1.5 },
//   { id: 'S3', pickup: { lat: 28.62, lng: 77.21 }, drop: { lat: 28.6, lng: 77.35 }, volume: 1.2 },
// ];
// const carriers: Carrier[] = [
//   { id: 'C1', currentLocation: { lat: 28.63, lng: 77.2 }, capacityVolume: 5, serviceRadiusKm: 25 },
//   { id: 'C2', currentLocation: { lat: 28.7, lng: 77.1 }, capacityVolume: 3, serviceRadiusKm: 15 },
// ];
// const { pools, matches } = match(shipments, carriers);
// console.log(pools, matches);
