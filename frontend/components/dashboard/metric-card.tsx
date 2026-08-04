import type { LucideIcon } from "lucide-react";

export function MetricCard({ label, value, detail, icon: Icon, tone = "sky" }: { label: string; value: string | number; detail: string; icon: LucideIcon; tone?: "sky" | "rose" | "orange" | "emerald" | "violet" }) {
  const tones = { sky: "bg-sky-400/15 text-sky-200", rose: "bg-rose-400/15 text-rose-200", orange: "bg-orange-400/15 text-orange-200", emerald: "bg-emerald-400/15 text-emerald-200", violet: "bg-violet-400/15 text-violet-200" };
  return <section className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5 shadow-sm"><div className="flex items-start justify-between gap-3"><div><p className="text-sm text-slate-400">{label}</p><p className="mt-2 text-3xl font-bold tracking-tight text-white">{value}</p></div><span className={`grid h-10 w-10 place-items-center rounded-xl ${tones[tone]}`}><Icon className="h-5 w-5" aria-hidden="true" /></span></div><p className="mt-4 text-xs text-slate-500">{detail}</p></section>;
}