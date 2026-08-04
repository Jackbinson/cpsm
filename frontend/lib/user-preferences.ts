export type ThemePreference = "light" | "dark" | "system";

export interface UserProfile {
  displayName: string;
  email: string;
  timezone: string;
  language: "en" | "vi";
  theme: ThemePreference;
  notificationPreferences: {
    scanCompleted: boolean;
    scanFailed: boolean;
    criticalFinding: boolean;
    remediationUpdates: boolean;
  };
}

const profileKey = "cpsm-profile";
export const profileChangedEvent = "cpsm-profile-changed";

export const defaultProfile: UserProfile = {
  displayName: "Admin User",
  email: "admin@cpsm.local",
  timezone: "Asia/Ho_Chi_Minh",
  language: "en",
  theme: "dark",
  notificationPreferences: { scanCompleted: true, scanFailed: true, criticalFinding: true, remediationUpdates: true },
};

const isProfile = (value: unknown): value is UserProfile => Boolean(value && typeof value === "object" && "displayName" in value && "email" in value);

export function getUserProfile(): UserProfile {
  if (typeof window === "undefined") return defaultProfile;
  try {
    const parsed: unknown = JSON.parse(window.localStorage.getItem(profileKey) || "null");
    return isProfile(parsed) ? { ...defaultProfile, ...parsed, notificationPreferences: { ...defaultProfile.notificationPreferences, ...parsed.notificationPreferences } } : defaultProfile;
  } catch {
    return defaultProfile;
  }
}

export function saveUserProfile(profile: UserProfile) {
  window.localStorage.setItem(profileKey, JSON.stringify(profile));
  window.dispatchEvent(new Event(profileChangedEvent));
}

export const getInitials = (name: string) => name.split(" ").filter(Boolean).slice(0, 2).map((part) => part[0]).join("").toUpperCase() || "U";