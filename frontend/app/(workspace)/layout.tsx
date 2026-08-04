import { AppShell } from "@/components/layout/app-shell";
import { WorkspaceGuard } from "@/components/providers/workspace-guard";
export default function WorkspaceLayout({ children }: { children: React.ReactNode }) { return <WorkspaceGuard><AppShell>{children}</AppShell></WorkspaceGuard>; }