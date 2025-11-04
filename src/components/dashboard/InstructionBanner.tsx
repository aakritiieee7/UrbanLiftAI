import { Card } from "@/components/ui/card";

const InstructionBanner = () => {
  return (
    <Card className="rounded-2xl border border-delhi-primary/20 bg-white/80 backdrop-blur-sm p-6 shadow-[var(--shadow-delhi)]">
      <header>
        <h1 className="text-3xl md:text-4xl font-bold text-delhi-navy">Shipper Dashboard</h1>
        <p className="mt-2 text-base text-delhi-navy/70">
          Create shipments, pool with matches, assign a driver, and monitor delivery progress in real time.
        </p>
      </header>
      <ol className="mt-4 grid gap-2 text-sm text-delhi-navy/80 list-decimal pl-5">
        <li>Use “Create Shipment” to add pickup and drop-off details.</li>
        <li>Review your recent shipments and assign a driver from the list.</li>
        <li>Track active deliveries on the live map below.</li>
      </ol>
    </Card>
  );
};

export default InstructionBanner;
