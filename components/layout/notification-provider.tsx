"use client";

import { useEffect } from "react";
import { toast } from "sonner";
import { useNotifications, NotificationContext } from "@/hooks/use-notifications";

function playNotificationSound() {
  try {
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.value = 800;
    osc.type = "sine";
    gain.gain.setValueAtTime(0.1, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.3);
  } catch {
    // Audio not available
  }
}

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const { notifications, unreadCount, refetch, onNewRef } = useNotifications();

  useEffect(() => {
    onNewRef.current = (notification) => {
      playNotificationSound();

      const toastFn =
        notification.type === "success"
          ? toast.success
          : notification.type === "error"
            ? toast.error
            : notification.type === "warning"
              ? toast.warning
              : toast.info;

      toastFn(notification.title, {
        description: notification.body,
        duration: 5000,
      });
    };
  }, [onNewRef]);

  return (
    <NotificationContext.Provider value={{ notifications, unreadCount, refetch }}>
      {children}
    </NotificationContext.Provider>
  );
}
