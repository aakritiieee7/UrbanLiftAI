import React from 'react';
import Layout from '@/components/Layout';
import { RouteOptimizer } from '@/components/route-optimization/RouteOptimizer';
import ShipmentPoolingManager from '@/components/route-optimization/ShipmentPoolingManager';

const RouteOptimization = () => {
  // Sample shipments for demonstration
  const sampleShipments = [
    {
      id: 'S001',
      pickup: { lat: 28.5360, lng: 77.2710 },
      drop: { lat: 28.8500, lng: 77.0860 },
      weight: 15,
      volume: 2.5,
      priority: 'high' as const
    },
    {
      id: 'S002', 
      pickup: { lat: 28.5370, lng: 77.2720 },
      drop: { lat: 28.8510, lng: 77.0870 },
      weight: 20,
      volume: 3.0,
      priority: 'medium' as const
    },
    {
      id: 'S003',
      pickup: { lat: 28.6360, lng: 77.1260 },
      drop: { lat: 28.5360, lng: 77.2710 },
      weight: 10,
      volume: 1.5,
      priority: 'low' as const
    },
    {
      id: 'S004',
      pickup: { lat: 28.6350, lng: 77.1250 },
      drop: { lat: 28.5370, lng: 77.2720 },
      weight: 25,
      volume: 4.0,
      priority: 'high' as const
    },
    {
      id: 'S005',
      pickup: { lat: 28.8500, lng: 77.0860 },
      drop: { lat: 28.6360, lng: 77.1260 },
      weight: 18,
      volume: 2.8,
      priority: 'medium' as const
    }
  ];

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-delhi-navy mb-4">
              AI Route Optimization
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Optimize your delivery routes using advanced AI algorithms for maximum efficiency and cost savings.
            </p>
          </div>
          
          <div className="space-y-8">
            <ShipmentPoolingManager />
            
            <div className="border-t pt-8">
              <h2 className="text-2xl font-semibold text-delhi-navy mb-4">Demo Route Optimizer</h2>
              <RouteOptimizer />
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default RouteOptimization;