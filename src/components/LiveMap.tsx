import { useEffect, useState } from "react";
import { MapContainer, TileLayer, CircleMarker, Tooltip, Popup, Polyline } from "react-leaflet";
import type { LatLngExpression } from "leaflet";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import "leaflet/dist/leaflet.css";

type Shipment = {
  id: string;
  origin: string;
  destination: string;
  origin_lat: number | null;
  origin_lng: number | null;
  destination_lat: number | null;
  destination_lng: number | null;
  origin_address: string | null;
  destination_address: string | null;
  status: string;
  capacity_kg: number;
  created_at: string;
  pickup_time: string | null;
  dropoff_time: string | null;
};

// Parse coordinate strings like "28.6139, 77.2090" to LatLngExpression
function parseCoordinates(coordStr: string): LatLngExpression | null {
  const match = coordStr?.match(/(-?\d+\.?\d*)\s*,\s*(-?\d+\.?\d*)/);
  if (!match) return null;
  return [parseFloat(match[1]), parseFloat(match[2])];
}

interface LiveMapProps {
  userRole?: 'shipper' | 'carrier';
  showDelivered?: boolean;
}

const delhiCenter: LatLngExpression = [28.6139, 77.2090];

const AnyMapContainer = MapContainer as any;
const AnyTileLayer = TileLayer as any;
const AnyCircleMarker = CircleMarker as any;
const AnyPolyline = Polyline as any;

