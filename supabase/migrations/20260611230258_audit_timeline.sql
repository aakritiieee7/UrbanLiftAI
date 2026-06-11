-- Create shipment_events table for auditing
CREATE TABLE IF NOT EXISTS public.shipment_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shipment_id UUID NOT NULL REFERENCES public.shipments(id) ON DELETE CASCADE,
  event_type VARCHAR(50) NOT NULL, -- 'created', 'recommended', 'assigned', 'in_transit', 'delivered'
  event_title VARCHAR(100) NOT NULL,
  event_description TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Enable RLS
ALTER TABLE public.shipment_events ENABLE ROW LEVEL SECURITY;

-- Select policies
CREATE POLICY "Shippers can view events for their shipments" ON public.shipment_events
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.shipments
      WHERE shipments.id = shipment_events.shipment_id
      AND shipments.shipper_id = auth.uid()
    )
  );

CREATE POLICY "Carriers can view events for their assigned shipments" ON public.shipment_events
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.shipments
      WHERE shipments.id = shipment_events.shipment_id
      AND shipments.carrier_id = auth.uid()
    )
  );

-- Insert policies (allow authenticated inserts)
CREATE POLICY "Allow inserts of shipment events for active users" ON public.shipment_events
  FOR INSERT WITH CHECK (
    auth.role() = 'authenticated'
  );
