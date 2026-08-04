import type { Metadata } from "next";
import "./globals.css";
import { QueryProvider } from "@/components/providers/query-provider";
import { ThemeProvider } from "@/components/providers/theme-provider";
import { WebsiteStatusProvider } from "@/components/providers/website-status-provider";

export const metadata: Metadata = { title: "CPSM Console", description: "Cloud Security Posture Management" };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en" suppressHydrationWarning><body><ThemeProvider><WebsiteStatusProvider><QueryProvider>{children}</QueryProvider></WebsiteStatusProvider></ThemeProvider></body></html>;
}