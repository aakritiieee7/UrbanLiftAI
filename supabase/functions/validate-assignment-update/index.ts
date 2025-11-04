import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { shipmentId, newCarrierId, currentUserId } = await req.json();
    
    console.log(`Validating assignment update for shipment ${shipmentId}`);

    // Get the current shipment state
    const { data: shipment, error: shipmentError } = await supabase
      .from('shipments')
      .select('id, status, carrier_id, shipper_id')
      .eq('id', shipmentId)
      .single();

    if (shipmentError || !shipment) {
      console.error('Shipment not found:', shipmentError);
      return new Response(
        JSON.stringify({ error: 'Shipment not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Security check: Only the shipper who created the shipment can modify assignments
    if (shipment.shipper_id !== currentUserId) {
      console.error('Unauthorized assignment attempt by user:', currentUserId);
      return new Response(
        JSON.stringify({ error: 'Unauthorized: You can only modify assignments for your own shipments' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Business rule: Can only modify assignments if no carrier is currently assigned
    if (shipment.carrier_id) {
      console.error(`Cannot modify assignment - carrier already assigned: ${shipment.carrier_id}`);
      return new Response(
        JSON.stringify({ 
          error: 'Assignment cannot be changed once a carrier is selected',
          currentCarrier: shipment.carrier_id 
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // If unassigning (newCarrierId is null or empty)
    if (!newCarrierId || newCarrierId === 'unassign') {
      const { error: updateError } = await supabase
        .from('shipments')
        .update({ 
          carrier_id: null,
          status: 'pending'
        })
        .eq('id', shipmentId)
        .eq('status', 'pending'); // Double-check status hasn't changed

      if (updateError) {
        console.error('Failed to unassign carrier:', updateError);
        return new Response(
          JSON.stringify({ error: 'Failed to unassign carrier' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      console.log(`Successfully unassigned carrier from shipment ${shipmentId}`);
      return new Response(
        JSON.stringify({ message: 'Carrier unassigned successfully' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate the new carrier exists
    const { data: carrier, error: carrierError } = await supabase
      .from('carrier_profiles')
      .select('user_id')
      .eq('user_id', newCarrierId)
      .single();

    if (carrierError || !carrier) {
      console.error('Carrier not found:', newCarrierId);
      return new Response(
        JSON.stringify({ error: 'Carrier not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Assign the new carrier
    const { error: updateError } = await supabase
      .from('shipments')
      .update({ 
        carrier_id: newCarrierId,
        status: 'assigned'
      })
      .eq('id', shipmentId)
      .eq('status', 'pending'); // Double-check status hasn't changed

    if (updateError) {
      console.error('Failed to assign carrier:', updateError);
      return new Response(
        JSON.stringify({ error: 'Failed to assign carrier' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Successfully assigned carrier ${newCarrierId} to shipment ${shipmentId}`);
    return new Response(
      JSON.stringify({ 
        message: 'Carrier assigned successfully', 
        carrierId: newCarrierId 
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Validation error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});