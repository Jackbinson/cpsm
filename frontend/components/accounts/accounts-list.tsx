"use client";

import Link from "next/link";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { Plus, PlugZap } from "lucide-react";
import { can, getBrowserRole } from "@/lib/auth";
import { listAwsAccounts, testAwsAccountConnection } from "@/services/accounts.service";
import { ErrorState, EmptyState, LoadingState } from "@/components/ui/data-state";

const statusText = { connected: "Connected", disconnected: "Disconnected", permission_error: "Permission error", testing: "Testing", expired: "Expired" };
const statusStyle = { connected: "text-emerald-200 bg-emerald-500/10 border-emerald-400/30", disconnected: "text-slate-200 bg-slate-500/10 border-slate-500/30", permission_error: "text-rose-100 bg-rose-500/10 border-rose-400/30", testing: "text-sky-100 bg-sky-500/10 border-sky-400/30", expired: "text-amber-100 bg-amber-500/10 border-amber-400/30" };

export function AccountsList() {
  const client = useQueryClient();
  const canManage = can(getBrowserRole(), "account:manage");
  const accounts = useQuery({ queryKey: ["accounts"], queryFn: listAwsAccounts });
  const test = useMutation({ mutationFn: testAwsAccountConnection, onSuccess: () => void client.invalidateQueries({ queryKey: ["accounts"] }) });
  if (accounts.isLoading) return <LoadingState rows={5} />;
  if (accounts.isError) return <ErrorState message={accounts.error instanceof Error ? accounts.error.message : "Could not load AWS accounts."} retry={() => void accounts.refetch()} />;
  const list = accounts.data || [];
  return <div className="space-y-6"><section className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div><p className="text-sm font-medium text-sky-300">Cloud inventory</p><h1 className="mt-1 text-3xl font-bold text-white">AWS accounts</h1><p className="mt-2 text-sm text-slate-400">Connect accounts through IAM AssumeRole; credentials are never entered in this UI.</p></div>{canManage ? <Link href="/accounts/new" className="inline-flex items-center justify-center gap-2 rounded-xl bg-sky-400 px-4 py-2.5 text-sm font-bold text-slate-950 hover:bg-sky-300"><Plus className="h-4 w-4" />Add AWS account</Link> : null}</section><section className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/70">{list.length ? <div className="overflow-x-auto"><table className="w-full min-w-[1000px] text-left text-sm"><thead className="border-b border-slate-800 bg-slate-950/60 text-xs uppercase tracking-wide text-slate-500"><tr><th className="px-5 py-3">Account</th><th className="px-5 py-3">Environment</th><th className="px-5 py-3">Regions</th><th className="px-5 py-3">Connection</th><th className="px-5 py-3">Risk</th><th className="px-5 py-3">Open findings</th><th className="px-5 py-3" /></tr></thead><tbody className="divide-y divide-slate-800">{list.map((account) => <tr key={account.id} className="hover:bg-slate-800/50"><td className="px-5 py-4"><p className="font-medium text-slate-100">{account.name}</p><p className="mt-1 font-mono text-xs text-slate-500">{account.accountId}</p></td><td className="px-5 py-4 capitalize text-slate-300">{account.environment}</td><td className="px-5 py-4 text-slate-300">{account.regions.join(", ")}</td><td className="px-5 py-4"><span className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${statusStyle[account.connectionStatus]}`}>{statusText[account.connectionStatus]}</span></td><td className="px-5 py-4 text-slate-100">{account.riskScore}/100</td><td className="px-5 py-4 text-slate-100">{account.openFindings}</td><td className="px-5 py-4 text-right"><button onClick={() => test.mutate(account.id)} disabled={test.isPending || !canManage} className="inline-flex items-center gap-2 rounded-lg border border-slate-700 px-3 py-2 text-xs font-semibold text-slate-200 hover:bg-slate-800"><PlugZap className="h-3.5 w-3.5" />Test connection</button></td></tr>)}</tbody></table></div> : <EmptyState title="No AWS accounts" description="Add an account to start scheduled or on-demand scans." />}</section><p className="text-xs text-slate-500">Account endpoints currently use a local mock service because the backend does not expose AWS account CRUD yet.</p></div>;
}