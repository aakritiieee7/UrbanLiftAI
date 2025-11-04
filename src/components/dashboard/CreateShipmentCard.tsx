import ShipmentForm from "@/components/shipment/ShipmentForm";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const CreateShipmentCard = ({ onCreated }: { onCreated: () => void }) => {
  return (
    <Card className="border-delhi-primary/20">
      <CardHeader>
        <CardTitle>Create Shipment</CardTitle>
      </CardHeader>
      <CardContent>
        <ShipmentForm onCreated={onCreated} />
      </CardContent>
    </Card>
  );
};

export default CreateShipmentCard;
