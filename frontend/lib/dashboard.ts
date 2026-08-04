import type { Finding, Severity } from "@/types/cspm";

export const severityOrder: Severity[] = ["critical", "high", "medium", "low", "informational"];

export const severityColor: Record<Severity, string> = {
  critical: "#fb7185",
  high: "#fb923c",
  medium: "#fbbf24",
  low: "#38bdf8",
  informational: "#94a3b8",
};

export function getSeverityCounts(findings: Finding[]) {
  return severityOrder.map((severity) => ({ severity, count: findings.filter((finding) => finding.severity === severity && finding.isViolating).length }));
}

export function getServiceCounts(findings: Finding[]) {
  return Object.entries(findings.reduce<Record<string, number>>((result, finding) => { result[finding.service] = (result[finding.service] || 0) + 1; return result; }, {})).map(([service, count]) => ({ service, count }));
}

export function getRiskScore(findings: Finding[]) {
  const weights: Record<Severity, number> = { critical: 20, high: 8, medium: 3, low: 1, informational: 0 };
  return Math.min(100, findings.filter((finding) => finding.isViolating).reduce((total, finding) => total + weights[finding.severity], 0));
}