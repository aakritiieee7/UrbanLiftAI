import { Helmet } from "react-helmet-async";
import Navbar from "@/components/Navbar";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { CheckSquare, Layers, RefreshCcw } from "lucide-react";
import { clusterShipments, type Shipment as AlgoShipment } from "@/lib/matching";

function parseCoord(s: string): { lat: number; lng: number } | null {
  const m = s?.match(/(-?\d+\.\d+)\s*,\s*(-?\d+\.\d+)/);
  if (!m) return null;
  return { lat: parseFloat(m[1]), lng: parseFloat(m[2]) };
}

const PublicTransits = () => {
  const { toast } = useToast();
  const { userId } = useAuth();
  const [shipments, setShipments] = useState<any[]>([]);
  const [status, setStatus] = useState<string>("all");
  const [pooledOnly, setPooledOnly] = useState<boolean>(false);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<Record<string, boolean>>({});

  const fetchData = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("shipments")
      .select("id, origin, destination, status, pooled, capacity_kg, pickup_time, dropoff_time, shipper_id, carrier_id, created_at")
      .order("created_at", { ascending: false })
      .limit(100);
    if (error) {
      toast({ title: "Error loading", description: error.message });
    }
    setShipments(data ?? []);
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
    const channel = supabase
      .channel("shipments-public")
      .on('postgres_changes', { event: '*', schema: 'public', table: 'shipments' }, () => fetchData())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const filtered = useMemo(() => {
    return shipments.filter((s) => {
      const statusOk = status === 'all' ? true : s.status === status;
      const pooledOk = pooledOnly ? s.pooled === true : true;
      const text = `${s.origin} ${s.destination}`.toLowerCase();
      const qOk = q.trim() ? text.includes(q.toLowerCase()) : true;
      return statusOk && pooledOk && qOk;
    });
  }, [shipments, status, pooledOnly, q]);

  const suggestPool = () => {
    const chosen = Object.keys(selected).filter((id) => selected[id]);
    const base = chosen.length ? shipments.filter(s => chosen.includes(s.id)) : filtered;
    const algos: AlgoShipment[] = base.map((r) => {
      const po = parseCoord(r.origin);
      const pd = parseCoord(r.destination);
      if (!po || !pd) return null as any;
      return { id: r.id, pickup: po, drop: pd, readyAt: r.pickup_time ?? undefined, dueBy: r.dropoff_time ?? undefined };
    }).filter(Boolean);
    if (algos.length < 2) {
      toast({ title: "Need more", description: "Select at least 2 transits with coordinates." });
      return;
    }
    const pools = clusterShipments(algos);
    const best = pools.sort((a,b) => b.shipments.length - a.shipments.length)[0];
    if (best) {
      toast({ title: "Pooling suggestion", description: `Top pool groups ${best.shipments.length} shipments` });
    } else {
      toast({ title: "No pool found", description: "Try different filters or selections." });
    }
  };

  const finalizePooled = async (id: string) => {
    if (!userId) { toast({ title: "Login required", description: "Please login to finalize." }); return; }
    const { data, error } = await supabase.rpc('mark_pooled_and_delivered', { _shipment_ids: [id], _carrier_id: userId });
    if (error) {
      toast({ title: "Not finalized", description: error.message });
    } else {
      toast({ title: "Delivered", description: `Awarded ${data} pts for pooled delivery.` });
    }
  };

  return (
    <>
      <Helmet>
        <title>Public Transits | UrbanLift.AI</title>
        <meta name="description" content="Browse and pool public shipments to save fuel with pooled transits." />
        <link rel="canonical" href="/transits" />
      </Helmet>
      <Navbar />
      <main className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-6 space-y-6">
          <header>
            <h1 className="text-2xl font-semibold">Public Transits</h1>
          </header>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Filters</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-3 md:flex-row md:items-center">
              <div className="w-full md:w-64">
                <Select value={status} onValueChange={setStatus}>
                  <SelectTrigger className="w-full"><SelectValue placeholder="Status" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All statuses</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="assigned">Assigned</SelectItem>
                    <SelectItem value="in_transit">In Transit</SelectItem>
                    <SelectItem value="delivered">Delivered</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button variant={pooledOnly ? 'default' : 'outline'} onClick={() => setPooledOnly(v => !v)}>
                <Layers className="mr-2 h-4 w-4" /> Pooled only
              </Button>
              <div className="flex-1">
                <Input placeholder="Search origin/destination" value={q} onChange={(e) => setQ(e.target.value)} />
              </div>
              <Button variant="outline" onClick={fetchData} disabled={loading}>
                <RefreshCcw className="mr-2 h-4 w-4" /> Refresh
              </Button>
              <Button onClick={suggestPool}>
                <CheckSquare className="mr-2 h-4 w-4" /> Suggest Pool
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Transits</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead></TableHead>
                    <TableHead>ID</TableHead>
                    <TableHead>Origin</TableHead>
                    <TableHead>Destination</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Capacity</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((s) => (
                    <TableRow key={s.id}>
                      <TableCell>
                        <input
                          aria-label={`Select ${s.id}`}
                          type="checkbox"
                          checked={!!selected[s.id]}
                          onChange={(e) => setSelected(prev => ({ ...prev, [s.id]: e.target.checked }))}
                        />
                      </TableCell>
                      <TableCell className="whitespace-nowrap">{s.id.slice(0,8)}</TableCell>
                      <TableCell className="max-w-[220px] truncate" title={s.origin}>{s.origin}</TableCell>
                      <TableCell className="max-w-[220px] truncate" title={s.destination}>{s.destination}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary">{s.status}</Badge>
                          {s.pooled && <Badge>pooled</Badge>}
                        </div>
                      </TableCell>
                      <TableCell>{s.capacity_kg ?? '—'}</TableCell>
                      <TableCell className="text-right">
                        <Button size="sm" variant="outline" onClick={() => finalizePooled(s.id)}>Finalize pooled</Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      </main>
    </>
  );
};

export default PublicTransits;
