"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery } from "@tanstack/react-query";
import { Loader2, Play } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { can, getBrowserRole } from "@/lib/auth";
import { awsRegions, awsServices, priorities, scanTypes } from "@/lib/scan-options";
import { listAwsAccounts } from "@/services/accounts.service";
import { createScan } from "@/services/scans.service";

const scanSchema = z.object({
  awsAccountId: z.string().optional(),
  regions: z.array(z.string()).min(1, "Select at least one region."),
  services: z.array(z.string()).min(1, "Select at least one service."),
  scanType: z.enum(["quick", "full", "service", "resource"]),
  priority: z.enum(["low", "normal", "high"]),
});

type ScanFormValues = z.infer<typeof scanSchema>;

export function ScanForm() {
  const router = useRouter();
  const accounts = useQuery({ queryKey: ["accounts"], queryFn: listAwsAccounts });
  const [submitError, setSubmitError] = useState<string | null>(null);
  const form = useForm<ScanFormValues>({ resolver: zodResolver(scanSchema), defaultValues: { awsAccountId: "acct-production", regions: ["ap-southeast-1"], services: ["S3", "EC2", "IAM"], scanType: "full", priority: "normal" } });
  const allowed = can(getBrowserRole(), "scan:create");
  const selectedRegions = form.watch("regions");
  const selectedServices = form.watch("services");
  const toggle = (field: "regions" | "services", value: string) => { const values = form.getValues(field); form.setValue(field, values.includes(value) ? values.filter((item) => item !== value) : [...values, value], { shouldValidate: true }); };
  const submit = async (values: ScanFormValues) => { setSubmitError(null); try { const scan = await createScan(values); router.push(`/scans/${scan.scanId}`); } catch (error) { setSubmitError(error instanceof Error ? error.message : "Could not queue the scan."); } };

  if (!allowed) return <div role="alert" className="rounded-xl border border-amber-400/30 bg-amber-500/10 p-4 text-sm text-amber-100">Your role does not have permission to create scans.</div>;
  return <form onSubmit={form.handleSubmit(submit)} className="space-y-7"><section className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5"><h2 className="font-semibold text-white">Scope</h2><div className="mt-5 grid gap-5 md:grid-cols-2"><label className="block text-sm font-medium text-slate-200">AWS account<select {...form.register("awsAccountId")} className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-slate-100">{accounts.data?.map((account) => <option key={account.id} value={account.id}>{account.name} · {account.accountId}</option>)}</select></label><div><span className="block text-sm font-medium text-slate-200">Regions</span><div className="mt-2 flex flex-wrap gap-2">{awsRegions.map((region) => <label key={region} className="cursor-pointer"><input type="checkbox" className="sr-only" checked={selectedRegions.includes(region)} onChange={() => toggle("regions", region)} /><span className={`inline-flex rounded-lg border px-3 py-2 text-sm ${selectedRegions.includes(region) ? "border-sky-400/60 bg-sky-400/10 text-sky-100" : "border-slate-700 bg-slate-950 text-slate-400"}`}>{region}</span></label>)}</div>{form.formState.errors.regions ? <p className="mt-2 text-sm text-rose-300">{form.formState.errors.regions.message}</p> : null}</div></div></section><section className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5"><h2 className="font-semibold text-white">Services</h2><p className="mt-1 text-sm text-slate-400">Choose the AWS services this job should inspect.</p><div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">{awsServices.map((service) => <label key={service} className="flex cursor-pointer items-center gap-3 rounded-xl border border-slate-800 bg-slate-950/70 px-3 py-3 text-sm text-slate-200 hover:border-slate-600"><input type="checkbox" checked={selectedServices.includes(service)} onChange={() => toggle("services", service)} className="h-4 w-4 accent-sky-400" />{service}</label>)}</div>{form.formState.errors.services ? <p className="mt-2 text-sm text-rose-300">{form.formState.errors.services.message}</p> : null}</section><section className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5"><h2 className="font-semibold text-white">Execution</h2><div className="mt-4 grid gap-5 md:grid-cols-2"><fieldset><legend className="text-sm font-medium text-slate-200">Scan type</legend><div className="mt-2 space-y-2">{scanTypes.map((type) => <label key={type.value} className="flex cursor-pointer gap-3 rounded-xl border border-slate-800 bg-slate-950/70 p-3"><input type="radio" value={type.value} {...form.register("scanType")} className="mt-1 accent-sky-400" /><span><span className="block text-sm font-medium text-slate-100">{type.label}</span><span className="block text-xs text-slate-400">{type.description}</span></span></label>)}</div></fieldset><label className="block text-sm font-medium text-slate-200">Priority<select {...form.register("priority")} className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-slate-100">{priorities.map((priority) => <option key={priority} value={priority}>{priority}</option>)}</select></label></div></section>{submitError ? <div role="alert" className="rounded-xl border border-rose-400/30 bg-rose-950/40 p-4 text-sm text-rose-100">{submitError}</div> : null}<div className="flex flex-wrap justify-end gap-3"><button type="button" onClick={() => router.push("/scans")} className="rounded-xl border border-slate-700 px-4 py-2.5 text-sm font-semibold text-slate-200 hover:bg-slate-800">Cancel</button><button disabled={form.formState.isSubmitting} type="submit" className="inline-flex items-center gap-2 rounded-xl bg-sky-400 px-4 py-2.5 text-sm font-bold text-slate-950 hover:bg-sky-300 disabled:cursor-not-allowed disabled:opacity-60">{form.formState.isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}Queue scan</button></div></form>;
}