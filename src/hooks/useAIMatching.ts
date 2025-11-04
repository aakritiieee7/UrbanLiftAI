import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { aiMatchingEngine, type EnhancedShipment, type EnhancedCarrier } from '@/lib/ai-matching';
import { useToast } from '@/hooks/use-toast';

export interface AIMatchingResult {
  pools: any[];
  matches: any[];
  aiInsights: any;
  routeOptimization?: any;
}

export interface AIMatchingOptions {
  useAI?: boolean;
  maxPoolSize?: number;
  useTrafficPrediction?: boolean;
  prioritizeEfficiency?: boolean;
}

export const useAIMatching = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [aiInitialized, setAiInitialized] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    const initializeAI = async () => {
      try {
        await aiMatchingEngine.initialize();
        setAiInitialized(true);
      } catch (error) {
        console.warn('AI matching engine initialization failed:', error);
        setAiInitialized(false);
      }
    };

    initializeAI();
  }, []);

  const optimizeShipmentPooling = async (
    shipments: EnhancedShipment[],
    carriers: EnhancedCarrier[],
    options: AIMatchingOptions = {}
  ): Promise<AIMatchingResult | null> => {
    if (!shipments.length || !carriers.length) {
      toast({
        title: "Invalid Input",
        description: "Please provide shipments and carriers data",
        variant: "destructive"
      });
      return null;
    }

    setIsLoading(true);
    try {
      // Use Supabase Edge Function for AI-powered pooling
      const { data, error } = await supabase.functions.invoke('ai-shipment-pooling', {
        body: {
          shipments,
          carriers,
          options: {
            maxPoolSize: options.maxPoolSize || 3,
            useAI: aiInitialized && (options.useAI !== false),
            prioritizeEfficiency: options.prioritizeEfficiency !== false
          }
        }
      });

      if (error) throw error;

      if (data.success) {
        toast({
          title: "AI Pooling Complete",
          description: `Created ${data.pools.length} optimized pools with ${data.analytics.efficiency}% efficiency`,
        });

        return {
          pools: data.pools,
          matches: data.matches,
          aiInsights: data.analytics
        };
      } else {
        throw new Error(data.error || 'AI pooling failed');
      }
    } catch (error) {
      console.error('AI pooling error:', error);
      toast({
        title: "AI Pooling Error",
        description: error instanceof Error ? error.message : "Failed to optimize shipment pooling",
        variant: "destructive"
      });
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  const optimizeRoute = async (
    start: { lat: number; lng: number },
    end: { lat: number; lng: number },
    vehicleType: 'light' | 'medium' | 'heavy' | 'container',
    options: {
      avoidTraffic?: boolean;
      heavyVehicle?: boolean;
      industrialRoute?: boolean;
    } = {}
  ): Promise<any> => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('ai-route-optimization', {
        body: {
          start,
          end,
          vehicleType,
          options
        }
      });

      if (error) throw error;

      if (data.success) {
        toast({
          title: "Route Optimized",
          description: `Found optimal route with ${data.route.estimatedTime} min travel time`,
        });

        return data.route;
      } else {
        throw new Error(data.error || 'Route optimization failed');
      }
    } catch (error) {
      console.error('Route optimization error:', error);
      toast({
        title: "Route Optimization Error",
        description: error instanceof Error ? error.message : "Failed to optimize route",
        variant: "destructive"
      });
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  const getVehicleRecommendation = async (
    shipment: EnhancedShipment
  ): Promise<string | null> => {
    try {
      const distance = shipment.pickup && shipment.drop ? 
        calculateDistance(shipment.pickup, shipment.drop) : 0;
      
      const currentHour = new Date().getHours();
      const isPeakHour = (currentHour >= 8 && currentHour <= 11) || (currentHour >= 17 && currentHour <= 20);
      
      // AI-powered vehicle recommendation logic
      let recommendation = 'medium'; // default
      
      if (distance < 10) {
        recommendation = 'light';
      } else if (distance > 50) {
        recommendation = shipment.weight && shipment.weight > 1000 ? 'container' : 'heavy';
      } else if (distance > 30) {
        recommendation = 'heavy';
      }
      
      // Adjust for traffic conditions
      if (isPeakHour && (recommendation === 'heavy' || recommendation === 'container')) {
        recommendation = 'medium'; // Suggest smaller vehicle during peak hours
      }
      
      // Consider specified requirements
      if (shipment.vehicleTypeRequired) {
        recommendation = shipment.vehicleTypeRequired;
      }

      return recommendation;
    } catch (error) {
      console.error('Vehicle recommendation error:', error);
      return null;
    }
  };

  const getTrafficPrediction = async (
    route: { lat: number; lng: number }[]
  ): Promise<{ trafficScore: number; estimatedDelay: number } | null> => {
    try {
      const currentHour = new Date().getHours();
      const dayOfWeek = new Date().getDay();
      
      // Simplified traffic prediction
      let trafficScore = 0.3; // Base traffic
      
      if ((currentHour >= 8 && currentHour <= 11) || (currentHour >= 17 && currentHour <= 20)) {
        trafficScore = 0.8; // Peak hours
      } else if ((currentHour >= 7 && currentHour <= 8) || (currentHour >= 16 && currentHour <= 17)) {
        trafficScore = 0.6; // Pre-peak
      }
      
      // Weekend adjustment
      if (dayOfWeek === 0 || dayOfWeek === 6) {
        trafficScore *= 0.7;
      }
      
      const estimatedDelay = Math.round(trafficScore * 20); // Minutes of delay
      
      return { trafficScore, estimatedDelay };
    } catch (error) {
      console.error('Traffic prediction error:', error);
      return null;
    }
  };

  return {
    isLoading,
    aiInitialized,
    optimizeShipmentPooling,
    optimizeRoute,
    getVehicleRecommendation,
    getTrafficPrediction
  };
};

// Utility function to calculate distance
function calculateDistance(
  pointA: { lat: number; lng: number },
  pointB: { lat: number; lng: number }
): number {
  const R = 6371; // Earth's radius in km
  const dLat = toRad(pointB.lat - pointA.lat);
  const dLon = toRad(pointB.lng - pointA.lng);
  const lat1 = toRad(pointA.lat);
  const lat2 = toRad(pointB.lat);
  
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
           Math.cos(lat1) * Math.cos(lat2) *
           Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  
  return R * c;
}

function toRad(deg: number): number {
  return deg * (Math.PI / 180);
}