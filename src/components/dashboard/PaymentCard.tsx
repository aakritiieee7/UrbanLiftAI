import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { CreditCard, Smartphone, Building2 } from "lucide-react";

interface PaymentCardProps {
  amount: number;
  description: string;
  onPaymentSuccess?: () => void;
}

const PaymentCard = ({ amount, description, onPaymentSuccess }: PaymentCardProps) => {
  const [paymentMethod, setPaymentMethod] = useState<string>("");
  const [upiId, setUpiId] = useState("");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handlePayment = async () => {
    if (!paymentMethod) {
      toast({ title: "Select payment method", description: "Please choose a payment option." });
      return;
    }

    if (paymentMethod === "upi" && !upiId) {
      toast({ title: "UPI ID required", description: "Please enter your UPI ID." });
      return;
    }

    setLoading(true);
    
    // Simulate payment processing
    setTimeout(() => {
      toast({ 
        title: "Payment Successful", 
        description: `₹${amount} paid via ${paymentMethod.toUpperCase()}` 
      });
      setLoading(false);
      onPaymentSuccess?.();
    }, 2000);
  };

  return (
    <Card className="border-delhi-primary/20 bg-gradient-to-br from-background to-muted/30">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CreditCard className="h-5 w-5 text-delhi-primary" />
          Payment Gateway
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="bg-gradient-to-r from-delhi-primary/10 to-delhi-gold/10 p-4 rounded-lg">
          <div className="text-sm text-muted-foreground">Amount to pay</div>
          <div className="text-2xl font-bold text-delhi-primary">₹{amount.toLocaleString()}</div>
          <div className="text-sm text-muted-foreground">{description}</div>
        </div>

        <div className="space-y-4">
          <Label>Payment Method</Label>
          <Select value={paymentMethod} onValueChange={setPaymentMethod}>
            <SelectTrigger>
              <SelectValue placeholder="Choose payment method" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="upi">
                <div className="flex items-center gap-2">
                  <Smartphone className="h-4 w-4" />
                  UPI (PhonePe, GPay, Paytm)
                </div>
              </SelectItem>
              <SelectItem value="card">
                <div className="flex items-center gap-2">
                  <CreditCard className="h-4 w-4" />
                  Debit/Credit Card
                </div>
              </SelectItem>
              <SelectItem value="netbanking">
                <div className="flex items-center gap-2">
                  <Building2 className="h-4 w-4" />
                  Net Banking
                </div>
              </SelectItem>
            </SelectContent>
          </Select>

          {paymentMethod === "upi" && (
            <div>
              <Label htmlFor="upi">UPI ID</Label>
              <Input
                id="upi"
                placeholder="your-id@upi"
                value={upiId}
                onChange={(e) => setUpiId(e.target.value)}
              />
            </div>
          )}

          <Button 
            onClick={handlePayment} 
            disabled={loading || !paymentMethod}
            className="w-full bg-gradient-to-r from-delhi-primary to-delhi-gold hover:from-delhi-primary/80 hover:to-delhi-gold/80"
            size="lg"
          >
            {loading ? "Processing..." : `Pay ₹${amount.toLocaleString()}`}
          </Button>
        </div>

        <div className="text-xs text-muted-foreground text-center space-y-1">
          <div>🔒 Secured by 256-bit SSL encryption</div>
          <div>Supported: Razorpay • Paytm • PhonePe • GPay</div>
        </div>
      </CardContent>
    </Card>
  );
};

export default PaymentCard;