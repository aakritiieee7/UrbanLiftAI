import { useState, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { Upload, Download, FileSpreadsheet, AlertCircle, CheckCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface BulkUploadCardProps {
  onUploaded?: () => void;
}

const BulkUploadCard = ({ onUploaded }: BulkUploadCardProps) => {
  const { userId } = useAuth();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [uploadStats, setUploadStats] = useState({ success: 0, failed: 0, total: 0 });

  const downloadTemplate = () => {
    const csvContent = `Origin,Destination,Capacity (kg),Pickup Time,Dropoff Time
"Connaught Place, Delhi","Gurgaon Sector 29",25,2024-12-20T10:00,2024-12-20T14:00
"Dwarka Sector 21","Noida Sector 62",50,2024-12-20T11:00,2024-12-20T15:00
"Lajpat Nagar","Faridabad",30,2024-12-20T09:00,2024-12-20T13:00`;
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'shipments_template.csv';
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const parseCSV = (text: string): any[] => {
    const lines = text.split('\n').filter(line => line.trim());
    if (lines.length < 2) return [];
    
    const headers = lines[0].split(',').map(h => h.replace(/"/g, '').trim());
    const rows = lines.slice(1);
    
    return rows.map(row => {
      const values = row.split(',').map(v => v.replace(/"/g, '').trim());
      const obj: any = {};
      headers.forEach((header, index) => {
        obj[header.toLowerCase().replace(/[^a-z0-9]/g, '_')] = values[index] || '';
      });
      return obj;
    });
  };

  const validateShipment = (shipment: any): string | null => {
    if (!shipment.origin) return 'Missing origin';
    if (!shipment.destination) return 'Missing destination';
    if (shipment.capacity__kg_ && isNaN(Number(shipment.capacity__kg_))) return 'Invalid capacity';
    return null;
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!userId) {
      toast({ title: "Login required", description: "Please login to upload shipments." });
      return;
    }

    if (!file.name.endsWith('.csv')) {
      toast({ title: "Invalid file type", description: "Please upload a CSV file." });
      return;
    }

    setUploading(true);
    setProgress(0);
    setUploadStats({ success: 0, failed: 0, total: 0 });

    try {
      const text = await file.text();
      const shipments = parseCSV(text);
      
      if (shipments.length === 0) {
        toast({ title: "Empty file", description: "No valid shipments found in the file." });
        setUploading(false);
        return;
      }

      setUploadStats(prev => ({ ...prev, total: shipments.length }));

      let success = 0;
      let failed = 0;

      for (let i = 0; i < shipments.length; i++) {
        const shipment = shipments[i];
        const validationError = validateShipment(shipment);
        
        if (validationError) {
          failed++;
          setUploadStats(prev => ({ ...prev, failed: prev.failed + 1 }));
        } else {
          try {
            const { error } = await supabase.from("shipments").insert({
              origin: shipment.origin,
              destination: shipment.destination,
              shipper_id: userId,
              capacity_kg: shipment.capacity__kg_ ? Number(shipment.capacity__kg_) : null,
              pickup_time: shipment.pickup_time || null,
              dropoff_time: shipment.dropoff_time || null,
              status: "pending"
            });

            if (error) throw error;
            success++;
            setUploadStats(prev => ({ ...prev, success: prev.success + 1 }));
          } catch (error) {
            failed++;
            setUploadStats(prev => ({ ...prev, failed: prev.failed + 1 }));
          }
        }

        setProgress(((i + 1) / shipments.length) * 100);
        // Small delay to show progress
        await new Promise(resolve => setTimeout(resolve, 50));
      }

      // Award points for bulk upload
      if (success > 0) {
        await supabase.rpc("award_points", { 
          _user_id: userId, 
          _points: success * 2, 
          _source: "bulk_upload" 
        });
      }

      toast({
        title: "Upload completed",
        description: `${success} shipments uploaded successfully, ${failed} failed.`
      });

      onUploaded?.();
    } catch (error) {
      toast({ title: "Upload failed", description: "Error processing the file." });
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  return (
    <Card className="border-delhi-primary/20">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileSpreadsheet className="h-5 w-5 text-delhi-primary" />
          Bulk Shipment Upload
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="text-sm text-muted-foreground">
          Upload multiple shipments at once using CSV/Excel files. Perfect for MSMEs with regular shipping needs.
        </div>

        <div className="flex gap-2">
          <Button 
            variant="outline" 
            onClick={downloadTemplate}
            className="flex items-center gap-2"
          >
            <Download className="h-4 w-4" />
            Download Template
          </Button>

          <Button 
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="flex items-center gap-2 bg-gradient-to-r from-delhi-primary to-delhi-gold hover:from-delhi-primary/80 hover:to-delhi-gold/80"
          >
            <Upload className="h-4 w-4" />
            Upload CSV
          </Button>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept=".csv"
          onChange={handleFileUpload}
          className="hidden"
        />

        {uploading && (
          <div className="space-y-3">
            <div className="flex justify-between text-sm">
              <span>Uploading shipments...</span>
              <span>{Math.round(progress)}%</span>
            </div>
            <Progress value={progress} className="w-full" />
            
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-delhi-success" />
                <span>Success: {uploadStats.success}</span>
              </div>
              <div className="flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-delhi-orange" />
                <span>Failed: {uploadStats.failed}</span>
              </div>
              <div className="text-muted-foreground">
                Total: {uploadStats.total}
              </div>
            </div>
          </div>
        )}

        <div className="bg-muted/30 p-3 rounded-lg text-xs space-y-1">
          <div className="font-medium">CSV Format Requirements:</div>
          <div>• Required: Origin, Destination</div>
          <div>• Optional: Capacity (kg), Pickup Time, Dropoff Time</div>
          <div>• Date format: YYYY-MM-DDTHH:MM</div>
          <div>• Max file size: 5MB</div>
        </div>
      </CardContent>
    </Card>
  );
};

export default BulkUploadCard;