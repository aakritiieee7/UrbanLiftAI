import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, CreditCard, Check, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface RazorpayPaymentProps {
  shipmentData: any;
  distanceKm: number;
  onPaymentSuccess: (shipment: any) => void;
  onPaymentFailure: () => void;
}

const RazorpayPayment = ({ 
  shipmentData, 
  distanceKm, 
  onPaymentSuccess, 
  onPaymentFailure 
}: RazorpayPaymentProps) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentStep, setPaymentStep] = useState<'calculate' | 'processing' | 'confirm'>('calculate');
  const [paymentDetails, setPaymentDetails] = useState<any>(null);
  const { toast } = useToast();

  // Calculate cost breakdown
  const weightCost = shipmentData.capacity_kg * 10; // ₹10 per kg
  const distanceCost = distanceKm * 5; // ₹5 per km
  const totalAmount = Math.round(weightCost + distanceCost);

  const handleCreatePayment = async () => {
    setIsProcessing(true);
    setPaymentStep('processing');

    try {
      const { data, error } = await supabase.functions.invoke('create-payment', {
        body: { shipmentData, distanceKm }
      });

      if (error) throw error;

      if (data.success) {
        setPaymentDetails(data);
        setPaymentStep('confirm');
        toast({
          title: "Payment Order Created",
          description: `Payment of ₹${data.amount} created successfully`,
        });
      } else {
        throw new Error(data.error || 'Failed to create payment');
      }
    } catch (error) {
      console.error('Payment creation error:', error);
      toast({
        title: "Payment Error",
        description: error.message || "Failed to create payment order",
        variant: "destructive",
      });
      onPaymentFailure();
    } finally {
      setIsProcessing(false);
    }
  };

  const handleConfirmPayment = async (success: boolean) => {
    setIsProcessing(true);

    try {
      const { data, error } = await supabase.functions.invoke('verify-payment', {
        body: {
          paymentId: paymentDetails.order.id,
          paymentStatus: success ? 'success' : 'failed',
          transactionId: paymentDetails.transactionId,
          shipmentData,
          distanceKm
        }
      });

      if (error) throw error;

      if (data.success) {
        toast({
          title: "Payment Successful!",
          description: "Your shipment has been created successfully",
        });
        onPaymentSuccess(data.shipment);
      } else {
        throw new Error(data.message || 'Payment verification failed');
      }
    } catch (error) {
      console.error('Payment verification error:', error);
      toast({
        title: "Payment Failed",
        description: error.message || "Payment verification failed",
        variant: "destructive",
      });
      onPaymentFailure();
    } finally {
      setIsProcessing(false);
    }
  };

  if (paymentStep === 'calculate') {
    return (
      <Card className="w-full max-w-md mx-auto">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Payment Details
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <div className="flex justify-between">
              <span>Weight Cost ({shipmentData.capacity_kg} kg × ₹10)</span>
              <span>₹{weightCost}</span>
            </div>
            <div className="flex justify-between">
              <span>Distance Cost ({distanceKm} km × ₹5)</span>
              <span>₹{distanceCost}</span>
            </div>
            <hr />
            <div className="flex justify-between font-semibold text-lg">
              <span>Total Amount</span>
              <span>₹{totalAmount}</span>
            </div>
          </div>
          
          <Button 
            onClick={handleCreatePayment}
            disabled={isProcessing}
            className="w-full"
          >
            {isProcessing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creating Payment...
              </>
            ) : (
              'Proceed to Payment'
            )}
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (paymentStep === 'processing') {
    return (
      <Card className="w-full max-w-md mx-auto">
        <CardContent className="pt-6">
          <div className="text-center space-y-4">
            <Loader2 className="h-8 w-8 animate-spin mx-auto" />
            <p>Creating payment order...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (paymentStep === 'confirm') {
    return (
      <Card className="w-full max-w-md mx-auto">
        <CardHeader>
          <CardTitle>Fake Razorpay Payment</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-muted p-4 rounded-lg space-y-2">
            <p><strong>Order ID:</strong> {paymentDetails.order.id}</p>
            <p><strong>Amount:</strong> ₹{paymentDetails.amount}</p>
            <p><strong>Status:</strong> {paymentDetails.order.status}</p>
          </div>
          
          <div className="text-sm text-muted-foreground">
            This is a fake payment simulation. Choose your payment result:
          </div>
          
          <div className="flex gap-2">
            <Button 
              onClick={() => handleConfirmPayment(true)}
              disabled={isProcessing}
              className="flex-1"
              variant="default"
            >
              {isProcessing ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Check className="mr-2 h-4 w-4" />
              )}
              Simulate Success
            </Button>
            
            <Button 
              onClick={() => handleConfirmPayment(false)}
              disabled={isProcessing}
              variant="destructive"
              className="flex-1"
            >
              <X className="mr-2 h-4 w-4" />
              Simulate Failure
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return null;
};

export default RazorpayPayment;