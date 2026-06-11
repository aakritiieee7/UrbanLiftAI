import { supabase } from "@/integrations/supabase/client";

export type ShipmentEventType = 'created' | 'recommended' | 'assigned' | 'in_transit' | 'delivered';

export const logShipmentEvent = async (
  shipmentId: string,
  eventType: ShipmentEventType,
  title: string,
  description: string,
  metadata: any = {}
) => {
  try {
    const { data, error } = await supabase
      .from('shipment_events')
      .insert({
        shipment_id: shipmentId,
        event_type: eventType,
        event_title: title,
        event_description: description,
        metadata: metadata || {}
      });

    if (error) {
      console.error("Error inserting shipment audit event:", error);
      return { success: false, error };
    }

    // Auto-trigger notifications
    try {
      const { data: shipment } = await supabase
        .from('shipments')
        .select('shipper_id, carrier_id, origin, destination')
        .eq('id', shipmentId)
        .maybeSingle();

      if (shipment) {
        const originShort = shipment.origin ? shipment.origin.split(',')[0] : 'Origin';
        const destShort = shipment.destination ? shipment.destination.split(',')[0] : 'Destination';

        const notifsToCreate: any[] = [];

        if (eventType === 'created' && shipment.shipper_id) {
          notifsToCreate.push({
            user_id: shipment.shipper_id,
            shipment_id: shipmentId,
            title: 'Shipment Created 📝',
            message: `Your shipment from ${originShort} to ${destShort} has been created.`,
            type: 'created',
            read: false
          });
        } else if (eventType === 'assigned') {
          if (shipment.shipper_id) {
            notifsToCreate.push({
              user_id: shipment.shipper_id,
              shipment_id: shipmentId,
              title: 'Carrier Assigned 🤝',
              message: `A carrier has been assigned to your shipment to ${destShort}.`,
              type: 'assigned',
              read: false
            });
          }
          if (shipment.carrier_id) {
            notifsToCreate.push({
              user_id: shipment.carrier_id,
              shipment_id: shipmentId,
              title: 'New Job Assigned 📦',
              message: `You have been selected for a shipment from ${originShort} to ${destShort}.`,
              type: 'assigned',
              read: false
            });
          }
        } else if (eventType === 'in_transit' && shipment.shipper_id) {
          notifsToCreate.push({
            user_id: shipment.shipper_id,
            shipment_id: shipmentId,
            title: 'Shipment In Transit 🚛',
            message: `Your cargo is in transit from ${originShort} to ${destShort}.`,
            type: 'transit_started',
            read: false
          });
        } else if (eventType === 'delivered') {
          if (shipment.shipper_id) {
            notifsToCreate.push({
              user_id: shipment.shipper_id,
              shipment_id: shipmentId,
              title: 'Shipment Delivered 🎉',
              message: `Your shipment from ${originShort} to ${destShort} has been delivered.`,
              type: 'delivered',
              read: false
            });
          }
          if (shipment.carrier_id) {
            notifsToCreate.push({
              user_id: shipment.carrier_id,
              shipment_id: shipmentId,
              title: 'Delivery Confirmed ✅',
              message: `Your delivery to ${destShort} has been confirmed. Job completed!`,
              type: 'delivered',
              read: false
            });
          }
        }

        if (notifsToCreate.length > 0) {
          await supabase.from('notifications').insert(notifsToCreate);
          // Let's trigger a custom storage event so that navbar can update notifications in real-time
          window.dispatchEvent(new Event('mock-database-change'));
        }
      }
    } catch (notifErr) {
      console.error("Failed to generate auto-notifications:", notifErr);
    }

    return { success: true, data };
  } catch (err) {
    console.error("Failed to log shipment event:", err);
    return { success: false, error: err };
  }
};
