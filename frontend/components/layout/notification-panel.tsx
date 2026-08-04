"use client";

import Link from "next/link";
import { Bell, CheckCheck, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { getNotifications, markAllNotificationsRead, markNotificationRead, notificationsChangedEvent, type NotificationItem } from "@/services/notifications.service";

export function NotificationPanel() {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const refresh = () => setNotifications(getNotifications());
  useEffect(() => { refresh(); window.addEventListener(notificationsChangedEvent, refresh); return () => window.removeEventListener(notificationsChangedEvent, refresh); }, []);
  const unread = useMemo(() => notifications.filter((item) => !item.read).length, [notifications]);
  const openItem = (id: string) => { markNotificationRead(id); setOpen(false); };
  return <div className="relative"><button className="relative rounded-lg p-2 text-slate-300 hover:bg-slate-800" onClick={() => setOpen((value) => !value)} aria-expanded={open} aria-controls="notification-panel" aria-label={`Open notifications, ${unread} unread`}><Bell className="h-5 w-5" />{unread ? <span className="absolute right-1 top-1 grid h-4 min-w-4 place-items-center rounded-full bg-rose-400 px-1 text-[10px] font-bold text-slate-950">{unread}</span> : null}</button>{open ? <section id="notification-panel" className="absolute right-0 top-12 z-50 w-[min(24rem,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-slate-700 bg-slate-950 shadow-2xl"><header className="flex items-center justify-between border-b border-slate-800 px-4 py-3"><div><h2 className="font-semibold text-white">Notifications</h2><p className="text-xs text-slate-400">In-app notification center.</p></div><button onClick={() => setOpen(false)} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800" aria-label="Close notifications"><X className="h-4 w-4" /></button></header><div className="max-h-80 divide-y divide-slate-800 overflow-auto">{notifications.length ? notifications.map((item) => <Link key={item.id} href={item.href} onClick={() => openItem(item.id)} className={`block px-4 py-3 hover:bg-slate-900 ${item.read ? "" : "bg-sky-400/5"}`}><p className="text-sm font-medium text-slate-100">{item.title}</p><p className="mt-1 text-xs leading-5 text-slate-400">{item.message}</p><p className="mt-1 text-[11px] text-slate-500">{new Date(item.createdAt).toLocaleString()}</p></Link>) : <p className="p-5 text-sm text-slate-400">You are all caught up.</p>}</div><button onClick={markAllNotificationsRead} className="flex w-full items-center justify-center gap-2 border-t border-slate-800 px-4 py-3 text-sm font-semibold text-sky-200 hover:bg-slate-900"><CheckCheck className="h-4 w-4" />Mark all as read</button></section> : null}</div>;
}