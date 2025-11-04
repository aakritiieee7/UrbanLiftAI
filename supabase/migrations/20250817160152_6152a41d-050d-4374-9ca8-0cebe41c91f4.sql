-- Add payment columns to shipments table
ALTER TABLE public.shipments 
ADD COLUMN payment_amount NUMERIC,
ADD COLUMN payment_status TEXT DEFAULT 'pending',
ADD COLUMN payment_id TEXT,
ADD COLUMN distance_km NUMERIC;

-- Create payment_transactions table for detailed tracking
CREATE TABLE public.payment_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shipment_id UUID REFERENCES public.shipments(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  amount NUMERIC NOT NULL,
  currency TEXT DEFAULT 'INR',
  payment_method TEXT DEFAULT 'razorpay',
  payment_id TEXT,
  payment_status TEXT DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS on payment_transactions
ALTER TABLE public.payment_transactions ENABLE ROW LEVEL SECURITY;

-- Policy for users to view their own payment transactions
CREATE POLICY "Users can view their own payment transactions"
ON public.payment_transactions
FOR SELECT
USING (auth.uid() = user_id);

-- Policy for users to insert their own payment transactions
CREATE POLICY "Users can insert their own payment transactions"
ON public.payment_transactions
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Policy for edge functions to update payment transactions
CREATE POLICY "Service can update payment transactions"
ON public.payment_transactions
FOR UPDATE
USING (true);

-- Create trigger for updated_at column
CREATE TRIGGER update_payment_transactions_updated_at
BEFORE UPDATE ON public.payment_transactions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();