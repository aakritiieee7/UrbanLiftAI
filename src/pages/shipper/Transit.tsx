import Layout from "@/components/Layout";
import { Helmet } from "react-helmet-async";
import ShipmentForm from "@/components/shipment/ShipmentForm";
import ShipmentsList from "@/components/shipment/ShipmentsList";
import { useState, useCallback } from "react";

const Transit = () => {
  const [refreshShipments, setRefreshShipments] = useState(false);

  const handleShipmentCreated = useCallback(() => {
    setRefreshShipments(true);
  }, []);

  const handleRefreshComplete = useCallback(() => {
    setRefreshShipments(false);
  }, []);

  return (
    <>
      <Helmet>
        <title>Shipper Transit | UrbanLift.AI</title>
        <meta name="description" content="Review and create shipments in transit with smart driver assignment." />
        <link rel="canonical" href="/shipper/transit" />
      </Helmet>
      <Layout>
        <main className="min-h-screen bg-gradient-to-br from-background via-delhi-primary/5 to-delhi-gold/5">
          <section className="container mx-auto px-4 py-10">
            <header className="mb-8 text-center">
              <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-delhi-navy to-delhi-primary bg-clip-text text-transparent">Review and Create Shipments in Transit</h1>
              <p className="text-delhi-navy/70 mt-2 text-lg">Create shipment requests with intelligent driver assignment.</p>
            </header>
            <section className="max-w-4xl mx-auto space-y-8">
              <ShipmentForm onCreated={handleShipmentCreated} />
              <ShipmentsList 
                refresh={refreshShipments} 
                onRefreshComplete={handleRefreshComplete} 
              />
            </section>
          </section>
        </main>
      </Layout>
    </>
  );
};

export default Transit;