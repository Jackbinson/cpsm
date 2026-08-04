"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Plus, Radar } from "lucide-react";
import { listScanRuns } from "@/services/scans.service";
import { ErrorState, EmptyState, LoadingState } from "@/components/ui/data-state";
import { ScanStatusBadge } from "@/components/ui/status-badge";

export function ScanHistory() {
  const scans = useQuery({ queryKey: ["scans"], queryFn: listScanRuns });
  if (scans.isLoading) return <LoadingState rows={6} />;
  if (scans.isError) return <ErrorState message={scans.error instanceof Error ? scans.error.message : "Could not load scan history."} retry={() => void scans.refetch()} />;
  const list = scans.data || [];
  return <div className="space-y-6"><section className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div><p className="text-sm font-medium text-sky-300">Queue and worker activity</p><h1 className="mt-1 text-3xl font-bold text-white">Scans</h1><p className="mt-2 text-sm text-slate-400">Monitor queued, running, retrying and completed security scans.</p></div><Link href="/scans/new" className="inline-flex items-center justify-center gap-2 rounded-xl bg-sky-400 px-4 py-2.5 text-sm font-bold text-slate-950 hover:bg-sky-300"><Plus className="h-4 w-4" />New scan</Link></section><section className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/70">{list.length ? <div className="overflow-x-auto"><table className="w-full min-w-[760px] text-left text-sm"><thead className="border-b border-slate-800 bg-slate-950/60 text-xs uppercase tracking-wide text-slate-500"><tr><th className="px-5 py-3">Scan</th><th className="px-5 py-3">Status</th><th className="px-5 py-3">Progress</th><th className="px-5 py-3">Findings</th><th className="px-5 py-3">Created</th></tr></thead><tbody className="divide-y divide-slate-800">{list.map((scan) => <tr key={scan.scanId} className="hover:bg-slate-800/50"><td className="px-5 py-4"><Link href={`/scans/${scan.scanId}`} className="flex items-center gap-3"><span className="grid h-8 w-8 place-items-center rounded-lg bg-sky-400/10 text-sky-200"><Radar className="h-4 w-4" /></span><span className="font-mono text-xs text-slate-100">{scan.scanId}</span></Link></td><td className="px-5 py-4"><ScanStatusBadge status={scan.status} /></td><td className="px-5 py-4 text-slate-300">{scan.progress.stage} · {scan.progress.processed}/{scan.progress.total || "?"}</td><td className="px-5 py-4 text-slate-300">{scan.summary.violated}</td><td className="px-5 py-4 text-slate-400">{new Date(scan.createdAt).toLocaleString()}</td></tr>)}</tbody></table></div> : <EmptyState title="No scans found" description="Start a new scan to populate this history." action={<Link href="/scans/new" className="rounded-lg bg-sky-400 px-3 py-2 text-sm font-semibold text-slate-950">Create scan</Link>} />}</section></div>;
}