export interface MockNotification { id: string; title: string; message: string; href: string; read: boolean; createdAt: string; }
export const mockNotifications: MockNotification[] = [
  { id: "scan-completed", title: "Scan completed", message: "The latest cloud scan finished and findings are ready for review.", href: "/scans", read: false, createdAt: "2026-07-23T14:34:09.000Z" },
  { id: "critical-finding", title: "Critical finding detected", message: "Review the latest exposed cloud resource before remediation.", href: "/findings", read: false, createdAt: "2026-07-23T14:34:10.000Z" },
];