import { create } from "zustand";

interface AppState {
  sidebarOpen: boolean;
  toggleSidebar: () => void;
  user: { id: string; name: string; email: string; role: string; avatarUrl?: string | null } | null;
  setUser: (user: AppState["user"]) => void;
}

export const useAppStore = create<AppState>((set) => ({
  sidebarOpen: true,
  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
  user: null,
  setUser: (user) => set({ user }),
}));
