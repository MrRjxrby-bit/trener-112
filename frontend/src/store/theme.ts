import { create } from "zustand";

type Theme = "light" | "dark";

const STORAGE_KEY = "theme";

function applyTheme(theme: Theme) {
  const root = document.documentElement;
  if (theme === "dark") {
    root.classList.add("dark");
  } else {
    root.classList.remove("dark");
  }
}

const initial: Theme =
  (localStorage.getItem(STORAGE_KEY) as Theme) || "light";

applyTheme(initial);

export const useTheme = create<{
  theme: Theme;
  setTheme: (t: Theme) => void;
  toggle: () => void;
}>((set, get) => ({
  theme: initial,
  setTheme: (t) => {
    localStorage.setItem(STORAGE_KEY, t);
    applyTheme(t);
    set({ theme: t });
  },
  toggle: () => {
    const next: Theme = get().theme === "light" ? "dark" : "light";
    localStorage.setItem(STORAGE_KEY, next);
    applyTheme(next);
    set({ theme: next });
  },
}));