"use client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "next-themes";
import { useState } from "react";
import { CommandPalette } from "@/components/layout/command-palette";
import { NotificationProvider } from "@/components/layout/notification-provider";

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: { queries: { staleTime: 60 * 1000, retry: 1 } },
      })
  );
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange={false}>
      <QueryClientProvider client={queryClient}>
        <NotificationProvider>
          {children}
          <CommandPalette />
        </NotificationProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}
