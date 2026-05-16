"use client";

import { useState, useEffect, useRef, useCallback, createContext, useContext } from "react";

interface Notification {
  id: string;
  title: string;
  body: string;
  type: string;
  link?: string | null;
  isRead: boolean;
  createdAt: string;
}

interface NotificationContextValue {
  notifications: Notification[];
  unreadCount: number;
  refetch: () => Promise<void>;
}

export const NotificationContext = createContext<NotificationContextValue>({
  notifications: [],
  unreadCount: 0,
  refetch: async () => {},
});

export const useNotificationContext = () => useContext(NotificationContext);

export function useNotifications() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const lastCheckRef = useRef<string>(new Date().toISOString());
  const onNewRef = useRef<((n: Notification) => void) | null>(null);

  const fetchNotifications = useCallback(async () => {
    try {
      const res = await fetch("/api/notifications");
      if (!res.ok) return;
      const data = await res.json();
      const list: Notification[] = data.notifications ?? [];
      setNotifications(list);
      setUnreadCount(list.filter((n) => !n.isRead).length);
    } catch {
      // silent
    }
  }, []);

  const pollForNew = useCallback(async () => {
    try {
      const res = await fetch(
        `/api/notifications?since=${encodeURIComponent(lastCheckRef.current)}`
      );
      if (!res.ok) return;
      const data = await res.json();
      const newOnes: Notification[] = data.notifications ?? [];
      if (newOnes.length > 0) {
        lastCheckRef.current = new Date().toISOString();
        for (const n of newOnes) {
          onNewRef.current?.(n);
        }
        await fetchNotifications();
      }
    } catch {
      // silent
    }
  }, [fetchNotifications]);

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(pollForNew, 15000);
    return () => clearInterval(interval);
  }, [fetchNotifications, pollForNew]);

  return {
    notifications,
    unreadCount,
    refetch: fetchNotifications,
    onNewRef,
  };
}
