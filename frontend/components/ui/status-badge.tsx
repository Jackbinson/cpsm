import type { FindingStatus, ScanStatus, Severity } from "@/types/cspm";

const severityStyles: Record<Severity, string> = {
  critical: "border-rose-400/50 bg-rose-500/15 text-rose-200",
  high: "border-orange-400/50 bg-orange-500/15 text-orange-200",
  medium: "border-amber-400/50 bg-amber-500/15 text-amber-100",
  low: "border-sky-400/50 bg-sky-500/15 text-sky-100",
  informational: "border-slate-500 bg-slate-700/60 text-slate-200",
};

const scanStyles: Record<ScanStatus, string> = {
  queued: "border-amber-400/50 bg-amber-500/15 text-amber-100",
  running: "border-sky-400/50 bg-sky-500/15 text-sky-100",
  cancelling: "border-orange-400/50 bg-orange-500/15 text-orange-100",
  cancelled: "border-slate-500 bg-slate-700/60 text-slate-200",
  completed: "border-emerald-400/50 bg-emerald-500/15 text-emerald-100",
  failed: "border-rose-400/50 bg-rose-500/15 text-rose-100",
};

const findingStyles: Record<FindingStatus, string> = {
  open: "border-rose-400/50 bg-rose-500/15 text-rose-100",
  reviewing: "border-amber-400/50 bg-amber-500/15 text-amber-100",
  in_progress: "border-sky-400/50 bg-sky-500/15 text-sky-100",
  resolved: "border-emerald-400/50 bg-emerald-500/15 text-emerald-100",
  accepted_risk: "border-violet-400/50 bg-violet-500/15 text-violet-100",
  false_positive: "border-slate-500 bg-slate-700/60 text-slate-200",
};

export function SeverityBadge({ severity }: { severity: Severity }) {
  return <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold capitalize ${severityStyles[severity]}`} aria-label={`Severity: ${severity}`}>{severity}</span>;
}

export function ScanStatusBadge({ status }: { status: ScanStatus }) {
  return <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold capitalize ${scanStyles[status]}`} aria-label={`Scan status: ${status}`}>{status}</span>;
}

export function FindingStatusBadge({ status }: { status: FindingStatus }) {
  return <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold ${findingStyles[status]}`} aria-label={`Finding status: ${status.replaceAll("_", " ")}`}>{status.replaceAll("_", " ")}</span>;
}