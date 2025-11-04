import { Card, CardContent } from "@/components/ui/card";
import { Package, Clock } from "lucide-react";

interface StatsRowProps {
  total: number;
  assigned: number;
  pending: number;
  delivered: number;
}

const StatCard = ({ label, value, icon: Icon, colorClass }: { label: string; value: number; icon: any; colorClass: string }) => (
  <Card className="border-delhi-primary/20">
    <CardContent className="pt-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[11px] uppercase tracking-wider text-delhi-navy/60">{label}</p>
          <p className="text-2xl font-extrabold text-delhi-navy">{value}</p>
        </div>
        <Icon className={`h-6 w-6 ${colorClass}`} />
      </div>
    </CardContent>
  </Card>
);

const StatsRow = ({ total, assigned, pending, delivered }: StatsRowProps) => {
  return (
    <section aria-label="Key metrics" className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <StatCard label="Total" value={total} icon={Package} colorClass="text-delhi-primary" />
      <StatCard label="Assigned" value={assigned} icon={Clock} colorClass="text-delhi-gold" />
      <StatCard label="Pending" value={pending} icon={Clock} colorClass="text-delhi-orange" />
      <StatCard label="Delivered" value={delivered} icon={Package} colorClass="text-delhi-success" />
    </section>
  );
};

export default StatsRow;
