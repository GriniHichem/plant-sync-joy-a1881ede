import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { logAuthEvent } from "@/lib/audit";
import { useImpersonation } from "@/contexts/ImpersonationContext";

type AppRole = "admin" | "resp_maintenance" | "maintenancier" | "resp_production" | "chef_ligne" | "operateur" | "gestionnaire_magasin" | "responsable_magasin" | "bureau_methode" | "responsable_si" | "auditeur" | "controleur_qualite" | "responsable_controle_qualite" | "directeur_qualite" | "responsable_inventaire" | "agent_inventaire";

interface Profile {
  id: string;
  user_id: string;
  first_name: string;
  last_name: string;
  poste: string | null;
  avatar_url: string | null;
  public_access?: boolean;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  roles: AppRole[];
  realRoles: AppRole[];
  loading: boolean;
  hasRole: (role: AppRole) => boolean;
  isImpersonating: boolean;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [realProfile, setRealProfile] = useState<Profile | null>(null);
  const [realRoles, setRealRoles] = useState<AppRole[]>([]);
  const [loading, setLoading] = useState(true);
  const { impersonation } = useImpersonation();

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        setTimeout(() => {
          fetchProfile(session.user.id);
          fetchRoles(session.user.id);
          if (event === "SIGNED_IN") {
            logAuthEvent("login", { email: session.user.email ?? undefined });
          } else if (event === "PASSWORD_RECOVERY") {
            logAuthEvent("password_reset", { email: session.user.email ?? undefined });
          }
        }, 0);
      } else {
        setRealProfile(null);
        setRealRoles([]);
      }
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile(session.user.id);
        fetchRoles(session.user.id);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  async function fetchProfile(userId: string) {
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .eq("user_id", userId)
      .single();
    if (data) {
      setRealProfile(data as Profile);
      // Astuce UX (non sécurisée): bloque l'accès Internet aux comptes sans autorisation.
      // Gouverné par l'interrupteur global "control.enforce_public_access_gate" (désactivé par défaut).
      try {
        const { isPublicHost } = await import("@/lib/network");
        if (isPublicHost() && (data as Profile).public_access !== true) {
          const { data: gate } = await supabase
            .from("app_settings")
            .select("value")
            .eq("key", "control.enforce_public_access_gate")
            .maybeSingle();
          if (gate?.value === "true") {
            const { toast } = await import("sonner");
            toast.error("Connexion via Internet non autorisée", {
              description: "Ce compte n'a pas l'autorisation d'accéder à l'application depuis l'extérieur. Contactez l'administrateur.",
              duration: 8000,
            });
            await supabase.auth.signOut();
            setUser(null);
            setSession(null);
            setRealProfile(null);
            setRealRoles([]);
            try { sessionStorage.setItem("pit:blockedPublic", "1"); } catch { /* ignore */ }
          }
        }
      } catch { /* ignore */ }
    }
  }

  async function fetchRoles(userId: string) {
    const { data } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId);
    if (data) setRealRoles(data.map((r) => r.role as AppRole));
  }

  // Effective values: when impersonating, override roles & profile
  const effectiveRoles: AppRole[] = useMemo(
    () => (impersonation ? (impersonation.targetRoles as AppRole[]) : realRoles),
    [impersonation, realRoles],
  );

  const effectiveProfile: Profile | null = impersonation && impersonation.targetProfile
    ? {
        id: impersonation.targetProfile.user_id,
        user_id: impersonation.targetProfile.user_id,
        first_name: impersonation.targetProfile.first_name ?? "",
        last_name: impersonation.targetProfile.last_name ?? "",
        poste: impersonation.targetProfile.poste,
        avatar_url: impersonation.targetProfile.avatar_url,
      }
    : realProfile;

  const hasRole = (role: AppRole) => effectiveRoles.includes(role);

  const refreshProfile = async () => {
    if (user) await fetchProfile(user.id);
  };

  const signOut = async () => {
    try { await logAuthEvent("logout", { email: user?.email ?? undefined }); } catch { /* ignore */ }
    // Local scope: clears session in this browser without needing the auth server
    // to respond (critical for self-hosting when /logout is slow/unreachable).
    try {
      await supabase.auth.signOut({ scope: "local" });
    } catch (e) {
      // Fallback: purge storage manually so the UI never stays stuck logged in.
      try {
        Object.keys(localStorage)
          .filter((k) => k.startsWith("sb-") || k === "sb-prodintime-auth")
          .forEach((k) => localStorage.removeItem(k));
      } catch { /* ignore */ }
    }
    setUser(null);
    setSession(null);
    setRealProfile(null);
    setRealRoles([]);
    // Force a clean reload to /auth so any stale in-memory state is dropped.
    try {
      if (typeof window !== "undefined" && window.location.pathname !== "/auth") {
        window.location.assign("/auth");
      }
    } catch { /* ignore */ }
  };

  return (
    <AuthContext.Provider value={{
      user,
      session,
      profile: effectiveProfile,
      roles: effectiveRoles,
      realRoles,
      loading,
      hasRole,
      isImpersonating: !!impersonation,
      signOut,
      refreshProfile,
    }}>
      {children}
    </AuthContext.Provider>
  );
}
