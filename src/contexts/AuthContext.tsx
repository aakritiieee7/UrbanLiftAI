import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";

interface AuthContextType {
  userId: string | null;
  role: "shipper" | "carrier" | null;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [userId, setUserId] = useState<string | null>(null);
  const [role, setRole] = useState<"shipper" | "carrier" | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    const getUserData = async () => {
      const { data } = await supabase.auth.getUser();
      if (!mounted) return;
      
      const uid = data.user?.id ?? null;
      setUserId(uid);
      
      if (uid) {
        const userRole = (data.user?.user_metadata as any)?.role as "shipper" | "carrier" | undefined;
        setRole(userRole ?? null);
      } else {
        setRole(null);
      }
      
      setLoading(false);
    };

    getUserData();

    const { data: sub } = supabase.auth.onAuthStateChange(async (_event, session) => {
      const uid = session?.user?.id ?? null;
      setUserId(uid);
      
      if (uid && session?.user) {
        const userRole = (session.user.user_metadata as any)?.role as "shipper" | "carrier" | undefined;
        setRole(userRole ?? null);
      } else {
        setRole(null);
      }
    });

    return () => {
      mounted = false;
      sub.subscription?.unsubscribe();
    };
  }, []);

  return (
    <AuthContext.Provider value={{ userId, role, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};