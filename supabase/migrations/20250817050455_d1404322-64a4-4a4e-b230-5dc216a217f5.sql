-- Update shipments table to store proper latitude/longitude coordinates
-- Add separate columns for origin and destination coordinates
ALTER TABLE public.shipments 
ADD COLUMN IF NOT EXISTS origin_lat DECIMAL(10, 8),
ADD COLUMN IF NOT EXISTS origin_lng DECIMAL(11, 8),
ADD COLUMN IF NOT EXISTS destination_lat DECIMAL(10, 8),
ADD COLUMN IF NOT EXISTS destination_lng DECIMAL(11, 8),
ADD COLUMN IF NOT EXISTS origin_address TEXT,
ADD COLUMN IF NOT EXISTS destination_address TEXT;

-- Create spatial indexes for better performance with location queries
CREATE INDEX IF NOT EXISTS idx_shipments_origin_coords ON public.shipments(origin_lat, origin_lng);
CREATE INDEX IF NOT EXISTS idx_shipments_destination_coords ON public.shipments(destination_lat, destination_lng);