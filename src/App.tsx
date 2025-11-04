import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import { AuthProvider } from "@/contexts/AuthContext";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import ShipperLogin from "./pages/auth/ShipperLogin";
import ShipperRegister from "./pages/auth/ShipperRegister";
import CarrierLogin from "./pages/auth/CarrierLogin";
import CarrierRegister from "./pages/auth/CarrierRegister";
import RouteOptimization from "./pages/RouteOptimization";

import CarrierDashboard from "./pages/dashboard/CarrierDashboard";
import AvailableShipments from "./pages/carrier/AvailableShipments";
import Community from "./pages/Community";
import Leaderboard from "./pages/Leaderboard";
import ProfileSetup from "./pages/ProfileSetup";
import Profile from "./pages/Profile";
import PublicTransits from "./pages/PublicTransits";

import CarrierHome from "./pages/carrier/Home";
import CarrierTransit from "./pages/carrier/Transit";
import CarrierTrack from "./pages/carrier/Track";
import CarrierCommunity from "./pages/carrier/Community";
import CarrierAnalytics from "./pages/carrier/Analytics";
import ShipperTransit from "./pages/shipper/Transit";
import ShipperTrack from "./pages/shipper/Track";
import ShipperCommunity from "./pages/shipper/Community";
import ShipperAnalytics from "./pages/shipper/Analytics";
import ShipperPooling from "./pages/shipper/Pooling";
import ShipperHome from "./pages/shipper/Home";
const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <HelmetProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AuthProvider>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/auth/shipper/login" element={<ShipperLogin />} />
            <Route path="/auth/shipper/register" element={<ShipperRegister />} />
            <Route path="/auth/carrier/login" element={<CarrierLogin />} />
            <Route path="/auth/carrier/register" element={<CarrierRegister />} />
            
            <Route path="/carrier-dashboard" element={<CarrierDashboard />} />
            <Route path="/carrier/available" element={<AvailableShipments />} />
            <Route path="/community" element={<Community />} />
            <Route path="/leaderboard" element={<Leaderboard />} />
            <Route path="/transits" element={<PublicTransits />} />
            <Route path="/route-optimization" element={<RouteOptimization />} />
            
            <Route path="/profile-setup" element={<ProfileSetup />} />
<Route path="/profile" element={<Profile />} />
{/* Shipper section pages */}
          <Route path="/shipper/home" element={<ShipperHome />} />
          <Route path="/shipper/transit" element={<ShipperTransit />} />
          <Route path="/shipper/track" element={<ShipperTrack />} />
           <Route path="/shipper/community" element={<ShipperCommunity />} />
           <Route path="/shipper/pooling" element={<ShipperPooling />} />
           <Route path="/shipper/analytics" element={<ShipperAnalytics />} />
{/* Carrier section pages */}
<Route path="/carrier/home" element={<CarrierHome />} />
<Route path="/carrier/transit" element={<CarrierTransit />} />
<Route path="/carrier/track" element={<CarrierTrack />} />
<Route path="/carrier/community" element={<CarrierCommunity />} />
<Route path="/carrier/analytics" element={<CarrierAnalytics />} />
{/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
<Route path="*" element={<NotFound />} />
          </Routes>
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </HelmetProvider>
  </QueryClientProvider>
);

export default App;
