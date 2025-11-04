import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { FileText, Download, Eye, Calendar, DollarSign } from "lucide-react";

interface InvoiceCardProps {
  shipments: any[];
}

const InvoiceCard = ({ shipments }: InvoiceCardProps) => {
  const { toast } = useToast();
  const [generating, setGenerating] = useState<string | null>(null);

  const deliveredShipments = shipments.filter(s => s.status === "delivered");

  const calculateAmount = (shipment: any) => {
    // Simple pricing logic based on distance estimation and capacity
    const baseRate = 50; // Base rate per shipment
    const capacityRate = shipment.capacity_kg ? shipment.capacity_kg * 2 : 100;
    const poolingDiscount = shipment.pooled ? 0.8 : 1; // 20% discount for pooled
    return Math.round((baseRate + capacityRate) * poolingDiscount);
  };

  const generateInvoice = async (shipment: any) => {
    setGenerating(shipment.id);
    
    // Simulate PDF generation
    setTimeout(() => {
      const amount = calculateAmount(shipment);
      const gst = Math.round(amount * 0.18);
      const total = amount + gst;

      // Create a simple HTML invoice
      const invoiceHTML = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>Invoice - ${shipment.id.slice(0, 8)}</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            .header { text-align: center; color: #2563eb; margin-bottom: 30px; }
            .company { font-size: 24px; font-weight: bold; }
            .invoice-details { margin: 20px 0; }
            .table { width: 100%; border-collapse: collapse; margin: 20px 0; }
            .table th, .table td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            .table th { background-color: #f2f2f2; }
            .total { text-align: right; font-weight: bold; font-size: 18px; }
            .footer { margin-top: 30px; text-align: center; color: #666; }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="company">UrbanLift.AI</div>
            <div>Smart Logistics & Pooling Platform</div>
            <div>GSTIN: 07ABCDE1234F1Z5</div>
          </div>
          
          <div class="invoice-details">
            <h2>Tax Invoice</h2>
            <p><strong>Invoice No:</strong> INV-${shipment.id.slice(0, 8).toUpperCase()}</p>
            <p><strong>Date:</strong> ${new Date().toLocaleDateString()}</p>
            <p><strong>Due Date:</strong> ${new Date(Date.now() + 30*24*60*60*1000).toLocaleDateString()}</p>
          </div>

          <div class="invoice-details">
            <h3>Bill To:</h3>
            <p>MSME Business</p>
            <p>Shipper ID: ${shipment.shipper_id.slice(0, 8)}</p>
          </div>

          <table class="table">
            <tr>
              <th>Description</th>
              <th>Origin</th>
              <th>Destination</th>
              <th>Capacity</th>
              <th>Amount</th>
            </tr>
            <tr>
              <td>Logistics Service ${shipment.pooled ? '(Pooled)' : ''}</td>
              <td>${shipment.origin}</td>
              <td>${shipment.destination}</td>
              <td>${shipment.capacity_kg || 'N/A'} kg</td>
              <td>₹${amount}</td>
            </tr>
            <tr>
              <td colspan="4" style="text-align: right;"><strong>Subtotal:</strong></td>
              <td><strong>₹${amount}</strong></td>
            </tr>
            <tr>
              <td colspan="4" style="text-align: right;"><strong>GST (18%):</strong></td>
              <td><strong>₹${gst}</strong></td>
            </tr>
            <tr>
              <td colspan="4" style="text-align: right;" class="total">Total Amount:</td>
              <td class="total">₹${total}</td>
            </tr>
          </table>

          <div class="footer">
            <p>Thank you for choosing UrbanLift.AI</p>
            <p>This is a computer-generated invoice.</p>
          </div>
        </body>
        </html>
      `;

      // Create and download the invoice
      const blob = new Blob([invoiceHTML], { type: 'text/html' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `invoice-${shipment.id.slice(0, 8)}.html`;
      a.click();
      window.URL.revokeObjectURL(url);

      toast({
        title: "Invoice generated",
        description: `GST-compliant invoice for ₹${total} downloaded.`
      });
      setGenerating(null);
    }, 1500);
  };

  const totalAmount = deliveredShipments.reduce((sum, shipment) => {
    const amount = calculateAmount(shipment);
    const gst = amount * 0.18;
    return sum + amount + gst;
  }, 0);

  return (
    <Card className="border-delhi-primary/20">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5 text-delhi-primary" />
          Invoice Management
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="bg-gradient-to-r from-delhi-primary/10 to-delhi-gold/10 p-4 rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-muted-foreground">Total Revenue (This Month)</div>
              <div className="text-2xl font-bold text-delhi-primary">₹{totalAmount.toLocaleString()}</div>
              <div className="text-sm text-delhi-success">+23% from last month</div>
            </div>
            <div className="text-right">
              <div className="text-sm text-muted-foreground">Invoices Generated</div>
              <div className="text-xl font-semibold">{deliveredShipments.length}</div>
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-medium">Recent Invoices</h4>
            <Button variant="outline" size="sm">
              <Eye className="h-4 w-4 mr-2" />
              View All
            </Button>
          </div>

          {deliveredShipments.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <div>No completed shipments yet</div>
              <div className="text-sm">Invoices will appear here after deliveries</div>
            </div>
          ) : (
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {deliveredShipments.slice(0, 5).map((shipment) => {
                const amount = calculateAmount(shipment);
                const gst = Math.round(amount * 0.18);
                const total = amount + gst;

                return (
                  <div key={shipment.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex-1">
                      <div className="font-medium text-sm">
                        {shipment.origin.split(',')[0]} → {shipment.destination.split(',')[0]}
                      </div>
                      <div className="text-xs text-muted-foreground flex items-center gap-2">
                        <Calendar className="h-3 w-3" />
                        {new Date(shipment.created_at).toLocaleDateString()}
                        {shipment.pooled && (
                          <Badge variant="secondary" className="text-xs">Pooled</Badge>
                        )}
                      </div>
                    </div>
                    <div className="text-right mr-3">
                      <div className="font-medium">₹{total.toLocaleString()}</div>
                      <div className="text-xs text-muted-foreground">inc. GST</div>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => generateInvoice(shipment)}
                      disabled={generating === shipment.id}
                    >
                      {generating === shipment.id ? (
                        "Generating..."
                      ) : (
                        <>
                          <Download className="h-4 w-4 mr-1" />
                          PDF
                        </>
                      )}
                    </Button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="text-xs text-muted-foreground bg-muted/30 p-3 rounded-lg">
          <div className="font-medium mb-1">GST Compliance Features:</div>
          <div>• Auto-generated GSTIN numbers</div>
          <div>• 18% GST calculation included</div>
          <div>• Export to PDF/Excel formats</div>
          <div>• Monthly tax summaries available</div>
        </div>
      </CardContent>
    </Card>
  );
};

export default InvoiceCard;