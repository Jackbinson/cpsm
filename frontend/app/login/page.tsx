"use client";

import { ShieldCheck } from "lucide-react";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import { startAuthenticatedSession, type AuthenticatedUser } from "@/lib/auth";

type Mode = "login" | "register";
type AuthPayload = { success: boolean; data?: AuthenticatedUser; message?: string };

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const error = new URLSearchParams(window.location.search).get("error");
    if (error) setMessage(error);
  }, []);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);
    setMessage("");
    try {
      const response = await fetch(mode === "login" ? "/api/auth/login" : "/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(mode === "login" ? { email, password } : { name, email, password }),
      });
      const payload = (await response.json().catch(() => null)) as AuthPayload | null;
      if (!response.ok || !payload?.success || !payload.data) {
        setMessage(payload?.message || "Could not complete authentication.");
        return;
      }
      startAuthenticatedSession(payload.data);
      router.replace("/dashboard");
    } catch {
      setMessage("Authentication service is unavailable. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const switchMode = (nextMode: Mode) => {
    setMode(nextMode);
    setMessage("");
  };

  return <main className="grid min-h-screen place-items-center bg-[#08111f] p-5"><section className="w-full max-w-md rounded-3xl border border-slate-800 bg-slate-900/80 p-7 shadow-2xl"><span className="grid h-12 w-12 place-items-center rounded-2xl bg-sky-400/15 text-sky-200"><ShieldCheck className="h-6 w-6" /></span><p className="mt-6 text-sm font-medium text-sky-300">CPSM Console</p><h1 className="mt-1 text-2xl font-bold text-white">{mode === "login" ? "Sign in to your workspace" : "Create your workspace account"}</h1><p className="mt-3 text-sm leading-6 text-slate-400">Use your email and password or continue securely with Google.</p><div className="mt-6 grid grid-cols-2 rounded-xl border border-slate-700 bg-slate-950 p-1"><button type="button" onClick={() => switchMode("login")} className={`rounded-lg px-3 py-2 text-sm font-semibold ${mode === "login" ? "bg-slate-800 text-white" : "text-slate-400"}`}>Sign in</button><button type="button" onClick={() => switchMode("register")} className={`rounded-lg px-3 py-2 text-sm font-semibold ${mode === "register" ? "bg-slate-800 text-white" : "text-slate-400"}`}>Create account</button></div><a href="/api/auth/google" className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl border border-slate-600 bg-white px-4 py-2.5 text-sm font-bold text-slate-900 hover:bg-slate-100"><span aria-hidden="true" className="text-base font-black text-[#4285F4]">G</span>Continue with Google</a><div className="my-5 flex items-center gap-3 text-xs text-slate-500"><span className="h-px flex-1 bg-slate-700" />or<span className="h-px flex-1 bg-slate-700" /></div><form onSubmit={submit} className="space-y-4">{mode === "register" ? <label className="block text-sm font-medium text-slate-200">Full name<input required minLength={2} value={name} onChange={(event) => setName(event.target.value)} className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-slate-100" autoComplete="name" /></label> : null}<label className="block text-sm font-medium text-slate-200">Email<input required type="email" value={email} onChange={(event) => setEmail(event.target.value)} className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-slate-100" autoComplete="email" /></label><label className="block text-sm font-medium text-slate-200">Password<input required minLength={8} type="password" value={password} onChange={(event) => setPassword(event.target.value)} className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-slate-100" autoComplete={mode === "login" ? "current-password" : "new-password"} /></label>{mode === "register" ? <p className="text-xs leading-5 text-slate-500">Use at least 8 characters. Email verification and password recovery will be enabled when SMTP is configured.</p> : null}{message ? <p role="alert" className="rounded-xl border border-rose-400/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-100">{message}</p> : null}<button disabled={submitting} className="w-full rounded-xl bg-sky-400 px-4 py-2.5 text-sm font-bold text-slate-950 hover:bg-sky-300 disabled:opacity-60">{submitting ? "Please wait…" : mode === "login" ? "Sign in" : "Create account"}</button></form></section></main>;
}