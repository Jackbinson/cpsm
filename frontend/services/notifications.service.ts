import { mockNotifications, type MockNotification } from "@/mocks/notifications";

const storageKey = "cpsm-notifications";
export const notificationsChangedEvent = "cpsm-notifications-changed";
export type NotificationItem = MockNotification;

const broadcast = () => window.dispatchEvent(new Event(notificationsChangedEvent));

export function getNotifications(): NotificationItem[] {
  if (typeof window === "undefined") return mockNotifications;
  try {
    const parsed: unknown = JSON.parse(window.localStorage.getItem(storageKey) || "null");
    return Array.isArray(parsed) ? parsed as NotificationItem[] : mockNotifications;
  } catch {
    return mockNotifications;
  }
}

function save(items: NotificationItem[]) {
  window.localStorage.setItem(storageKey, JSON.stringify(items));
  broadcast();
}

export function markNotificationRead(id: string) { save(getNotifications().map((item) => item.id === id ? { ...item, read: true } : item)); }
export function markAllNotificationsRead() { save(getNotifications().map((item) => ({ ...item, read: true }))); }