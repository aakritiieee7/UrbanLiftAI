import { Helmet } from "react-helmet-async";
import Navbar from "@/components/Navbar";
import { useAuth } from "@/contexts/AuthContext";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
interface ProfileRow {
  user_id: string;
  role?: "shipper" | "carrier";
  business_name?: string;
  gstin?: string;
  business_model?: string;
  specialties?: string;
  contact_email?: string;
  contact_phone?: string;
  address?: string;
  website?: string;
  company_name?: string;
  service_regions?: string;
  vehicle_types?: string;
  years_experience?: number;
  licenses?: string;
}

const Profile = () => {
  const { userId } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<ProfileRow | null>(null);
  const [invoiceFiles, setInvoiceFiles] = useState<File[]>([]);
  const [licenseFiles, setLicenseFiles] = useState<File[]>([]);
  const [docPaths, setDocPaths] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
const [authTimes, setAuthTimes] = useState<{ created_at?: string; last_sign_in_at?: string }>({});

const role = useMemo(() => profile?.role ?? (profile?.company_name ? "carrier" : "shipper"), [profile]);

const parseTimestampFromPath = (p: string) => {
  const filename = p.split('/').pop() ?? "";
  const ts = parseInt(filename.split("-")[0], 10);
  return isNaN(ts) ? null : new Date(ts);
};

const activities = useMemo(() => {
  const items: Array<{ type: string; at: Date; path?: string }> = [];
  if (authTimes.created_at) items.push({ type: "account_created", at: new Date(authTimes.created_at) });
  if (authTimes.last_sign_in_at) items.push({ type: "login", at: new Date(authTimes.last_sign_in_at) });
  for (const p of docPaths) {
    const dt = parseTimestampFromPath(p);
    if (dt) items.push({ type: "document_upload", at: dt, path: p });
  }
  return items.sort((a, b) => b.at.getTime() - a.at.getTime()).slice(0, 20);
}, [docPaths, authTimes]);

  useEffect(() => {
    (async () => {
      if (!userId) return;
      const { data: p } = await (supabase as any)
        .from("shipper_profiles")
        .select("*")
        .eq("user_id", userId)
        .maybeSingle();
      setProfile(p ?? null);

      const { data: userData } = await supabase.auth.getUser();
      const meta = userData.user?.user_metadata as any;
      const paths = role === "shipper" ? (meta?.invoice_paths ?? []) : (meta?.license_paths ?? []);
      setDocPaths(Array.isArray(paths) ? paths : []);
      setAuthTimes({ created_at: userData.user?.created_at, last_sign_in_at: userData.user?.last_sign_in_at });
    })();
  }, [userId, role]);

  const handleUpload = async () => {
    if (!userId) return;
    setLoading(true);
    const files = role === "shipper" ? invoiceFiles : licenseFiles;
    const ftype = role === "shipper" ? "invoices" : "licenses";
    const uploaded: string[] = [];
    const allowed = ["pdf", "png", "jpg", "jpeg", "webp"];

    for (const file of files) {
      if (file.size > 10 * 1024 * 1024) {
        toast({ title: "File too large", description: `${file.name} exceeds 10MB` });
        continue;
      }
      const ext = file.name.split('.').pop()?.toLowerCase();
      if (!ext || !allowed.includes(ext)) {
        toast({ title: "Unsupported file", description: `${file.name} type not allowed` });
        continue;
      }
      const path = `${role}/${userId}/${ftype}/${Date.now()}-${file.name}`;
      const { error } = await supabase.storage.from("user-files").upload(path, file);
      if (error) {
        toast({ title: "Upload failed", description: error.message });
      } else {
        uploaded.push(path);
      }
    }

    if (uploaded.length) {
      const key = role === "shipper" ? "invoice_paths" : "license_paths";
      const newPaths = [...docPaths, ...uploaded];
      await supabase.auth.updateUser({ data: { [key]: newPaths } });
      setDocPaths(newPaths);
      toast({ title: "Uploaded", description: `${uploaded.length} file(s) uploaded` });
    }
    setInvoiceFiles([]);
    setLicenseFiles([]);
    setLoading(false);
  };

  return (
    <>
      <Helmet>
        <title>Your Profile | UrbanLift.AI</title>
        <meta name="description" content="View and manage your UrbanLift.AI profile and documents." />
        <link rel="canonical" href="/profile" />
      </Helmet>
      <Navbar />
      <main className="container mx-auto px-4 py-8">
        <section className="mb-6">
          <h1 className="text-3xl font-semibold">Your Profile</h1>
          <p className="text-muted-foreground">Role: {role === "carrier" ? "Carrier" : "Shipper"}</p>
        </section>

        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="w-full md:w-auto grid grid-cols-3">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="details">Personal Details</TabsTrigger>
            <TabsTrigger value="activity">Recent Activity</TabsTrigger>
          </TabsList>

          <TabsContent value="overview">
            <div className="grid gap-6 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Overview</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 text-sm">
                    <div><span className="font-medium">Role:</span> {role === "carrier" ? "Carrier" : "Shipper"}</div>
                    <div><span className="font-medium">Total Files:</span> {docPaths.length}</div>
                    <div><span className="font-medium">Last Login:</span> {authTimes.last_sign_in_at ? new Date(authTimes.last_sign_in_at).toLocaleString() : "—"}</div>
                    <div><span className="font-medium">Account Created:</span> {authTimes.created_at ? new Date(authTimes.created_at).toLocaleString() : "—"}</div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Documents</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div>
                      <Label htmlFor="docs">{role === "shipper" ? "Invoices" : "Licenses/Permits"}</Label>
                      <Input
                        id="docs"
                        type="file"
                        accept=".pdf,image/*"
                        multiple
                        onChange={(e) => role === "shipper" ? setInvoiceFiles(Array.from(e.target.files ?? [])) : setLicenseFiles(Array.from(e.target.files ?? []))}
                      />
                      <p className="text-xs text-muted-foreground mt-1">Max 10MB each. PDF, JPG, PNG, WEBP allowed.</p>
                    </div>
                    <Button onClick={handleUpload} disabled={loading} className="w-full md:w-auto">{loading ? "Uploading..." : "Upload"}</Button>
                    <div className="space-y-2">
                      <div className="text-sm font-medium">Your Files</div>
                      {docPaths.length === 0 && <div className="text-sm text-muted-foreground">No files uploaded.</div>}
                      <ul className="list-disc pl-5 text-sm break-all">
                        {docPaths.map((p) => {
                          const { data } = supabase.storage.from("user-files").getPublicUrl(p);
                          const url = data.publicUrl;
                          return (
                            <li key={p}>
                              <a href={url} target="_blank" rel="noreferrer" className="underline">{p.split('/').pop()}</a>
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="details">
            <Card>
              <CardHeader>
                <CardTitle>Details</CardTitle>
              </CardHeader>
              <CardContent>
                {!profile && <div className="text-sm text-muted-foreground">No profile found.</div>}
                {profile && (
                  <div className="space-y-2 text-sm">
                    {role === "shipper" ? (
                      <>
                        <div><span className="font-medium">Business:</span> {profile.business_name}</div>
                        <div><span className="font-medium">GSTIN:</span> {profile.gstin}</div>
                        <div><span className="font-medium">Model:</span> {profile.business_model}</div>
                        <div><span className="font-medium">Specialties:</span> {profile.specialties}</div>
                        <div><span className="font-medium">Contact:</span> {profile.contact_email} • {profile.contact_phone}</div>
                        <div><span className="font-medium">Address:</span> {profile.address}</div>
                        <div><span className="font-medium">Website:</span> {profile.website}</div>
                      </>
                    ) : (
                      <>
                        <div><span className="font-medium">Company:</span> {profile.company_name}</div>
                        <div><span className="font-medium">Regions:</span> {profile.service_regions}</div>
                        <div><span className="font-medium">Vehicles:</span> {profile.vehicle_types}</div>
                        <div><span className="font-medium">Experience:</span> {profile.years_experience} yrs</div>
                        <div><span className="font-medium">Licenses:</span> {profile.licenses}</div>
                        <div><span className="font-medium">Contact:</span> {profile.contact_email} • {profile.contact_phone}</div>
                      </>
                    )}
                  </div>
                )}
                <div className="mt-4">
                  <Button variant="outline" onClick={() => navigate(`/profile-setup?role=${role}`)}>Edit Profile</Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="activity">
            <Card>
              <CardHeader>
                <CardTitle>Recent Activity</CardTitle>
              </CardHeader>
              <CardContent>
                {activities.length === 0 ? (
                  <div className="text-sm text-muted-foreground">No recent activity.</div>
                ) : (
                  <ul className="space-y-3">
                    {activities.map((act) => (
                      <li key={act.at.getTime() + (act.path ?? act.type)} className="text-sm">
                        <div>
                          <span className="font-medium">{act.type === "document_upload" ? "Uploaded" : act.type === "login" ? "Logged in" : "Account created"}</span>
                          {act.type === "document_upload" && act.path && (
                            <>: {act.path.split("/").pop()}</>
                          )}
                        </div>
                        <div className="text-xs text-muted-foreground">{act.at.toLocaleString()}</div>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </>
  );
};

export default Profile;
