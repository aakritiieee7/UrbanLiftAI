import LiveMap from "@/components/LiveMap";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const LiveMapCard = () => {
  return (
    <Card className="border-delhi-primary/20">
      <CardHeader>
        <CardTitle>Live Map</CardTitle>
      </CardHeader>
      <CardContent>
        <LiveMap />
      </CardContent>
    </Card>
  );
};

export default LiveMapCard;
