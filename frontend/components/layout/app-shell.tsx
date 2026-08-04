"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Activity, Menu, ShieldCheck, X } from "lucide-react";
import { useState, type ReactNode } from "react";
import { useWebsiteStatus } from "@/components/providers/website-status-provider";
import { getBrowserRole, type UserRole } from "@/lib/auth";
import { navigationItems } from "@/lib/navigation";
import { NotificationPanel } from "./notification-panel";
import { UserMenu } from "./user-menu";

const hiddenForViewer = new Set(["/accounts", "/remediation", "/policies", "/team", "/settings"]);

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const websiteStatus = useWebsiteStatus();
  const role: UserRole = getBrowserRole();
  const items = navigationItems.filter((item) => role !== "viewer" || !hiddenForViewer.has(item.href));
  const statusClass = websiteStatus === "operational"
    ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-200"
    : websiteStatus === "degraded"
      ? "border-rose-400/30 bg-rose-400/10 text-rose-200"
      : "border-slate-700 bg-slate-900 text-slate-400";
  const statusLabel = websiteStatus === "operational" ? "System online" : websiteStatus === "degraded" ? "System degraded" : "Checking system";

  const sidebar = <aside className="flex h-full w-72 flex-col border-r border-slate-800 bg-slate-950 px-4 py-5"><Link href="/dashboard" className="flex items-center gap-3 px-3 py-2 text-lg font-bold text-white"><span className="grid h-9 w-9 place-items-center rounded-xl bg-sky-500/15 text-sky-300"><ShieldCheck className="h-5 w-5" /></span>CPSM Console</Link><p className="px-3 pt-2 text-xs text-slate-500">Cloud security posture</p><nav className="mt-7 space-y-1" aria-label="Primary navigation">{items.map(({ href, icon: Icon, label, badge }) => { const active = pathname === href || pathname.startsWith(`${href}/`); return <Link key={href} href={href} onClick={() => setOpen(false)} className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${active ? "bg-sky-500/15 text-sky-100 ring-1 ring-sky-400/20" : "text-slate-400 hover:bg-slate-900 hover:text-slate-100"}`}><Icon className="h-4 w-4" aria-hidden="true" /><span className="flex-1">{label}</span>{badge ? <span className="rounded-full bg-rose-500/15 px-2 py-0.5 text-xs font-semibold text-rose-200">{badge}</span> : null}</Link>; })}</nav><div className="mt-auto rounded-xl border border-slate-800 bg-slate-900/60 p-3 text-xs text-slate-400"><span className="font-semibold text-slate-200">Role:</span> {role}</div></aside>;

  return <div className="min-h-screen bg-[#08111f]"><div className="hidden lg:fixed lg:inset-y-0 lg:z-30 lg:block">{sidebar}</div>{open ? <div className="fixed inset-0 z-50 lg:hidden"><button className="absolute inset-0 cursor-default bg-slate-950/80" onClick={() => setOpen(false)} aria-label="Close navigation" /><div className="relative h-full shadow-2xl">{sidebar}<button onClick={() => setOpen(false)} className="absolute right-4 top-4 rounded-lg p-2 text-slate-300 hover:bg-slate-800" aria-label="Close navigation"><X className="h-5 w-5" /></button></div></div> : null}<div className="lg:pl-72"><header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-slate-800 bg-slate-950/85 px-4 backdrop-blur lg:px-8"><button className="rounded-lg p-2 text-slate-300 hover:bg-slate-800 lg:hidden" onClick={() => setOpen(true)} aria-label="Open navigation"><Menu className="h-5 w-5" /></button><div className="hidden text-sm text-slate-400 sm:block">Security operations workspace</div><div className="flex items-center gap-3"><span role="status" className={`hidden items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold sm:inline-flex ${statusClass}`}><Activity className="h-3.5 w-3.5" />{statusLabel}</span><NotificationPanel /><UserMenu /></div></header><main className="mx-auto w-full max-w-screen-2xl p-4 sm:p-6 lg:p-8">{children}</main></div></div>;
}