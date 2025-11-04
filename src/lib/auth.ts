import { supabase } from "@/integrations/supabase/client";

/**
 * Sign in using either email or username + password.
 * - If identifier contains '@', treats it as email directly.
 * - Otherwise, looks up profiles.username (case-insensitive) and uses profiles.auth_email.
 */
export const signInWithIdentifier = async (identifier: string, password: string) => {
  const trimmed = identifier.trim();
  const isEmail = /[^\s@]+@[^\s@]+\.[^\s@]+/.test(trimmed);

  let emailToUse = trimmed;

  if (!isEmail) {
    // Resolve username -> auth email (case-insensitive exact match)
    // Try shipper_profiles first, then fall back to carrier_profiles
    let emailLookup: string | null = null;

    // 1) shipper_profiles
    const { data: shipperData, error: shipperErr } = await (supabase as any)
      .from("shipper_profiles")
      .select("auth_email, username")
      .ilike("username", trimmed)
      .maybeSingle();

    if (shipperData?.auth_email) {
      emailLookup = shipperData.auth_email;
    } else {
      // 2) carrier_profiles
      const { data: carrierData, error: carrierErr } = await (supabase as any)
        .from("carrier_profiles")
        .select("auth_email, username")
        .ilike("username", trimmed)
        .maybeSingle();

      if (carrierErr && !shipperErr) {
        return { data: null, error: carrierErr };
      }

      if (carrierData?.auth_email) {
        emailLookup = carrierData.auth_email;
      }
    }

    if (!emailLookup) {
      return { data: null, error: new Error("Username not found or not linked to an email.") };
    }

    emailToUse = emailLookup;
  }

  return await supabase.auth.signInWithPassword({ email: emailToUse, password });
};
