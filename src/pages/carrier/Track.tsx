import Navbar from "@/components/Navbar";
import { Helmet } from "react-helmet-async";
import LiveMap from "@/components/LiveMap";

const Track = () => {
  return (
    <>
      <Helmet>
        <title>Carrier Track | UrbanLift.AI</title>
        <meta name="description" content="Carrier tracking with live map and real-time shipment updates." />
        <link rel="canonical" href="/carrier/track" />
      </Helmet>
      <Navbar />
      <main className="min-h-screen bg-background">
        <section className="container mx-auto px-4 py-10">
          <header className="mb-8 text-center">
            <h1 className="text-3xl md:text-4xl font-bold">Carrier Track</h1>
            <p className="text-muted-foreground mt-2">Monitor your location and shipment status in real time.</p>
          </header>
          <section className="rounded-lg border p-4">
            <h2 className="text-lg font-medium mb-3">Live Map</h2>
            <LiveMap />
          </section>
        </section>
      </main>
    </>
  );
};

export default Track;
