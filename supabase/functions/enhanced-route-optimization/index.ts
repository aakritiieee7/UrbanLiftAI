import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

interface LatLng {
  lat: number;
  lng: number;
}

interface Shipment {
  id: string;
  pickup: LatLng;
  drop: LatLng;
  weight?: number;
  volume?: number;
  priority?: 'high' | 'medium' | 'low';
}

interface ClusterGroup {
  id: string;
  shipments: Shipment[];
  centroid: LatLng;
  totalWeight: number;
  totalVolume: number;
}

interface RouteSegment {
  from: LatLng;
  to: LatLng;
  distance: number;
  estimatedTime: number;
  trafficFactor: number;
}

interface OptimizedRoute {
  groupId: string;
  shipments: Shipment[];
  routeCoordinates: LatLng[];
  segments: RouteSegment[];
  totalDistance: number;
  totalTime: number;
  efficiency: number;
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

// K-Means clustering implementation
function kMeansCluster(shipments: Shipment[], k: number = 3): ClusterGroup[] {
  if (shipments.length === 0) return [];
  if (shipments.length <= k) {
    return shipments.map((shipment, index) => ({
      id: `cluster_${index}`,
      shipments: [shipment],
      centroid: shipment.pickup,
      totalWeight: shipment.weight || 0,
      totalVolume: shipment.volume || 0
    }));
  }

  // Initialize centroids randomly
  const centroids: LatLng[] = [];
  for (let i = 0; i < k; i++) {
    const randomShipment = shipments[Math.floor(Math.random() * shipments.length)];
    centroids.push({ ...randomShipment.pickup });
  }

  let clusters: number[] = new Array(shipments.length).fill(0);
  let converged = false;
  let iterations = 0;
  const maxIterations = 100;

  while (!converged && iterations < maxIterations) {
    // Assign each shipment to the nearest centroid
    const newClusters = shipments.map((shipment, index) => {
      let minDistance = Infinity;
      let closestCluster = 0;
      
      for (let j = 0; j < centroids.length; j++) {
        const distance = haversineDistance(shipment.pickup, centroids[j]);
        if (distance < minDistance) {
          minDistance = distance;
          closestCluster = j;
        }
      }
      
      return closestCluster;
    });

    // Check for convergence
    converged = newClusters.every((cluster, index) => cluster === clusters[index]);
    clusters = newClusters;

    // Update centroids
    for (let j = 0; j < k; j++) {
      const clusterShipments = shipments.filter((_, index) => clusters[index] === j);
      if (clusterShipments.length > 0) {
        centroids[j] = {
          lat: clusterShipments.reduce((sum, s) => sum + s.pickup.lat, 0) / clusterShipments.length,
          lng: clusterShipments.reduce((sum, s) => sum + s.pickup.lng, 0) / clusterShipments.length
        };
      }
    }

    iterations++;
  }

  // Create cluster groups
  const clusterGroups: ClusterGroup[] = [];
  for (let j = 0; j < k; j++) {
    const clusterShipments = shipments.filter((_, index) => clusters[index] === j);
    if (clusterShipments.length > 0) {
      clusterGroups.push({
        id: `cluster_${j}`,
        shipments: clusterShipments,
        centroid: centroids[j],
        totalWeight: clusterShipments.reduce((sum, s) => sum + (s.weight || 0), 0),
        totalVolume: clusterShipments.reduce((sum, s) => sum + (s.volume || 0), 0)
      });
    }
  }

  return clusterGroups;
}

// Traffic factor based on time and location
function getTrafficFactor(from: LatLng, to: LatLng): number {
  const hour = new Date().getHours();
  const day = new Date().getDay();
  
  // Base traffic factor
  let factor = 1.0;
  
  // Rush hour penalties (8-10 AM, 5-7 PM)
  if ((hour >= 8 && hour <= 10) || (hour >= 17 && hour <= 19)) {
    factor *= 1.8; // 80% slower
  }
  
  // Weekend benefits
  if (day === 0 || day === 6) {
    factor *= 0.8; // 20% faster
  }
  
  // Distance-based factors (longer routes less affected by local traffic)
  const distance = haversineDistance(from, to);
  if (distance > 10) {
    factor *= 0.9; // Highway portions less affected
  }
  
  return factor;
}

// Calculate route segment with traffic considerations
function calculateRouteSegment(from: LatLng, to: LatLng): RouteSegment {
  const distance = haversineDistance(from, to);
  const trafficFactor = getTrafficFactor(from, to);
  
  // Base speed depends on road type (estimated)
  let baseSpeed = 35; // km/h average for city roads
  
  // Adjust speed based on distance (highways for longer distances)
  if (distance > 5) {
    baseSpeed = 50; // Highway speeds
  } else if (distance < 1) {
    baseSpeed = 20; // Local roads
  }
  
  const adjustedSpeed = baseSpeed / trafficFactor;
  const estimatedTime = (distance / adjustedSpeed) * 60; // minutes
  
  return {
    from,
    to,
    distance,
    estimatedTime,
    trafficFactor
  };
}

// Optimize route order within a cluster using nearest neighbor
function optimizeClusterRoute(cluster: ClusterGroup): OptimizedRoute {
  const { shipments } = cluster;
  const route: LatLng[] = [];
  const segments: RouteSegment[] = [];
  
  // Start from cluster centroid
  let currentLocation = cluster.centroid;
  route.push(currentLocation);
  
  // Visit all pickups first (nearest neighbor)
  const remainingPickups = [...shipments.map(s => ({ location: s.pickup, shipment: s }))];
  
  while (remainingPickups.length > 0) {
    let nearestIndex = 0;
    let nearestDistance = haversineDistance(currentLocation, remainingPickups[0].location);
    
    for (let i = 1; i < remainingPickups.length; i++) {
      const distance = haversineDistance(currentLocation, remainingPickups[i].location);
      if (distance < nearestDistance) {
        nearestDistance = distance;
        nearestIndex = i;
      }
    }
    
    const nearest = remainingPickups.splice(nearestIndex, 1)[0];
    const segment = calculateRouteSegment(currentLocation, nearest.location);
    
    segments.push(segment);
    route.push(nearest.location);
    currentLocation = nearest.location;
  }
  
  // Then visit all deliveries (nearest neighbor)
  const remainingDeliveries = [...shipments.map(s => ({ location: s.drop, shipment: s }))];
  
  while (remainingDeliveries.length > 0) {
    let nearestIndex = 0;
    let nearestDistance = haversineDistance(currentLocation, remainingDeliveries[0].location);
    
    for (let i = 1; i < remainingDeliveries.length; i++) {
      const distance = haversineDistance(currentLocation, remainingDeliveries[i].location);
      if (distance < nearestDistance) {
        nearestDistance = distance;
        nearestIndex = i;
      }
    }
    
    const nearest = remainingDeliveries.splice(nearestIndex, 1)[0];
    const segment = calculateRouteSegment(currentLocation, nearest.location);
    
    segments.push(segment);
    route.push(nearest.location);
    currentLocation = nearest.location;
  }
  
  const totalDistance = segments.reduce((sum, seg) => sum + seg.distance, 0);
  const totalTime = segments.reduce((sum, seg) => sum + seg.estimatedTime, 0);
  const efficiency = shipments.length / Math.max(1, totalTime / 60); // shipments per hour
  
  return {
    groupId: cluster.id,
    shipments,
    routeCoordinates: route,
    segments,
    totalDistance: Math.round(totalDistance * 100) / 100,
    totalTime: Math.round(totalTime),
    efficiency: Math.round(efficiency * 100) / 100
  };
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

    // Perform K-Means clustering
    const numClusters = Math.min(options.maxClusters || 3, Math.ceil(validShipments.length / 2));
    const clusters = kMeansCluster(validShipments, numClusters);
    
    // Optimize routes for each cluster
    const optimizedRoutes = clusters.map(cluster => optimizeClusterRoute(cluster));
    
    // Calculate summary statistics
    const totalShipments = validShipments.length;
    const totalClusters = clusters.length;
    const totalDistance = optimizedRoutes.reduce((sum, route) => sum + route.totalDistance, 0);
    const totalTime = optimizedRoutes.reduce((sum, route) => sum + route.totalTime, 0);
    const avgEfficiency = optimizedRoutes.reduce((sum, route) => sum + route.efficiency, 0) / optimizedRoutes.length;

    const result = {
      success: true,
      summary: {
        totalShipments,
        totalClusters,
        totalDistance: Math.round(totalDistance * 100) / 100,
        totalTimeMinutes: Math.round(totalTime),
        averageShipmentsPerCluster: Math.round((totalShipments / totalClusters) * 100) / 100,
        efficiencyScore: Math.round(avgEfficiency * 100) / 100,
        estimatedSavings: Math.round((1 - totalClusters / totalShipments) * 100) // % reduction in vehicles needed
      },
      routes: optimizedRoutes,
      clusters: clusters.map(cluster => ({
        id: cluster.id,
        shipmentIds: cluster.shipments.map(s => s.id),
        centroid: cluster.centroid,
        totalWeight: cluster.totalWeight,
        totalVolume: cluster.totalVolume
      })),
      metadata: {
        generatedAt: new Date().toISOString(),
        algorithm: 'K-Means Clustering + Nearest Neighbor TSP',
        trafficConsidered: true,
        numClusters
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
    console.error('Enhanced route optimization error:', error);
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