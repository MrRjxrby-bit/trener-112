import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../../api/client";
import LineChart from "../../components/LineChart";
import BarChart from "../../components/BarChart";

type Scenario = {
  id: number;
  title: string;
  difficulty: number;
  time_limit_sec: number;
};

type Report = {
  id: number;
  scenario_id: number;
  score: number;
  timing_ok: number;
  text_similarity: number;
  created_at: string;
};

type ReportDetail = {
  id: number;
  scenario_id: number;
  scenario_title: string;
  score: number;
  timing_ok: boolean;
  grammar_ok: boolean;
  text_similarity: number;
  timing_delta_sec: number;
  details: {
    signs_ratio?: number;
    services_ratio?: number;
    expected_signs?: Record<string, string>;
    got_signs?: Record<string, string>;
    expected_services?: string[];
    got_services?: string[];
  };
  created_at: string;
};

type Progress = {
  timeline: { date: string | null; score: number; scenario_id: number }[];
  criteria: { label: string; value: number }[];
  summary: {
    total_sessions: number;
    avg_score: number;
    best_score: number;
    avg_duration: number;
  };
};

export default function StudentHome() {
  const [scenarios, setScenarios] = useState<Scenario[]>([]);
  const [reports, setReports] = useState<Report[]>([]);
  const [progress, setProgress] = useState<Progress | null>(null);
  const [detail, setDetail] = useState<ReportDetail | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const nav = useNavigate();

  const reload = async () => {
    const [s, r, p] = await Promise.all([
      api.get<Scenario[]>("/api/student/scenarios"),
      api.get<Report[]>("/api/student/reports"),
      api
        .get<Progress>("/api/student/progress")
        .catch(() => ({ data: null })),
    ]);
    setScenarios(s.data);
    setReports(r.data);
    setProgress(p.data);
  };

  useEffect(() => {
    reload().catch((e) =>
      setErr(e.response?.data?.detail || "Ошибка загрузки")
    );
  }, []);

  const start = async (scenario_id: number) => {
    try {
      const { data } = await api.post("/api/student/sessions/start");
      localStorage.setItem("session_id", String(data.session_id));
      localStorage.setItem("scenario_id", String(scenario_id));
      nav("/student/session");
    } catch {
      setErr("Не удалось начать занятие");
    }
  };

  const openDetail = async (id: number) => {
    try {
      const { data } = await api.get<ReportDetail>(
        `/api/student/reports/${id}`
      );
      setDetail(data);
    } catch {
      setErr("Не удалось загрузить детали отчёта");
    }
  };

  const lineData =
    progress?.timeline.map((t) => ({
      label: t.date
        ? new Date(t.date).toLocaleDateString("ru-RU", {
            day: "2-digit",
            month: "2-digit",
          })
        : "—",
      value: t.score,
    })) || [];

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold">Мои занятия</h1>

      {err && <div className="bg-red-100 text-red-800 p-2 rounded">{err}</div>}

      {/* ============ Прогресс ============ */}
      {progress && progress.summary.total_sessions > 0 && (
        <section className="bg-white rounded shadow p-4 space-y-4">
          <h2 className="font-semibold text-lg">Мой прогресс</h2>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <MetricCard
              label="Пройдено занятий"
              value={progress.summary.total_sessions}
            />
            <MetricCard
              label="Средний балл"
              value={progress.summary.avg_score}
              color={
                progress.summary.avg_score >= 70
                  ? "text-green-600"
                  : "text-red-600"
              }
            />
            <MetricCard
              label="Лучший балл"
              value={progress.summary.best_score}
              color="text-blue-600"
            />
            <MetricCard
              label="Средний тайминг"
              value={`${progress.summary.avg_duration > 0 ? "+" : ""}${
                progress.summary.avg_duration
              } сек`}
              color={
                progress.summary.avg_duration <= 0
                  ? "text-green-600"
                  : "text-orange-500"
              }
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="border rounded p-3">
              <div className="font-semibold mb-2 text-sm">
                Динамика баллов (последние занятия)
              </div>
              <LineChart data={lineData} />
            </div>

            <div className="border rounded p-3">
              <div className="font-semibold mb-2 text-sm">
                Средние оценки по критериям
              </div>
              <BarChart data={progress.criteria} color="auto" />
            </div>
          </div>
        </section>
      )}

      {/* ============ Назначенные сценарии ============ */}
      <section className="bg-white rounded shadow p-4">
        <h2 className="font-semibold mb-3">Назначенные сценарии</h2>
        {scenarios.length === 0 ? (
          <p className="text-slate-500">Пока ничего не назначено</p>
        ) : (
          <ul className="divide-y">
            {scenarios.map((s) => (
              <li key={s.id} className="p-3 flex items-center justify-between">
                <div>
                  <div className="font-medium">{s.title}</div>
                  <div className="text-sm text-slate-500">
                    Сложность {s.difficulty} · Лимит {s.time_limit_sec} сек
                  </div>
                </div>
                <button
                  onClick={() => start(s.id)}
                  className="bg-blue-600 text-white px-4 py-2 rounded"
                >
                  Начать занятие
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* ============ История результатов ============ */}
      <section className="bg-white rounded shadow p-4">
        <h2 className="font-semibold mb-3">История результатов</h2>
        {reports.length === 0 ? (
          <p className="text-slate-500">Пока нет отчётов</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-slate-100">
              <tr>
                <th className="p-2 text-left">ID</th>
                <th className="p-2 text-left">Сценарий</th>
                <th className="p-2 text-left">Балл</th>
                <th className="p-2 text-left">Тайминг</th>
                <th className="p-2 text-left">Совпадение</th>
                <th className="p-2 text-left">Дата</th>
                <th className="p-2"></th>
              </tr>
            </thead>
            <tbody>
              {reports.map((r) => (
                <tr key={r.id} className="border-t">
                  <td className="p-2">{r.id}</td>
                  <td className="p-2">#{r.scenario_id}</td>
                  <td className="p-2">
                    <span
                      className={
                        r.score >= 70 ? "text-green-600" : "text-red-600"
                      }
                    >
                      {r.score}
                    </span>
                  </td>
                  <td className="p-2">{r.timing_ok ? "OK" : "Просрочка"}</td>
                  <td className="p-2">{r.text_similarity}%</td>
                  <td className="p-2">
                    {new Date(r.created_at).toLocaleString()}
                  </td>
                  <td className="p-2 text-right">
                    <button
                      onClick={() => openDetail(r.id)}
                      className="text-blue-600 underline"
                    >
                      Подробнее
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      {/* ============ Модальное окно разбора ============ */}
      {detail && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={() => setDetail(null)}
        >
          <div
            className="bg-white rounded shadow-xl max-w-2xl w-full p-6 space-y-3 max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-bold">Разбор занятия</h2>
              <button
                onClick={() => setDetail(null)}
                className="text-slate-500 hover:text-slate-800 text-2xl leading-none"
              >
                ×
              </button>
            </div>

            <div className="text-sm text-slate-600">
              {detail.scenario_title || `Сценарий #${detail.scenario_id}`}
            </div>

            <div className="grid grid-cols-3 gap-3 py-3 border-y">
              <div className="text-center">
                <div
                  className={`text-3xl font-bold ${
                    detail.score >= 70 ? "text-green-600" : "text-red-600"
                  }`}
                >
                  {detail.score}
                </div>
                <div className="text-xs text-slate-500">Балл</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold">
                  {detail.text_similarity}%
                </div>
                <div className="text-xs text-slate-500">Совпадение текста</div>
              </div>
              <div className="text-center">
                <div
                  className={`text-3xl font-bold ${
                    detail.timing_ok ? "text-green-600" : "text-red-600"
                  }`}
                >
                  {detail.timing_ok ? "✓" : "!"}
                </div>
                <div className="text-xs text-slate-500">
                  Тайминг ({detail.timing_delta_sec} сек)
                </div>
              </div>
            </div>

            <div className="space-y-2 text-sm">
              <Line label="Грамматика" ok={detail.grammar_ok} />
              <Line
                label="Признаки"
                ok={(detail.details?.signs_ratio ?? 1) >= 1}
                extra={`совпадение ${Math.round(
                  (detail.details?.signs_ratio ?? 0) * 100
                )}%`}
              />
              <Line
                label="Службы"
                ok={(detail.details?.services_ratio ?? 1) >= 1}
                extra={`совпадение ${Math.round(
                  (detail.details?.services_ratio ?? 0) * 100
                )}%`}
              />
            </div>

            {detail.details?.expected_services &&
              detail.details.expected_services.length > 0 && (
                <div className="bg-slate-50 rounded p-3 text-xs space-y-2">
                  <div>
                    <div className="font-semibold mb-1">Эталонные службы:</div>
                    <div>
                      {detail.details.expected_services.join(", ") || "—"}
                    </div>
                  </div>
                  <div>
                    <div className="font-semibold mb-1">Вы выбрали:</div>
                    <div>
                      {detail.details.got_services?.join(", ") || "—"}
                    </div>
                  </div>
                </div>
              )}

            {detail.details?.expected_signs &&
              Object.keys(detail.details.expected_signs).length > 0 && (
                <div className="bg-slate-50 rounded p-3 text-xs space-y-2">
                  <div className="font-semibold">Признаки:</div>
                  {Object.entries(detail.details.expected_signs).map(
                    ([key, val]) => {
                      const got = detail.details.got_signs?.[key];
                      const ok = got === val;
                      return (
                        <div key={key} className="flex justify-between">
                          <span>{key}</span>
                          <span
                            className={ok ? "text-green-600" : "text-red-600"}
                          >
                            эталон: {val}, вы: {got ?? "—"}{" "}
                            {ok ? "✓" : "✗"}
                          </span>
                        </div>
                      );
                    }
                  )}
                </div>
              )}

            <button
              onClick={() => setDetail(null)}
              className="w-full bg-blue-600 text-white py-2 rounded"
            >
              Закрыть
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function MetricCard({
  label,
  value,
  color,
}: {
  label: string;
  value: string | number;
  color?: string;
}) {
  return (
    <div className="border rounded p-3 text-center">
      <div className={`text-2xl font-bold ${color || "text-slate-800"}`}>
        {value}
      </div>
      <div className="text-xs text-slate-500 mt-1">{label}</div>
    </div>
  );
}

function Line({
  label,
  ok,
  extra,
}: {
  label: string;
  ok: boolean;
  extra?: string;
}) {
  return (
    <div className="flex justify-between items-center">
      <span>{label}</span>
      <span className={ok ? "text-green-600" : "text-red-600"}>
        {ok ? "✓ Верно" : "✗ Ошибка"} {extra && `· ${extra}`}
      </span>
    </div>
  );
}