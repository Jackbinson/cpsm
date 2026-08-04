import { AlertTriangle, Inbox } from "lucide-react";
import type { ReactNode } from "react";

export function LoadingState({ rows = 4 }: { rows?: number }) {
  return <div className="space-y-3 p-6" aria-busy="true" aria-label="Loading content">{Array.from({ length: rows }, (_, index) => <div key={index} className="skeleton h-12 rounded-xl bg-slate-800" />)}</div>;
}

export function EmptyState({ title, description, action }: { title: string; description: string; action?: ReactNode }) {
  return <div className="flex min-h-56 flex-col items-center justify-center gap-3 p-8 text-center"><Inbox className="h-9 w-9 text-slate-500" aria-hidden="true" /><h3 className="font-semibold text-slate-100">{title}</h3><p className="max-w-md text-sm text-slate-400">{description}</p>{action}</div>;
}

export function ErrorState({ title = "Could not load this data", message, retry }: { title?: string; message: string; retry?: () => void }) {
  return <div role="alert" className="m-6 flex items-start gap-3 rounded-xl border border-rose-400/30 bg-rose-950/40 p-4"><AlertTriangle className="mt-0.5 h-5 w-5 flex-none text-rose-300" aria-hidden="true" /><div className="flex-1"><h3 className="font-semibold text-rose-100">{title}</h3><p className="mt-1 text-sm text-rose-200/80">{message}</p></div>{retry ? <button onClick={retry} className="rounded-lg border border-rose-300/40 px-3 py-1.5 text-sm font-medium text-rose-100 hover:bg-rose-900/60">Retry</button> : null}</div>;
}