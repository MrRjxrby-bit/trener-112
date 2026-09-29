import { create } from "zustand";

type User = { full_name: string; role: string } | null;

export const useAuth = create<{
  user: User;
  setUser: (u: User) => void;
  logout: () => void;
}>((set) => ({
  user: JSON.parse(localStorage.getItem("user") || "null"),
  setUser: (u) => {
    localStorage.setItem("user", JSON.stringify(u));
    set({ user: u });
  },
  logout: () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    set({ user: null });
  },
}));