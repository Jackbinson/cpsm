"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { clearBrowserSession, startAuthenticatedSession, type AuthenticatedUser } from "@/lib/auth";

type SessionResponse = { success: boolean; data?: AuthenticatedUser };

export function WorkspaceGuard({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let active = true;
    const validateSession = async () => {
      try {
        const response = await fetch("/api/auth/session", { cache: "no-store", credentials: "same-origin" });
        const payload = (await response.json().catch(() => null)) as SessionResponse | null;
        if (!response.ok || !payload?.success || !payload.data) throw new Error("Not signed in");
        startAuthenticatedSession(payload.data);
        if (active) setReady(true);
      } catch {
        clearBrowserSession();
        if (active) router.replace("/login");
      }
    };
    void validateSession();
    return () => { active = false; };
  }, [router]);

  if (!ready) return <div className="grid min-h-screen place-items-center bg-[#08111f] text-sm text-slate-400">Checking secure session…</div>;
  return <>{children}</>;
}