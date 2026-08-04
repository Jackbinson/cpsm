"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Search } from "lucide-react";
import { useMemo, useState } from "react";
import { listFindings } from "@/services/findings.service";
import type { Severity } from "@/types/cspm";
import { ErrorState, EmptyState, LoadingState } from "@/components/ui/data-state";
import { FindingStatusBadge, SeverityBadge } from "@/components/ui/status-badge";

const severityOptions: Array<Severity | "all"> = ["all", "critical", "high", "medium", "low", "informational"];

export function FindingsTable() {
  const findings = useQuery({ queryKey: ["findings"], queryFn: listFindings });
  const [query, setQuery] = useState("");
  const [severity, setSeverity] = useState<Severity | "all">("all");
  const visible = useMemo(() => (findings.data || []).filter((finding) => (severity === "all" || finding.severity === severity) && `${finding.name} ${finding.service} ${finding.resourceArn}`.toLowerCase().includes(query.toLowerCase())), [findings.data, query, severity]);
  if (findings.isLoading) return <LoadingState rows={8} />;
  if (findings.isError) return <ErrorState message={findings.error instanceof Error ? findings.error.message : "Could not load findings."} retry={() => void findings.refetch()} />;
  return <div className="space-y-6"><section><p className="text-sm font-medium text-sky-300">Security exposure</p><h1 className="mt-1 text-3xl font-bold text-white">Security findings</h1><p className="mt-2 text-sm text-slate-400">Search, triage and open evidence for detected cloud misconfigurations.</p></section><section className="rounded-2xl border border-slate-800 bg-slate-900/70"><div className="flex flex-col gap-3 border-b border-slate-800 p-4 md:flex-row"><label className="relative flex-1"><Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-slate-500" /><span className="sr-only">Search findings</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search resource, service or finding" className="w-full rounded-xl border border-slate-700 bg-slate-950 py-2.5 pl-10 pr-3 text-sm text-slate-100 placeholder:text-slate-500" /></label><label><span className="sr-only">Filter severity</span><select value={severity} onChange={(event) => setSeverity(event.target.value as Severity | "all")} className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-slate-100 md:w-44">{severityOptions.map((item) => <option key={item} value={item}>{item === "all" ? "All severities" : item}</option>)}</select></label></div>{visible.length ? <div className="overflow-x-auto"><table className="w-full min-w-[960px] text-left text-sm"><thead className="border-b border-slate-800 bg-slate-950/60 text-xs uppercase tracking-wide text-slate-500"><tr><th className="px-5 py-3">Severity</th><th className="px-5 py-3">Finding</th><th className="px-5 py-3">Service</th><th className="px-5 py-3">Resource</th><th className="px-5 py-3">Status</th><th className="px-5 py-3">Detected</th></tr></thead><tbody className="divide-y divide-slate-800">{visible.map((finding) => <tr key={finding.id} className="hover:bg-slate-800/50"><td className="px-5 py-4"><SeverityBadge severity={finding.severity} /></td><td className="px-5 py-4"><Link href={`/findings/${finding.id}`} className="font-medium text-slate-100 hover:text-sky-200">{finding.name}</Link><p className="mt-1 max-w-sm truncate text-xs text-slate-500">{finding.description}</p></td><td className="px-5 py-4 text-slate-300">{finding.service}</td><td className="px-5 py-4 font-mono text-xs text-slate-400">{finding.resourceArn}</td><td className="px-5 py-4"><FindingStatusBadge status={finding.status} /></td><td className="px-5 py-4 text-slate-400">{new Date(finding.detectedAt).toLocaleString()}</td></tr>)}</tbody></table></div> : <EmptyState title="No matching findings" description="Change your filters or run a scan to collect findings." />}</section></div>;
}
