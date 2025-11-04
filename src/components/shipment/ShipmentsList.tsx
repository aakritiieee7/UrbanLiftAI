import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { CheckCircle, Trash2, Star, MapPin, Clock, Package, UserCheck } from "lucide-react";

interface Shipment {
  id: string;
  origin: string;
  destination: string;
  status: string;
  created_at: string;
  carrier_id?: string | null;
  capacity_kg?: number | null;
  pickup_time?: string | null;
  dropoff_time?: string | null;
}

interface CarrierProfile {
  user_id: string;
  business_name?: string;
  company_name?: string;
  phone?: string;
  contact_phone?: string;
  vehicle_type?: string;
  vehicle_types?: string;
}

interface ShipmentsListProps {
  refresh: boolean;
  onRefreshComplete: () => void;
}

const ShipmentsList = ({ refresh, onRefreshComplete }: ShipmentsListProps) => {
  const { userId } = useAuth();
  const { toast } = useToast();
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [carrierProfiles, setCarrierProfiles] = useState<{ [key: string]: CarrierProfile }>({});
  const [availableCarriers, setAvailableCarriers] = useState<CarrierProfile[]>([]);
  const [loading, setLoading] = useState(false);
  const [rating, setRating] = useState<number>(5);
  const [review, setReview] = useState<string>("");
  const [selectedShipment, setSelectedShipment] = useState<string>("");

  const fetchShipments = async () => {
    if (!userId) return;
    
    setLoading(true);
    const { data, error } = await supabase
      .from("shipments")
      .select("*")
      .eq("shipper_id", userId)
      .order("created_at", { ascending: false });

    if (error) {
      toast({ title: "Error", description: error.message });
    } else {
      setShipments(data || []);
      
      // Fetch carrier profiles for assigned shipments
      const carrierIds = (data || [])
        .filter(shipment => shipment.carrier_id)
        .map(shipment => shipment.carrier_id);
      
      if (carrierIds.length > 0) {
        const { data: carriers, error: carriersError } = await supabase
          .from("carrier_profiles")
          .select("user_id, business_name, company_name, phone, contact_phone, vehicle_type, vehicle_types")
          .in("user_id", carrierIds);
        
        if (!carriersError && carriers) {
          const profilesMap: { [key: string]: CarrierProfile } = {};
          carriers.forEach(carrier => {
            profilesMap[carrier.user_id] = carrier;
          });
          setCarrierProfiles(profilesMap);
        }
      }
    }
    
    // Fetch available carriers for assignment
    const { data: allCarriers, error: allCarriersError } = await supabase
      .from("carrier_profiles")
      .select("user_id, business_name, company_name, phone, contact_phone, vehicle_type, vehicle_types");
    
    if (!allCarriersError && allCarriers) {
      setAvailableCarriers(allCarriers);
    }
    
    setLoading(false);
  };

  useEffect(() => {
    fetchShipments();
  }, [userId]);

  useEffect(() => {
    if (refresh) {
      fetchShipments();
      onRefreshComplete();
    }
  }, [refresh, onRefreshComplete]);

  // Removed markAsDone - only carriers can update delivery status

  const deleteShipment = async (shipmentId: string) => {
    const { error } = await supabase
      .from("shipments")
      .delete()
      .eq("id", shipmentId);

    if (error) {
      toast({ title: "Error", description: error.message });
    } else {
      toast({ title: "Success", description: "Shipment deleted" });
      fetchShipments();
    }
  };

  const assignCarrier = async (shipmentId: string, carrierId: string) => {
    // Check if shipment already has a carrier assigned (lock assignment once set)
    const currentShipment = shipments.find(s => s.id === shipmentId);
    if (currentShipment && currentShipment.carrier_id) {
      toast({ 
        title: "Assignment Locked", 
        description: "Assignment cannot be changed once a carrier is selected." 
      });
      return;
    }

    if (!carrierId || carrierId === "unassign") {
      // Unassign carrier
      const { error } = await supabase
        .from("shipments")
        .update({ carrier_id: null, status: "pending" })
        .eq("id", shipmentId)
        .eq("status", "pending"); // Additional safety check
      
      if (error) {
        toast({ title: "Error", description: error.message });
      } else {
        toast({ title: "Success", description: "Carrier unassigned" });
        fetchShipments();
      }
      return;
    }

    const { error } = await supabase
      .from("shipments")
      .update({ carrier_id: carrierId, status: "assigned" })
      .eq("id", shipmentId)
      .eq("status", "pending"); // Only allow assignment if still pending

    if (error) {
      toast({ title: "Error", description: error.message });
      console.error("Assignment error:", error);
    } else {
      toast({ title: "Success", description: "Carrier assigned successfully!" });
      fetchShipments();
    }
  };

  const submitRating = async () => {
    if (!selectedShipment) return;

    // For now, we'll just show a success message
    // In a real app, you'd store this in a ratings table
    toast({ 
      title: "Rating Submitted", 
      description: `Thank you for rating ${rating} stars!` 
    });
    
    setRating(5);
    setReview("");
    setSelectedShipment("");
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "delivered":
        return "border-green-500/30 text-green-600 bg-green-50";
      case "assigned":
        return "border-blue-500/30 text-blue-600 bg-blue-50";
      case "in_transit":
        return "border-yellow-500/30 text-yellow-600 bg-yellow-50";
      default:
        return "border-gray-500/30 text-gray-600 bg-gray-50";
    }
  };

  if (loading) {
    return (
      <Card className="border-primary/20">
        <CardContent className="flex items-center justify-center py-8">
          <div className="text-center">Loading shipments...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-primary/20">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Package className="h-5 w-5" />
          Your Shipments
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {shipments.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No shipments yet. Create your first shipment above!
          </div>
        ) : (
          shipments.map((shipment) => (
            <div
              key={shipment.id}
              className="rounded-lg border border-primary/10 bg-card/50 p-4 space-y-3"
            >
              <div className="flex items-start justify-between">
                <div className="space-y-2 flex-1">
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-primary" />
                    <span className="font-medium text-sm">
                      {shipment.origin} → {shipment.destination}
                    </span>
                  </div>
                  
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {new Date(shipment.created_at).toLocaleDateString()}
                    </div>
                    {shipment.capacity_kg && (
                      <div className="flex items-center gap-1">
                        <Package className="h-3 w-3" />
                        {shipment.capacity_kg} kg
                      </div>
                    )}
                  </div>
                </div>
                
                <Badge className={`text-xs ${getStatusColor(shipment.status)}`}>
                  {shipment.status}
                </Badge>
              </div>

              {/* Carrier Assignment */}
              {shipment.status === "pending" && !shipment.carrier_id ? (
                <div className="bg-primary/5 rounded-md p-3 border border-primary/10">
                  <div className="text-sm font-medium text-primary mb-2 flex items-center gap-2">
                    <UserCheck className="h-4 w-4" />
                    Assign Carrier
                  </div>
                   <Select 
                     value={shipment.carrier_id || "unassign"} 
                     onValueChange={(carrierId) => assignCarrier(shipment.id, carrierId)}
                   >
                     <SelectTrigger className="w-full">
                       <SelectValue placeholder="Select a carrier..." />
                     </SelectTrigger>
                     <SelectContent>
                       <SelectItem value="unassign">Unassign</SelectItem>
                       {availableCarriers.map((carrier) => (
                         <SelectItem key={carrier.user_id} value={carrier.user_id}>
                           {carrier.business_name || carrier.company_name || carrier.user_id} 
                           {carrier.vehicle_type && ` (${carrier.vehicle_type})`}
                         </SelectItem>
                       ))}
                     </SelectContent>
                   </Select>
                </div>
              ) : shipment.carrier_id && carrierProfiles[shipment.carrier_id] ? (
                <div className="bg-primary/5 rounded-md p-3 border border-primary/10">
                  <div className="text-sm font-medium text-primary mb-1">
                    Assigned Carrier
                  </div>
                  <div className="text-sm space-y-1">
                    <div className="font-medium">
                      {carrierProfiles[shipment.carrier_id].business_name || 
                       carrierProfiles[shipment.carrier_id].company_name || 
                       'Carrier'}
                    </div>
                    {(carrierProfiles[shipment.carrier_id].phone || carrierProfiles[shipment.carrier_id].contact_phone) && (
                      <div className="text-muted-foreground">
                        📞 {carrierProfiles[shipment.carrier_id].phone || carrierProfiles[shipment.carrier_id].contact_phone}
                      </div>
                    )}
                    {(carrierProfiles[shipment.carrier_id].vehicle_type || carrierProfiles[shipment.carrier_id].vehicle_types) && (
                      <div className="text-muted-foreground">
                        🚛 {carrierProfiles[shipment.carrier_id].vehicle_type || carrierProfiles[shipment.carrier_id].vehicle_types}
                      </div>
                    )}
                  </div>
                </div>
              ) : null}

              {/* Status Tracking */}
              <div className="bg-primary/5 rounded-md p-3 border border-primary/10">
                <div className="text-sm font-medium text-primary mb-2">
                  Shipment Progress
                </div>
                <div className="flex items-center gap-4">
                  <div className={`flex items-center gap-1 text-xs ${
                    shipment.status === 'pending' ? 'text-orange-600 font-medium' : 
                    ['assigned', 'in_transit', 'delivered'].includes(shipment.status) ? 'text-green-600' : 'text-muted-foreground'
                  }`}>
                    <div className={`w-2 h-2 rounded-full ${
                      shipment.status === 'pending' ? 'bg-orange-500' : 'bg-green-500'
                    }`} />
                    Order Placed
                  </div>
                  <div className={`flex items-center gap-1 text-xs ${
                    shipment.status === 'assigned' ? 'text-orange-600 font-medium' : 
                    ['in_transit', 'delivered'].includes(shipment.status) ? 'text-green-600' : 'text-muted-foreground'
                  }`}>
                    <div className={`w-2 h-2 rounded-full ${
                      ['assigned', 'in_transit', 'delivered'].includes(shipment.status) ? 'bg-green-500' : 'bg-gray-300'
                    }`} />
                    Driver Assigned
                  </div>
                  <div className={`flex items-center gap-1 text-xs ${
                    shipment.status === 'in_transit' ? 'text-orange-600 font-medium' : 
                    shipment.status === 'delivered' ? 'text-green-600' : 'text-muted-foreground'
                  }`}>
                    <div className={`w-2 h-2 rounded-full ${
                      ['in_transit', 'delivered'].includes(shipment.status) ? 'bg-green-500' : 'bg-gray-300'
                    }`} />
                    {shipment.status === 'in_transit' ? 'Out for Delivery' : 'In Transit'}
                  </div>
                  <div className={`flex items-center gap-1 text-xs ${
                    shipment.status === 'delivered' ? 'text-green-600 font-medium' : 'text-muted-foreground'
                  }`}>
                    <div className={`w-2 h-2 rounded-full ${
                      shipment.status === 'delivered' ? 'bg-green-500' : 'bg-gray-300'
                    }`} />
                    Delivered
                  </div>
                </div>
                {shipment.pickup_time && (
                  <div className="text-xs text-muted-foreground mt-2">
                    Picked up: {new Date(shipment.pickup_time).toLocaleString()}
                  </div>
                )}
                {shipment.dropoff_time && (
                  <div className="text-xs text-muted-foreground">
                    Delivered: {new Date(shipment.dropoff_time).toLocaleString()}
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                {shipment.status === "pending" && (
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button size="sm" variant="destructive" className="flex items-center gap-1">
                        <Trash2 className="h-3 w-3" />
                        Delete
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete Shipment</AlertDialogTitle>
                        <AlertDialogDescription>
                          Are you sure you want to delete this shipment? This action cannot be undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => deleteShipment(shipment.id)}
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                          Delete
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                )}

                {shipment.status === "delivered" && shipment.carrier_id && (
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setSelectedShipment(shipment.id)}
                        className="flex items-center gap-1"
                      >
                        <Star className="h-3 w-3" />
                        Rate Driver
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Rate Your Driver</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <Label htmlFor="rating">Rating</Label>
                          <Select value={rating.toString()} onValueChange={(v) => setRating(Number(v))}>
                            <SelectTrigger>
                              <SelectValue placeholder="Select rating" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="1">1 Star - Poor</SelectItem>
                              <SelectItem value="2">2 Stars - Fair</SelectItem>
                              <SelectItem value="3">3 Stars - Good</SelectItem>
                              <SelectItem value="4">4 Stars - Very Good</SelectItem>
                              <SelectItem value="5">5 Stars - Excellent</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        
                        <div className="space-y-2">
                          <Label htmlFor="review">Review (optional)</Label>
                          <Textarea
                            id="review"
                            placeholder="Share your experience with this driver..."
                            value={review}
                            onChange={(e) => setReview(e.target.value)}
                          />
                        </div>
                        
                        <Button onClick={submitRating} className="w-full">
                          Submit Rating
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                )}
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
};

export default ShipmentsList;