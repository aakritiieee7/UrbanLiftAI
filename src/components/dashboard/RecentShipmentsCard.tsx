import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface Shipment {
  id: string;
  origin: string;
  destination: string;
  status: string;
  created_at: string;
  carrier_id?: string | null;
}

interface Carrier {
  user_id: string;
  points: number;
}

const RecentShipmentsCard = ({
  shipments,
  carriers,
  onAssign,
}: {
  shipments: Shipment[];
  carriers: Carrier[];
  onAssign: (shipmentId: string, carrierId: string) => void;
}) => {
  return (
    <Card className="border-delhi-primary/20">
      <CardHeader>
        <CardTitle>Your Recent Shipments</CardTitle>
      </CardHeader>
      <CardContent className="max-h-[420px] overflow-auto pr-1">
        <div className="grid gap-3">
          {shipments.length === 0 && (
            <div className="text-sm text-muted-foreground">No shipments yet.</div>
          )}
          {shipments.map((s) => (
            <div
              key={s.id}
              className="rounded-xl border border-delhi-primary/10 bg-white/70 backdrop-blur-sm p-4 transition-shadow hover:shadow-[var(--shadow-card-hover)]"
            >
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-base font-semibold text-delhi-navy">
                    {s.origin} → {s.destination}
                  </div>
                  <div className="mt-1 text-xs text-delhi-navy/70">
                    {new Date(s.created_at).toLocaleString()}
                  </div>
                </div>
                <span
                  className={`px-2 py-1 text-[10px] uppercase tracking-wide font-semibold rounded-full border ${
                    s.status === "delivered"
                      ? "border-delhi-success/30 text-delhi-success"
                      : s.status === "assigned"
                      ? "border-delhi-gold/30 text-delhi-gold"
                      : "border-delhi-orange/30 text-delhi-orange"
                  }`}
                >
                  {s.status}
                </span>
              </div>
              <div className="mt-3 flex items-center gap-2">
                {s.status === "pending" && !s.carrier_id ? (
                  <>
                    <Select value={s.carrier_id ?? ""} onValueChange={(v) => onAssign(s.id, v)}>
                      <SelectTrigger className="w-full md:w-64">
                        <SelectValue placeholder="Assign driver" />
                      </SelectTrigger>
                      <SelectContent>
                        {carriers.map((c) => (
                          <SelectItem key={c.user_id} value={c.user_id}>
                            User {c.user_id.slice(0, 8)} • {c.points} pts
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {s.carrier_id && (
                      <Button size="sm" variant="outline" onClick={() => onAssign(s.id, "")}>
                        Unassign
                      </Button>
                    )}
                  </>
                ) : s.carrier_id ? (
                  <div className="text-sm text-muted-foreground flex items-center gap-2">
                    <span>Assigned to: User {s.carrier_id.slice(0, 8)}</span>
                    <span className="text-xs bg-muted px-2 py-1 rounded">Assignment locked</span>
                  </div>
                ) : (
                  <div className="text-sm text-muted-foreground">
                    No carrier assigned
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default RecentShipmentsCard;
