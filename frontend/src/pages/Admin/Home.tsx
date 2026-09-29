import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { api, downloadFile } from "../../api/client";

type User = {
  id: number;
  username: string;
  full_name: string;
  role: string;
  is_active: boolean;
};

type Dashboard = {
  summary: {
    total_users: number;
    total_students: number;
    total_scenarios: number;
    total_reports: number;
    total_sessions: number;
    avg_score: number;
  };
  top_students: {
    id: number;
    full_name: string;
    username: string;
    attempts: number;
    avg_score: number;
  }[];
  struggling_students: {
    id: number;
    full_name: string;
    username: string;
    attempts: number;
    avg_score: number;
  }[];
  activity_by_day: { date: string; count: number }[];
  top_scenarios: {
    scenario_id: number;
    title: string;
    attempts: number;
  }[];
};

export default function AdminHome() {
  const [users, setUsers] = useState<User[]>([]);
  const [logs, setLogs] = useState<any[]>([]);
  const [dashboard, setDashboard] = useState<Dashboard | null>(null);
  const [form, setForm] = useState({
    username: "",
    full_name: "",
    password: "",
    role: "student",
  });
  const [busy, setBusy] = useState(false);
  const [backupBusy, setBackupBusy] = useState(false);
  const [exportBusy, setExportBusy] = useState(false);

  const reload = async () => {
    try {
      const [u, l, d] = await Promise.all([
        api.get<User[]>("/api/admin/users"),
        api.get("/api/admin/logs?limit=50"),
        api
          .get<Dashboard>("/api/admin/dashboard")
          .catch(() => ({ data: null })),
      ]);
      setUsers(u.data);
      setLogs(l.data);
      setDashboard(d.data);
    } catch {
      toast.error("Не удалось загрузить данные");
    }
  };

  useEffect(() => {
    reload();
  }, []);

  const createUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      await api.post(
        `/api/admin/users?username=${encodeURIComponent(form.username)}` +
          `&full_name=${encodeURIComponent(form.full_name)}` +
          `&password=${encodeURIComponent(form.password)}` +
          `&role=${form.role}`
      );
      toast.success(`Пользователь ${form.username} создан`);
      setForm({ username: "", full_name: "", password: "", role: "student" });
      reload();
    } catch (e: any) {
      toast.error(e.response?.data?.detail || "Ошибка создания пользователя");
    } finally {
      setBusy(false);
    }
  };

  const toggle = async (id: number) => {
    try {
      await api.post(`/api/admin/users/${id}/toggle`);
      toast.success("Статус обновлён");
      reload();
    } catch {
      toast.error("Не удалось обновить статус");
    }
  };

  const doBackup = async () => {
    setBackupBusy(true);
    const id = toast.loading("Создаём резервную копию…");
    try {
      const { data } = await api.post("/api/admin/backup");
      toast.success(`Бэкап создан: ${data.backup_path}`, { id });
    } catch {
      toast.error("Не удалось создать бэкап (проверьте pg_dump в PATH)", {
        id,
      });
    } finally {
      setBackupBusy(false);
    }
  };

  const exportCsv = async () => {
    setExportBusy(true);
    const id = toast.loading("Готовим CSV…");
    try {
      const filename = `all_reports_${new Date()
        .toISOString()
        .slice(0, 19)
        .replace(/[:T]/g, "_")}.csv`;
      await downloadFile("/api/admin/reports/export", filename);
      toast.success("CSV скачан", { id });
    } catch {
      toast.error("Не удалось скачать CSV", { id });
    } finally {
      setExportBusy(false);
    }
  };

  const maxDayCount = dashboard
    ? Math.max(1, ...dashboard.activity_by_day.map((d) => d.count))
    : 1;

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold dark:text-white">
          Администрирование
        </h1>
        <div className="flex gap-2">
          <button
            onClick={exportCsv}
            disabled={exportBusy}
            className={`bg-emerald-600 text-white px-4 py-2 rounded ${
              exportBusy ? "opacity-50 cursor-not-allowed" : "hover:bg-emerald-700"
            }`}
          >
            {exportBusy ? "Готовим…" : "Скачать CSV отчётов"}
          </button>
          <button
            onClick={doBackup}
            disabled={backupBusy}
            className={`bg-blue-600 text-white px-4 py-2 rounded ${
              backupBusy ? "opacity-50 cursor-not-allowed" : "hover:bg-blue-700"
            }`}
          >
            {backupBusy ? "Создаём…" : "Создать резервную копию"}
          </button>
        </div>
      </div>

      {/* ==================== ДАШБОРД ==================== */}
      {dashboard && (
        <section className="bg-white dark:bg-slate-800 rounded shadow p-4 space-y-4">
          <h2 className="font-semibold text-lg dark:text-white">
            Дашборд руководителя
          </h2>

          {/* сводка */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            <DashCard label="Пользователей" value={dashboard.summary.total_users} />
            <DashCard label="Студентов" value={dashboard.summary.total_students} />
            <DashCard label="Сценариев" value={dashboard.summary.total_scenarios} />
            <DashCard label="Отчётов" value={dashboard.summary.total_reports} />
            <DashCard label="Сессий" value={dashboard.summary.total_sessions} />
            <DashCard
              label="Средний балл"
              value={dashboard.summary.avg_score}
              color={
                dashboard.summary.avg_score >= 70
                  ? "text-green-600"
                  : "text-red-600"
              }
            />
          </div>

          {/* активность */}
          <div className="border rounded p-3 dark:border-slate-700">
            <div className="font-semibold mb-2 text-sm dark:text-slate-200">
              Активность (последние 14 дней)
            </div>
            <div className="flex items-end gap-1 h-32">
              {dashboard.activity_by_day.map((d) => {
                const h = (d.count / maxDayCount) * 100;
                return (
                  <div
                    key={d.date}
                    className="flex-1 flex flex-col items-center justify-end"
                    title={`${d.date}: ${d.count} отчётов`}
                  >
                    <div
                      className="w-full bg-blue-500 rounded-t"
                      style={{ height: `${Math.max(2, h)}%` }}
                    />
                    <div className="text-[9px] text-slate-500 mt-1 origin-top-left rotate-45 whitespace-nowrap">
                      {d.date.slice(5)}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* топы */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="border rounded p-3 dark:border-slate-700">
              <div className="font-semibold mb-2 text-sm dark:text-slate-200">
                🏆 Лучшие студенты
              </div>
              {dashboard.top_students.length === 0 ? (
                <div className="text-xs text-slate-500">Нет данных</div>
              ) : (
                <ol className="space-y-1 text-sm">
                  {dashboard.top_students.map((s, i) => (
                    <li
                      key={s.id}
                      className="flex justify-between items-center"
                    >
                      <span className="dark:text-slate-200">
                        {i + 1}. {s.full_name}
                      </span>
                      <span className="text-green-600 font-semibold">
                        {s.avg_score}
                      </span>
                    </li>
                  ))}
                </ol>
              )}
            </div>

            <div className="border rounded p-3 dark:border-slate-700">
              <div className="font-semibold mb-2 text-sm dark:text-slate-200">
                ⚠️ Нужна помощь
              </div>
              {dashboard.struggling_students.length === 0 ? (
                <div className="text-xs text-slate-500">Нет данных</div>
              ) : (
                <ol className="space-y-1 text-sm">
                  {dashboard.struggling_students.map((s, i) => (
                    <li
                      key={s.id}
                      className="flex justify-between items-center"
                    >
                      <span className="dark:text-slate-200">
                        {i + 1}. {s.full_name}
                      </span>
                      <span className="text-red-600 font-semibold">
                        {s.avg_score}
                      </span>
                    </li>
                  ))}
                </ol>
              )}
            </div>

            <div className="border rounded p-3 dark:border-slate-700">
              <div className="font-semibold mb-2 text-sm dark:text-slate-200">
                📊 Топ сценариев
              </div>
              {dashboard.top_scenarios.length === 0 ? (
                <div className="text-xs text-slate-500">Нет данных</div>
              ) : (
                <ol className="space-y-1 text-sm">
                  {dashboard.top_scenarios.map((s, i) => (
                    <li
                      key={s.scenario_id}
                      className="flex justify-between items-center"
                    >
                      <span className="dark:text-slate-200">
                        {i + 1}. {s.title}
                      </span>
                      <span className="text-slate-500">{s.attempts}</span>
                    </li>
                  ))}
                </ol>
              )}
            </div>
          </div>
        </section>
      )}

      {/* ==================== НОВЫЙ ПОЛЬЗОВАТЕЛЬ ==================== */}
      <section className="bg-white dark:bg-slate-800 rounded shadow p-4">
        <h2 className="font-semibold mb-3 dark:text-white">
          Новый пользователь
        </h2>
        <form
          onSubmit={createUser}
          className="grid grid-cols-1 md:grid-cols-5 gap-3"
        >
          <input
            className="border p-2 rounded dark:bg-slate-700 dark:text-white dark:border-slate-600"
            placeholder="Логин"
            value={form.username}
            onChange={(e) => setForm({ ...form, username: e.target.value })}
            required
          />
          <input
            className="border p-2 rounded dark:bg-slate-700 dark:text-white dark:border-slate-600"
            placeholder="ФИО"
            value={form.full_name}
            onChange={(e) => setForm({ ...form, full_name: e.target.value })}
            required
          />
          <input
            className="border p-2 rounded dark:bg-slate-700 dark:text-white dark:border-slate-600"
            placeholder="Пароль"
            type="text"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            required
          />
          <select
            className="border p-2 rounded dark:bg-slate-700 dark:text-white dark:border-slate-600"
            value={form.role}
            onChange={(e) => setForm({ ...form, role: e.target.value })}
          >
            <option value="student">Обучающийся</option>
            <option value="teacher">Преподаватель</option>
            <option value="admin">Администратор</option>
          </select>
          <button
            type="submit"
            disabled={busy}
            className={`bg-green-600 text-white px-4 py-2 rounded ${
              busy ? "opacity-50 cursor-not-allowed" : "hover:bg-green-700"
            }`}
          >
            {busy ? "Создаём…" : "Создать"}
          </button>
        </form>
      </section>

      {/* ==================== ПОЛЬЗОВАТЕЛИ ==================== */}
      <section className="bg-white dark:bg-slate-800 rounded shadow p-4">
        <h2 className="font-semibold mb-3 dark:text-white">Пользователи</h2>
        <table className="w-full dark:text-slate-200">
          <thead className="bg-slate-100 dark:bg-slate-700">
            <tr>
              <th className="p-2 text-left">ID</th>
              <th className="p-2 text-left">Логин</th>
              <th className="p-2 text-left">ФИО</th>
              <th className="p-2 text-left">Роль</th>
              <th className="p-2 text-left">Статус</th>
              <th className="p-2"></th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className="border-t dark:border-slate-700">
                <td className="p-2">{u.id}</td>
                <td className="p-2">{u.username}</td>
                <td className="p-2">{u.full_name}</td>
                <td className="p-2">{u.role}</td>
                <td className="p-2">
                  {u.is_active ? (
                    <span className="text-green-600">активен</span>
                  ) : (
                    <span className="text-red-600">заблокирован</span>
                  )}
                </td>
                <td className="p-2 text-right">
                  <button
                    onClick={() => toggle(u.id)}
                    className="text-blue-600 underline"
                  >
                    {u.is_active ? "Заблокировать" : "Разблокировать"}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      {/* ==================== АУДИТ ==================== */}
      <section className="bg-white dark:bg-slate-800 rounded shadow p-4">
        <h2 className="font-semibold mb-3 dark:text-white">
          Последние события аудита
        </h2>
        <ul className="text-sm divide-y dark:divide-slate-700 dark:text-slate-200">
          {logs.map((l) => (
            <li key={l.id} className="p-2">
              [{new Date(l.created_at).toLocaleString()}] user#{l.user_id} —{" "}
              {l.action}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

function DashCard({
  label,
  value,
  color,
}: {
  label: string;
  value: string | number;
  color?: string;
}) {
  return (
    <div className="border rounded p-3 text-center dark:border-slate-700">
      <div className={`text-2xl font-bold ${color || "text-slate-800 dark:text-white"}`}>
        {value}
      </div>
      <div className="text-xs text-slate-500 mt-1">{label}</div>
    </div>
  );
}