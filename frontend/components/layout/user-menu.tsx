"use client";

import Link from "next/link";
import { LogOut, Settings, UserRound } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { signOut } from "@/lib/auth";
import { getInitials, getUserProfile, profileChangedEvent, type UserProfile } from "@/lib/user-preferences";

export function UserMenu() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [profile, setProfile] = useState<UserProfile>(() => getUserProfile());
  const [signingOut, setSigningOut] = useState(false);
  useEffect(() => {
    const refresh = () => setProfile(getUserProfile());
    window.addEventListener(profileChangedEvent, refresh);
    return () => window.removeEventListener(profileChangedEvent, refresh);
  }, []);

  const logout = async () => {
    setSigningOut(true);
    await signOut();
    router.replace("/login");
  };

  return <div className="relative"><button onClick={() => setOpen((value) => !value)} aria-expanded={open} aria-controls="user-menu" className="flex items-center gap-2 rounded-lg border border-slate-800 bg-slate-900 px-2 py-1.5 text-left hover:bg-slate-800"><span className="grid h-6 w-6 place-items-center rounded-full bg-sky-500/20 text-xs font-bold text-sky-100">{getInitials(profile.displayName)}</span><span className="hidden sm:block"><span className="block text-sm font-medium text-slate-200">{profile.displayName}</span></span></button>{open ? <section id="user-menu" className="absolute right-0 top-11 z-50 w-60 overflow-hidden rounded-xl border border-slate-700 bg-slate-950 p-1 shadow-2xl"><div className="border-b border-slate-800 px-3 py-2"><p className="truncate text-sm font-medium text-slate-100">{profile.displayName}</p><p className="truncate text-xs text-slate-400">{profile.email}</p></div><Link onClick={() => setOpen(false)} href="/settings" className="mt-1 flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-slate-300 hover:bg-slate-900"><Settings className="h-4 w-4" />Settings</Link><Link onClick={() => setOpen(false)} href="/settings#profile" className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-slate-300 hover:bg-slate-900"><UserRound className="h-4 w-4" />Profile</Link><button disabled={signingOut} onClick={() => void logout()} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-rose-200 hover:bg-rose-500/10 disabled:opacity-60"><LogOut className="h-4 w-4" />{signingOut ? "Signing out…" : "Sign out"}</button></section> : null}</div>;
}