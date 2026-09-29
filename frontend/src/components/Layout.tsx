import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../store/auth";
import { useTheme } from "../store/theme";
import type { ReactNode } from "react";

export default function Layout({ children }: { children: ReactNode }) {
  const { user, logout } = useAuth();
  const { theme, toggle } = useTheme();
  const nav = useNavigate();

  const handleLogout = () => {
    logout();
    nav("/login", { replace: true });
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-900">
      <header className="bg-white dark:bg-slate-800 shadow px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <div className="font-bold text-lg dark:text-white">Тренажёр 112</div>
          <nav className="flex gap-4 text-sm dark:text-slate-200">
            {user.role === "admin" && (
              <Link to="/admin" className="hover:underline">
                Админ
              </Link>
            )}
            {user.role === "teacher" && (
              <Link to="/teacher" className="hover:underline">
                Кабинет преподавателя
              </Link>
            )}
            {user.role === "student" && (
              <Link to="/student" className="hover:underline">
                Мои занятия
              </Link>
            )}
            <Link to="/help" className="hover:underline">
              Справка
            </Link>
          </nav>
        </div>
        <div className="flex items-center gap-4 text-sm">
          <button
            onClick={toggle}
            className="px-2 py-1 rounded border border-slate-300 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700"
            title={theme === "dark" ? "Светлая тема" : "Тёмная тема"}
          >
            {theme === "dark" ? "☀" : "🌙"}
          </button>
          <span className="text-slate-600 dark:text-slate-300">
            {user.full_name}{" "}
            <span className="text-slate-400">({user.role})</span>
          </span>
          <button
            onClick={handleLogout}
            className="px-3 py-1 border border-red-500 text-red-600 rounded hover:bg-red-50 dark:hover:bg-red-900/30"
          >
            Выйти
          </button>
        </div>
      </header>
      <main className="p-6">{children}</main>
    </div>
  );
}