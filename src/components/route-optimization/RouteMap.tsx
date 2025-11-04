import React, { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { MapPin, Route, Download } from 'lucide-react';

interface LatLng {
  lat: number;
  lng: number;
}

interface OptimizedRoute {
  groupId: string;
  shipments: Array<{
    id: string;
    pickup: LatLng;
    drop: LatLng;
  }>;
  routeCoordinates: LatLng[];
  totalDistance: number;
  totalTime: number;
  efficiency: number;
}

interface RouteMapProps {
  routes: OptimizedRoute[];
  onExportData?: (data: any) => void;
}

const RouteMap: React.FC<RouteMapProps> = ({ routes, onExportData }) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const [mapboxToken, setMapboxToken] = useState('');
  const [isMapInitialized, setIsMapInitialized] = useState(false);
  const [showTokenInput, setShowTokenInput] = useState(true);

  const initializeMap = () => {
    if (!mapContainer.current || !mapboxToken) return;

    mapboxgl.accessToken = mapboxToken;
    
    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/streets-v12',
      center: [77.2090, 28.6139], // Delhi center
      zoom: 10,
    });

    map.current.addControl(new mapboxgl.NavigationControl(), 'top-right');
    
    map.current.on('load', () => {
      setIsMapInitialized(true);
      setShowTokenInput(false);
      if (routes.length > 0) {
        displayRoutes();
      }
    });
  };

  const displayRoutes = () => {
    if (!map.current || !isMapInitialized) return;

    // Route colors for different groups
    const routeColors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD'];

    routes.forEach((route, index) => {
      const color = routeColors[index % routeColors.length];
      const sourceId = `route-${route.groupId}`;
      const layerId = `route-layer-${route.groupId}`;

      // Add route line
      if (route.routeCoordinates && route.routeCoordinates.length > 0) {
        const coordinates = route.routeCoordinates.map(coord => [coord.lng, coord.lat]);
        
        map.current!.addSource(sourceId, {
          type: 'geojson',
          data: {
            type: 'Feature',
            properties: {},
            geometry: {
              type: 'LineString',
              coordinates: coordinates
            }
          }
        });

        map.current!.addLayer({
          id: layerId,
          type: 'line',
          source: sourceId,
          layout: {
            'line-join': 'round',
            'line-cap': 'round'
          },
          paint: {
            'line-color': color,
            'line-width': 4,
            'line-opacity': 0.8
          }
        });
      }

      // Add pickup and drop markers
      route.shipments.forEach((shipment, shipmentIndex) => {
        // Pickup marker
        const pickupMarker = new mapboxgl.Marker({ 
          color: color,
          scale: 0.8
        })
          .setLngLat([shipment.pickup.lng, shipment.pickup.lat])
          .setPopup(new mapboxgl.Popup().setHTML(`
            <div class="p-2">
              <strong>Pickup: ${shipment.id}</strong><br/>
              <small>Route Group ${route.groupId}</small><br/>
              <small>Lat: ${shipment.pickup.lat.toFixed(4)}, Lng: ${shipment.pickup.lng.toFixed(4)}</small>
            </div>
          `))
          .addTo(map.current!);

        // Drop marker
        const dropMarker = new mapboxgl.Marker({ 
          color: color,
          scale: 0.6
        })
          .setLngLat([shipment.drop.lng, shipment.drop.lat])
          .setPopup(new mapboxgl.Popup().setHTML(`
            <div class="p-2">
              <strong>Drop: ${shipment.id}</strong><br/>
              <small>Route Group ${route.groupId}</small><br/>
              <small>Lat: ${shipment.drop.lat.toFixed(4)}, Lng: ${shipment.drop.lng.toFixed(4)}</small>
            </div>
          `))
          .addTo(map.current!);
      });
    });

    // Fit map to show all routes
    if (routes.length > 0) {
      const bounds = new mapboxgl.LngLatBounds();
      routes.forEach(route => {
        route.shipments.forEach(shipment => {
          bounds.extend([shipment.pickup.lng, shipment.pickup.lat]);
          bounds.extend([shipment.drop.lng, shipment.drop.lat]);
        });
      });
      map.current!.fitBounds(bounds, { padding: 50 });
    }
  };

  const exportRouteData = () => {
    const exportData = {
      timestamp: new Date().toISOString(),
      total_routes: routes.length,
      total_shipments: routes.reduce((sum, route) => sum + route.shipments.length, 0),
      routes: routes.map(route => ({
        group_id: route.groupId,
        shipments: route.shipments.map(s => ({
          id: s.id,
          pickup_lat: s.pickup.lat,
          pickup_lng: s.pickup.lng,
          drop_lat: s.drop.lat,
          drop_lng: s.drop.lng
        })),
        route_coordinates: route.routeCoordinates,
        total_distance_km: route.totalDistance,
        total_time_minutes: route.totalTime,
        efficiency_score: route.efficiency
      }))
    };

    // Create and download CSV
    const csvContent = [
      ['Group ID', 'Shipment ID', 'Pickup Lat', 'Pickup Lng', 'Drop Lat', 'Drop Lng', 'Distance (km)', 'Time (min)', 'Efficiency'].join(','),
      ...routes.flatMap(route => 
        route.shipments.map(shipment => [
          route.groupId,
          shipment.id,
          shipment.pickup.lat,
          shipment.pickup.lng,
          shipment.drop.lat,
          shipment.drop.lng,
          route.totalDistance,
          route.totalTime,
          route.efficiency
        ].join(','))
      )
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `optimized_routes_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);

    // Also export JSON
    const jsonBlob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const jsonUrl = window.URL.createObjectURL(jsonBlob);
    const jsonA = document.createElement('a');
    jsonA.href = jsonUrl;
    jsonA.download = `optimized_routes_${new Date().toISOString().split('T')[0]}.json`;
    jsonA.click();
    window.URL.revokeObjectURL(jsonUrl);

    onExportData?.(exportData);
  };

  useEffect(() => {
    if (isMapInitialized && routes.length > 0) {
      displayRoutes();
    }
  }, [routes, isMapInitialized]);

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MapPin className="h-5 w-5 text-delhi-primary" />
            Optimized Route Visualization
          </div>
          {routes.length > 0 && (
            <Button onClick={exportRouteData} variant="outline" size="sm">
              <Download className="h-4 w-4 mr-2" />
              Export Data
            </Button>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {showTokenInput && (
          <div className="space-y-4 mb-4 p-4 bg-muted/50 rounded-lg">
            <div className="space-y-2">
              <Label htmlFor="mapbox-token">Mapbox Public Token</Label>
              <div className="flex gap-2">
                <Input
                  id="mapbox-token"
                  type="password"
                  placeholder="Enter your Mapbox public token"
                  value={mapboxToken}
                  onChange={(e) => setMapboxToken(e.target.value)}
                />
                <Button onClick={initializeMap} disabled={!mapboxToken}>
                  Load Map
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Get your token from{' '}
                <a href="https://mapbox.com/" target="_blank" rel="noopener noreferrer" className="text-delhi-primary hover:underline">
                  mapbox.com
                </a>{' '}
                → Dashboard → Tokens
              </p>
            </div>
          </div>
        )}

        {routes.length > 0 && (
          <div className="mb-4 flex flex-wrap gap-2">
            {routes.map((route, index) => {
              const colors = ['bg-red-500', 'bg-teal-500', 'bg-blue-500', 'bg-green-500', 'bg-yellow-500', 'bg-purple-500'];
              return (
                <Badge key={route.groupId} className={`${colors[index % colors.length]} text-white`}>
                  Group {route.groupId}: {route.shipments.length} shipments
                </Badge>
              );
            })}
          </div>
        )}

        <div 
          ref={mapContainer} 
          className="w-full h-96 rounded-lg border"
          style={{ minHeight: '400px' }}
        />

        {routes.length === 0 && (
          <div className="flex items-center justify-center h-96 text-muted-foreground">
            <div className="text-center">
              <Route className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No routes to display</p>
              <p className="text-sm">Run route optimization to see results</p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default RouteMap;