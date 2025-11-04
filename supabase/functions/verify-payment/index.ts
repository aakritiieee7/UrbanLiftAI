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
    // Create Supabase client with service role for bypassing RLS
    const supabaseService = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const { paymentId, paymentStatus, transactionId, shipmentData, distanceKm } = await req.json();
    
    console.log(`Verifying payment: ${paymentId}, Status: ${paymentStatus}`);

    // Simulate payment verification (in real Razorpay, you'd verify the signature)
    const isPaymentValid = paymentStatus === 'success';
    
    if (isPaymentValid) {
      // Update payment transaction status
      const { error: updateError } = await supabaseService
        .from('payment_transactions')
        .update({ 
          payment_status: 'success',
          updated_at: new Date().toISOString()
        })
        .eq('id', transactionId);

      if (updateError) {
        console.error('Error updating payment transaction:', updateError);
        throw new Error('Failed to update payment transaction');
      }

      // Calculate payment amount
      const weightCost = shipmentData.capacity_kg * 10;
      const distanceCost = distanceKm * 5;
      const totalAmount = Math.round(weightCost + distanceCost);

      // Create shipment with payment details
      const { data: shipment, error: shipmentError } = await supabaseService
        .from('shipments')
        .insert({
          ...shipmentData,
          payment_amount: totalAmount,
          payment_status: 'paid',
          payment_id: paymentId,
          distance_km: distanceKm,
          status: 'pending' // Ready to be picked up by carriers
        })
        .select()
        .single();

      if (shipmentError) {
        console.error('Error creating shipment:', shipmentError);
        throw new Error('Failed to create shipment');
      }

      return new Response(JSON.stringify({
        success: true,
        shipment,
        message: 'Payment verified and shipment created successfully'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });
    } else {
      // Update payment transaction as failed
      await supabaseService
        .from('payment_transactions')
        .update({ 
          payment_status: 'failed',
          updated_at: new Date().toISOString()
        })
        .eq('id', transactionId);

      return new Response(JSON.stringify({
        success: false,
        message: 'Payment verification failed'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      });
    }

  } catch (error) {
    console.error('Error in verify-payment function:', error);
    return new Response(JSON.stringify({ 
      success: false,
      error: error.message 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});