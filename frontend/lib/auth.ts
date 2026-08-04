import { getUserProfile, saveUserProfile } from "@/lib/user-preferences";

export type UserRole = "viewer" | "analyst" | "approver" | "admin";
type ApiRole = "user" | "admin";

export interface AuthenticatedUser {
  id: string;
  name: string;
  email: string;
  role: ApiRole;
  avatarUrl?: string;
  emailVerified: boolean;
}

const sessionKey = "cpsm-session";
export const sessionChangedEvent = "cpsm-session-changed";

export const can = (role: UserRole, permission: "scan:create" | "finding:edit" | "remediation:approve" | "account:manage") => {
  const permissions: Record<UserRole, string[]> = {
    viewer: [],
    analyst: ["scan:create", "finding:edit"],
    approver: ["remediation:approve"],
    admin: ["scan:create", "finding:edit", "remediation:approve", "account:manage"],
  };
  return permissions[role].includes(permission);
};

const workspaceRole = (role: ApiRole): UserRole => role === "admin" ? "admin" : "analyst";

export const getBrowserRole = (): UserRole => {
  if (typeof window === "undefined") return "viewer";
  const value = window.localStorage.getItem("cpsm-role");
  return value === "viewer" || value === "analyst" || value === "approver" || value === "admin" ? value : "viewer";
};

// This only caches UI state. Authorization is enforced by the HttpOnly session cookie at the API.
export function startAuthenticatedSession(user: AuthenticatedUser) {
  window.localStorage.setItem(sessionKey, "active");
  window.localStorage.setItem("cpsm-role", workspaceRole(user.role));
  const currentProfile = getUserProfile();
  saveUserProfile({ ...currentProfile, displayName: user.name, email: user.email });
  window.dispatchEvent(new Event(sessionChangedEvent));
}

export function clearBrowserSession() {
  window.localStorage.removeItem(sessionKey);
  window.localStorage.removeItem("cpsm-role");
  window.localStorage.removeItem("token");
  window.dispatchEvent(new Event(sessionChangedEvent));
}

export async function signOut(allDevices = false) {
  try {
    await fetch(allDevices ? "/api/auth/logout-all" : "/api/auth/logout", {
      method: "POST",
      credentials: "same-origin",
    });
  } finally {
    clearBrowserSession();
  }
}