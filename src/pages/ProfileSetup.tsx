import { Helmet } from "react-helmet-async";
import Navbar from "@/components/Navbar";
import { useAuth } from "@/contexts/AuthContext";
import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

const ProfileSetup = () => {
  const { userId, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();

  const role = useMemo<"shipper" | "carrier">(() => {
    const q = new URLSearchParams(location.search);
    return q.get("role") === "carrier" ? "carrier" : "shipper";
  }, [location.search]);

  const shipperSchema = z.object({
    businessName: z.string().min(2, "Required"),
    gstin: z.string().min(4, "Required"),
    businessModel: z.string().min(2, "Required"),
    specialties: z.string().optional(),
    contactEmail: z.string().email("Invalid email"),
    contactPhone: z.string().min(7, "Invalid phone"),
    address: z.string().min(3, "Required"),
    website: z.string().url("Invalid URL").optional().or(z.literal("")),
  });

  const carrierSchema = z.object({
    companyName: z.string().min(2, "Required"),
    serviceRegions: z.string().min(2, "Required"),
    vehicleTypes: z.string().min(2, "Required"),
    yearsExperience: z.coerce.number().min(0).max(80),
    licenses: z.string().optional(),
    contactEmail: z.string().email("Invalid email"),
    contactPhone: z.string().min(7, "Invalid phone"),
  });

  const schema = role === "shipper" ? shipperSchema : carrierSchema;

  const form = useForm<any>({
    resolver: zodResolver(schema as any),
    defaultValues:
      role === "shipper"
        ? { businessName: "", gstin: "", businessModel: "", specialties: "", contactEmail: "", contactPhone: "", address: "", website: "" }
        : { companyName: "", serviceRegions: "", vehicleTypes: "", yearsExperience: 0, licenses: "", contactEmail: "", contactPhone: "" },
  });

  useEffect(() => {
    console.log("ProfileSetup useEffect running - userId:", userId, "role:", role);
    if (!userId) return;
    (async () => {
      const { data } = await (supabase as any)
        .from(role === "shipper" ? "shipper_profiles" : "carrier_profiles")
        .select("*")
        .eq("user_id", userId)
        .maybeSingle();
      if (data) {
        // If role mismatches, keep existing but allow edit
        if (data.role && data.role !== role) {
          // Navigate to the user's saved role-specific dashboard
          navigate(data.role === "shipper" ? "/shipper/home" : "/carrier/home", { replace: true });
          return;
        }
        // Populate form
        if (role === "shipper") {
          form.reset({
            businessName: data.business_name ?? "",
            gstin: data.gstin ?? "",
            businessModel: data.business_model ?? "",
            specialties: data.specialties ?? "",
            contactEmail: data.contact_email ?? "",
            contactPhone: data.contact_phone ?? "",
            address: data.address ?? "",
            website: data.website ?? "",
          });
        } else {
          form.reset({
            companyName: data.company_name ?? "",
            serviceRegions: data.service_regions ?? "",
            vehicleTypes: data.vehicle_types ?? "",
            yearsExperience: data.years_experience ?? 0,
            licenses: data.licenses ?? "",
            contactEmail: data.contact_email ?? "",
            contactPhone: data.contact_phone ?? "",
          });
        }
      }
    })();
  }, [userId, role]); // Removed navigate to prevent infinite loops

  const onSubmit = async (values: any) => {
    if (!userId) return;

    const payload =
      role === "shipper"
        ? {
            user_id: userId,
            role,
            business_name: values.businessName,
            gstin: values.gstin,
            business_model: values.businessModel,
            specialties: values.specialties,
            contact_email: values.contactEmail,
            contact_phone: values.contactPhone,
            address: values.address,
            website: values.website,
          }
        : {
            user_id: userId,
            role,
            company_name: values.companyName,
            service_regions: values.serviceRegions,
            vehicle_types: values.vehicleTypes,
            years_experience: values.yearsExperience,
            licenses: values.licenses,
            contact_email: values.contactEmail,
            contact_phone: values.contactPhone,
          };

    const { error } = await (supabase as any)
      .from(role === "shipper" ? "shipper_profiles" : "carrier_profiles")
      .upsert(payload, { onConflict: "user_id" });

    if (error) {
      toast({ title: "Error", description: error.message });
      return;
    }

    toast({ title: "Profile saved", description: "You're all set!" });
    navigate(role === "shipper" ? "/shipper/home" : "/carrier/home");
  };

  return (
    <>
      <Helmet>
        <title>Complete Profile | UrbanLift.AI</title>
        <meta name="description" content="Complete your shipper or carrier profile details." />
        <link rel="canonical" href="/profile-setup" />
      </Helmet>
      <Navbar />
      <main className="container mx-auto px-4 py-8">
        <section className="mb-6">
          <h1 className="text-3xl font-semibold">Complete Your Profile</h1>
          <p className="text-muted-foreground">Role: {role === "shipper" ? "Shipper" : "Carrier"}</p>
        </section>

        <Card>
          <CardHeader>
            <CardTitle>{role === "shipper" ? "Shipper Details" : "Carrier Details"}</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4 md:grid-cols-2">
              {role === "shipper" ? (
                <>
                  <div>
                    <Label htmlFor="businessName">Business Name</Label>
                    <Input id="businessName" {...form.register("businessName")} />
                  </div>
                  <div>
                    <Label htmlFor="gstin">GSTIN</Label>
                    <Input id="gstin" {...form.register("gstin")} />
                  </div>
                  <div>
                    <Label htmlFor="businessModel">Business Model</Label>
                    <Input id="businessModel" {...form.register("businessModel")} />
                  </div>
                  <div>
                    <Label htmlFor="specialties">Specialties (comma separated)</Label>
                    <Input id="specialties" placeholder="FMCG, Electronics" {...form.register("specialties")} />
                  </div>
                  <div>
                    <Label htmlFor="contactEmail">Contact Email</Label>
                    <Input id="contactEmail" type="email" {...form.register("contactEmail")} />
                  </div>
                  <div>
                    <Label htmlFor="contactPhone">Contact Phone</Label>
                    <Input id="contactPhone" {...form.register("contactPhone")} />
                  </div>
                  <div className="md:col-span-2">
                    <Label htmlFor="address">Address</Label>
                    <Input id="address" {...form.register("address")} />
                  </div>
                  <div className="md:col-span-2">
                    <Label htmlFor="website">Website</Label>
                    <Input id="website" placeholder="https://" {...form.register("website")} />
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <Label htmlFor="companyName">Company Name</Label>
                    <Input id="companyName" {...form.register("companyName")} />
                  </div>
                  <div>
                    <Label htmlFor="serviceRegions">Service Regions</Label>
                    <Input id="serviceRegions" placeholder="Delhi NCR, ..." {...form.register("serviceRegions")} />
                  </div>
                  <div>
                    <Label htmlFor="vehicleTypes">Vehicle Types</Label>
                    <Input id="vehicleTypes" placeholder="2W, 3W, 4W, LCV" {...form.register("vehicleTypes")} />
                  </div>
                  <div>
                    <Label htmlFor="yearsExperience">Years of Experience</Label>
                    <Input id="yearsExperience" type="number" min={0} {...form.register("yearsExperience", { valueAsNumber: true })} />
                  </div>
                  <div className="md:col-span-2">
                    <Label htmlFor="licenses">Licenses/Permits</Label>
                    <Input id="licenses" {...form.register("licenses")} />
                  </div>
                  <div>
                    <Label htmlFor="contactEmail">Contact Email</Label>
                    <Input id="contactEmail" type="email" {...form.register("contactEmail")} />
                  </div>
                  <div>
                    <Label htmlFor="contactPhone">Contact Phone</Label>
                    <Input id="contactPhone" {...form.register("contactPhone")} />
                  </div>
                </>
              )}

              <div className="md:col-span-2">
                <Button type="submit" className="w-full md:w-auto">Save and Continue</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </main>
    </>
  );
};

export default ProfileSetup;
