import Layout from "@/components/Layout";
import { Helmet } from "react-helmet-async";
import LiveMap from "@/components/LiveMap";

const Track = () => {
  return (
    <>
      <Helmet>
        <title>Shipper Track | UrbanLift.AI</title>
        <meta name="description" content="Track your shipments in real-time with live location updates." />
        <link rel="canonical" href="/shipper/track" />
      </Helmet>
      <Layout>
        <main className="min-h-screen bg-background">
          <section className="container mx-auto px-4 py-10">
            <header className="mb-8 text-center">
              <h1 className="text-3xl md:text-4xl font-bold">Track Shipments</h1>
              <p className="text-muted-foreground mt-2">Monitor your shipments in real-time.</p>
            </header>
            <section className="rounded-lg border p-4">
              <h2 className="text-lg font-medium mb-3">Live Tracking</h2>
              <LiveMap />
            </section>
          </section>
        </main>
      </Layout>
    </>
  );
};

export default Track;