const LiveMap = ({ userRole = 'shipper', showDelivered = true }: LiveMapProps) => {
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [loading, setLoading] = useState(true);
  const { userId } = useAuth();

  useEffect(() => {
    const fetchShipments = async () => {
      try {
        let query = supabase
          .from("shipments")
          .select(`
            id, origin, destination, status, capacity_kg, created_at, pickup_time, dropoff_time,
            origin_lat, origin_lng, destination_lat, destination_lng, 
            origin_address, destination_address
          `);

        // Filter based on user role
        if (userRole === 'carrier') {
          query = query.eq("carrier_id", userId || "");
          if (!showDelivered) {
            query = query.neq("status", "delivered");
          }
        } else {
          query = query.eq("shipper_id", userId || "");
        }

        const { data, error } = await query
          .order("created_at", { ascending: false })
          .limit(10);

        if (error) {
          console.error("Error fetching shipments:", error);
          return;
        }

        setShipments(data || []);
      } catch (error) {
        console.error("Error:", error);
      } finally {
        setLoading(false);
      }
    };

    if (userId) {
      fetchShipments();
    }
  }, [userId, userRole, showDelivered]);

  if (loading) {
    return (
      <div className="w-full h-[420px] flex items-center justify-center bg-card rounded-lg border">
        <p>Loading shipments...</p>
      </div>
    );
  }

  // Filter shipments that have valid coordinates (use new lat/lng columns first, fallback to parsing)
  const validShipments = shipments.filter(shipment => {
    // Use new coordinate columns if available
    if (shipment.origin_lat !== null && shipment.origin_lng !== null && 
        shipment.destination_lat !== null && shipment.destination_lng !== null) {
      return true;
    }
    // Fallback to parsing legacy string format
    const pickup = parseCoordinates(shipment.origin);
    const drop = parseCoordinates(shipment.destination);
    return pickup && drop;
  });

  return (
    <div className="w-full overflow-hidden rounded-lg border bg-card">
      <AnyMapContainer
        center={delhiCenter}
        zoom={11}
        scrollWheelZoom={false}
        className="h-[420px] w-full"
      >
        <AnyTileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {validShipments.map((shipment) => {
          // Use new coordinate columns if available, otherwise fallback to parsing
          let pickup: LatLngExpression | null = null;
          let drop: LatLngExpression | null = null;

          if (shipment.origin_lat !== null && shipment.origin_lng !== null) {
            pickup = [shipment.origin_lat, shipment.origin_lng];
          } else {
            pickup = parseCoordinates(shipment.origin);
          }

          if (shipment.destination_lat !== null && shipment.destination_lng !== null) {
            drop = [shipment.destination_lat, shipment.destination_lng];
          } else {
            drop = parseCoordinates(shipment.destination);
          }
          
          if (!pickup || !drop) return null;

          const openGoogleMapsNavigation = () => {
            const [lat, lng] = drop as [number, number];
            const googleMapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&travelmode=driving`;
            window.open(googleMapsUrl, '_blank');
          };

          return (
            <div key={shipment.id}>
              {/* Route line connecting pickup to drop */}
              <AnyPolyline
                positions={[pickup, drop]}
                pathOptions={{
                  color: shipment.status === 'delivered' ? "hsl(var(--success))" : "hsl(var(--primary))",
                  weight: 3,
                  opacity: 0.7,
                  dashArray: shipment.status === 'pending' ? "10, 10" : undefined
                }}
              />

              {/* Pickup marker */}
              <AnyCircleMarker 
                center={pickup} 
                radius={12} 
                pathOptions={{ 
                  color: "hsl(var(--primary))", 
                  fillColor: "hsl(var(--primary))", 
                  fillOpacity: 0.8,
                  weight: 3
                }}
              >
                <Tooltip>
                  <div className="text-sm space-y-1">
                    <div className="font-bold text-primary">📦 PICKUP</div>
                    <div><strong>Order ID:</strong> {shipment.id.slice(0, 8)}</div>
                    <div><strong>Status:</strong> <span className="capitalize">{shipment.status}</span></div>
                    <div><strong>Weight:</strong> {shipment.capacity_kg}kg</div>
                    {shipment.pickup_time && (
                      <div><strong>Pickup Time:</strong> {new Date(shipment.pickup_time).toLocaleString()}</div>
                    )}
                    <div><strong>Created:</strong> {new Date(shipment.created_at).toLocaleDateString()}</div>
                    {shipment.origin_address && (
                      <div><strong>Address:</strong> {shipment.origin_address}</div>
                    )}
                  </div>
                </Tooltip>
              </AnyCircleMarker>

              {/* Drop marker */}
              <AnyCircleMarker 
                center={drop} 
                radius={12} 
                pathOptions={{ 
                  color: "hsl(var(--destructive))", 
                  fillColor: "hsl(var(--destructive))", 
                  fillOpacity: 0.8,
                  weight: 3
                }}
              >
                {userRole === 'carrier' && shipment.status !== 'delivered' ? (
                  <Popup>
                    <div className="text-sm space-y-2">
                      <div className="font-bold text-destructive">🚚 DROP-OFF</div>
                      <div><strong>Order ID:</strong> {shipment.id.slice(0, 8)}</div>
                      <div><strong>Status:</strong> <span className="capitalize">{shipment.status}</span></div>
                      <div><strong>Weight:</strong> {shipment.capacity_kg}kg</div>
                      {shipment.dropoff_time && (
                        <div><strong>Drop Time:</strong> {new Date(shipment.dropoff_time).toLocaleString()}</div>
                      )}
                      <div><strong>Created:</strong> {new Date(shipment.created_at).toLocaleDateString()}</div>
                      {shipment.destination_address && (
                        <div><strong>Address:</strong> {shipment.destination_address}</div>
                      )}
                      <Button
                        size="sm"
                        onClick={openGoogleMapsNavigation}
                        className="w-full mt-2"
                      >
                        🧭 Navigate
                      </Button>
                    </div>
                  </Popup>
                ) : (
                  <Tooltip>
                    <div className="text-sm space-y-2">
                      <div className="font-bold text-destructive">🚚 DROP-OFF</div>
                      <div><strong>Order ID:</strong> {shipment.id.slice(0, 8)}</div>
                      <div><strong>Status:</strong> <span className="capitalize">{shipment.status}</span></div>
                      <div><strong>Weight:</strong> {shipment.capacity_kg}kg</div>
                      {shipment.dropoff_time && (
                        <div><strong>Drop Time:</strong> {new Date(shipment.dropoff_time).toLocaleString()}</div>
                      )}
                      <div><strong>Created:</strong> {new Date(shipment.created_at).toLocaleDateString()}</div>
                      {shipment.destination_address && (
                        <div><strong>Address:</strong> {shipment.destination_address}</div>
                      )}
                    </div>
                  </Tooltip>
                )}
              </AnyCircleMarker>
            </div>
          );
        })}

        {validShipments.length === 0 && (
          <div className="leaflet-top leaflet-right">
            <div className="leaflet-control leaflet-bar bg-white p-2 text-sm">
              No shipments with valid coordinates found
            </div>
          </div>
        )}
      </AnyMapContainer>
    </div>
  );
};

export default LiveMap;
