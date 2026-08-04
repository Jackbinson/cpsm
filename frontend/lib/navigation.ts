import type { LucideIcon } from "lucide-react";
import { Bell, FileBarChart2, Gauge, Landmark, ScanSearch, Settings, ShieldCheck, Users, Wrench } from "lucide-react";

export interface NavigationItem {
  href: string;
  label: string;
  icon: LucideIcon;
  badge?: string;
}

export const navigationItems: NavigationItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: Gauge },
  { href: "/accounts", label: "AWS Accounts", icon: Landmark },
  { href: "/scans", label: "Scans", icon: ScanSearch },
  { href: "/findings", label: "Security Findings", icon: ShieldCheck, badge: "Critical" },
  { href: "/remediation", label: "Remediation", icon: Wrench, badge: "2" },
  { href: "/policies", label: "Policies", icon: ShieldCheck },
  { href: "/reports", label: "Reports", icon: FileBarChart2 },
  { href: "/notifications", label: "Notifications", icon: Bell },
  { href: "/team", label: "Team & Roles", icon: Users },
  { href: "/settings", label: "Settings", icon: Settings },
];