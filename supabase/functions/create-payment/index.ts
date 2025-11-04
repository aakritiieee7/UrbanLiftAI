import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Create Supabase client
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? ""
    );

    // Get authenticated user
    const authHeader = req.headers.get("Authorization")!;
    const token = authHeader.replace("Bearer ", "");
    const { data } = await supabaseClient.auth.getUser(token);
    const user = data.user;
    
    if (!user) {
      throw new Error("User not authenticated");
    }

    const { shipmentData, distanceKm, carrierData } = await req.json();
    
    // Base cost calculation
    const weightCost = (shipmentData.capacity_kg || 0) * 10; // ₹10 per kg
    const distanceCost = (distanceKm || 0) * 5; // ₹5 per km
    const basePrice = 50;
    let baseCost = basePrice + weightCost + distanceCost;
    
    // Apply carrier-specific multipliers
    let finalMultiplier = 1.0;
    
    if (carrierData) {
      // Experience Level Adjustments
      const yearsExp = carrierData.years_experience || 0;
      if (yearsExp < 0.5) {
        finalMultiplier *= 0.8; // New drivers: 20% discount
      } else if (yearsExp >= 2) {
        finalMultiplier *= 1.1; // Experienced: 10% premium
      }
      
      // Rating-based Pricing
      const rating = carrierData.rating || 3;
      if (rating >= 5) {
        finalMultiplier *= 1.15; // 5-star: 15% premium
      } else if (rating >= 4) {
        finalMultiplier *= 1.05; // 4+ stars: 5% premium
      } else if (rating < 4) {
        finalMultiplier *= 0.9; // Below 4 stars: 10% discount
      }
      
      // Vehicle Type Adjustments
      const vehicleType = carrierData.vehicle_type || 'medium';
      if (vehicleType === 'light') {
        finalMultiplier *= 0.9; // Light vehicles: 10% discount
      } else if (vehicleType === 'heavy' || vehicleType === 'container') {
        finalMultiplier *= 1.2; // Heavy/Container: 20% premium
      }
    }
    
    // Distance Adjustments
    if (distanceKm >= 50) {
      finalMultiplier *= 0.95; // Long distance: 5% discount
    } else if (distanceKm < 10) {
      finalMultiplier *= 1.05; // Short distance: 5% premium
    }
    
    const totalAmount = Math.round(baseCost * finalMultiplier);
    
    console.log(`Payment calculation: Base(₹${baseCost}) × Multiplier(${finalMultiplier.toFixed(2)}) = ₹${totalAmount}`);

    // Simulate Razorpay order creation (fake API)
    const fakeOrderId = `order_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Create fake Razorpay order response
    const fakeOrder = {
      id: fakeOrderId,
      amount: totalAmount * 100, // Razorpay expects amount in paise
      currency: "INR",
      status: "created",
      receipt: `receipt_${Date.now()}`,
      created_at: Math.floor(Date.now() / 1000)
    };

    // Store payment transaction in database using service role for RLS bypass
    const supabaseService = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const { data: paymentTransaction, error: paymentError } = await supabaseService
      .from('payment_transactions')
      .insert({
        user_id: user.id,
        amount: totalAmount,
        currency: 'INR',
        payment_method: 'razorpay',
        payment_id: fakeOrderId,
        payment_status: 'created'
      })
      .select()
      .single();

    if (paymentError) {
      console.error('Error creating payment transaction:', paymentError);
      throw new Error('Failed to create payment transaction');
    }

    return new Response(JSON.stringify({
      success: true,
      order: fakeOrder,
      amount: totalAmount,
      currency: "INR",
      transactionId: paymentTransaction.id
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    console.error('Error in create-payment function:', error);
    return new Response(JSON.stringify({ 
      success: false,
      error: error.message 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});