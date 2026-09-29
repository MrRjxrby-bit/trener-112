import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { api, downloadFile } from "../../api/client";
import Heatmap from "../../components/Heatmap";

type Scenario = {
  id: number;
  title: string;
  incident_type_code: string;
  difficulty: number;
  time_limit_sec: number;
  is_published: boolean;
  payload: any;
};

type Student = {
  id: number;
  username: string;
  full_name: string;
  role: string;
};

type Group = {
  id: number;
  name: string;
  description: string | null;
  members: { id: number; username: string; full_name: string }[];
};

type Report = {
  id: number;
  scenario_id: number;
  student_id: number;
  score: number;
  timing_ok: number;
  text_similarity: number;
};

type IncidentType = { code: string; name: string };

type StepDraft = {
  title: string;
  hint: string;
  expected_text: string;
  time_limit_sec: number;
};

type Insights = {
  total_reports: number;
  avg_score: number;
  avg_timing_delta: number;
  top_errors: { label: string; count: number; percent: number }[];
  worst_scenarios: {
    scenario_id: number;
    title: string;
    avg_score: number;
    attempts: number;
  }[];
  score_distribution: { range: string; count: number; percent: number }[];
};

type HeatmapData = {
  columns: { key: string; label: string }[];
  rows: {
    scenario_id: number;
    title: string;
    attempts: number;
    values: Record<string, number>;
  }[];
};

export default function TeacherHome() {
  const [scenarios, setScenarios] = useState<Scenario[]>([]);
  const [reports, setReports] = useState<Report[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [types, setTypes] = useState<IncidentType[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [insights, setInsights] = useState<Insights | null>(null);
  const [heatmap, setHeatmap] = useState<HeatmapData | null>(null);
  const [draft, setDraft] = useState<any>(null);
  const [exportBusy, setExportBusy] = useState(false);

  const [form, setForm] = useState({
    title: "",
    incident_type_code: "16",
    difficulty: 2,
    time_limit_sec: 30,
    expected_text: "Сообщение принято, дежурная бригада направлена на место.",
    expected_services: "102,103",
    audio_file: "call_dtp.mp3",
    transcript: "",
    is_published: true,
  });

  const [steps, setSteps] = useState<StepDraft[]>([]);
  const [assign, setAssign] = useState({ scenario_id: "", student_id: "" });
  const [busy, setBusy] = useState(false);
  const [genBusy, setGenBusy] = useState(false);
  const [assignBusy, setAssignBusy] = useState(false);

  // группы
  const [newGroup, setNewGroup] = useState({ name: "", description: "" });
  const [groupBusy, setGroupBusy] = useState(false);
  const [groupMemberPick, setGroupMemberPick] = useState<{
    [gid: number]: string;
  }>({});
  const [assignGroup, setAssignGroup] = useState({
    scenario_id: "",
    group_id: "",
  });
  const [assignGroupBusy, setAssignGroupBusy] = useState(false);

  const reload = async () => {
    try {
      const [s, r, u, t, ins, hm, g] = await Promise.all([
        api.get<Scenario[]>("/api/teacher/scenarios"),
        api.get<Report[]>("/api/teacher/reports"),
        api
          .get<Student[]>("/api/teacher/students")
          .catch(() => ({ data: [] })),
        api
          .get<IncidentType[]>("/api/dictionaries/types")
          .catch(() => ({ data: [] })),
        api.get<Insights>("/api/ai/insights").catch(() => ({ data: null })),
        api
          .get<HeatmapData>("/api/ai/heatmap")
          .catch(() => ({ data: null })),
        api.get<Group[]>("/api/teacher/groups").catch(() => ({ data: [] })),
      ]);
      setScenarios(s.data);
      setReports(r.data);
      setStudents(u.data.filter((x) => x.role === "student"));
      setTypes(t.data);
      setInsights(ins.data);
      setHeatmap(hm.data);
      setGroups(g.data);
    } catch {
      toast.error("Не удалось загрузить данные");
    }
  };

  useEffect(() => {
    reload();
  }, []);

  const gen = async () => {
    setGenBusy(true);
    const id = toast.loading("Генерируем черновик…");
    try {
      const { data } = await api.post(
        `/api/teacher/scenarios/generate?incident_type_code=${form.incident_type_code}`
      );
      setDraft(data);
      toast.success("Черновик готов", { id });
    } catch {
      toast.error("Не удалось сгенерировать черновик", { id });
    } finally {
      setGenBusy(false);
    }
  };

  const applyDraft = () => {
    if (!draft) return;
    setForm({
      ...form,
      title: draft.title || form.title,
      incident_type_code: draft.incident_type_code || form.incident_type_code,
      difficulty: draft.difficulty ?? form.difficulty,
      time_limit_sec: draft.time_limit_sec ?? form.time_limit_sec,
      expected_text: draft.payload?.expected_text || form.expected_text,
      expected_services: (draft.payload?.expected_services || []).join(","),
      audio_file: draft.payload?.audio_file || form.audio_file,
      transcript: draft.payload?.transcript || form.transcript,
      is_published: true,
    });
    toast.success("Черновик перенесён в форму");
  };

  const addStep = () => {
    setSteps([
      ...steps,
      { title: "", hint: "", expected_text: "", time_limit_sec: 15 },
    ]);
  };

  const updateStep = (i: number, field: keyof StepDraft, value: any) => {
    const copy = [...steps];
    (copy[i] as any)[field] = value;
    setSteps(copy);
  };

  const removeStep = (i: number) => {
    setSteps(steps.filter((_, idx) => idx !== i));
  };

  const createScenario = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const payload = {
        title: form.title,
        incident_type_code: form.incident_type_code,
        difficulty: Number(form.difficulty),
        time_limit_sec: Number(form.time_limit_sec),
        is_published: form.is_published,
        payload: {
          expected_text: form.expected_text,
          expected_services: form.expected_services
            .split(",")
            .map((x) => x.trim())
            .filter(Boolean),
          expected_signs: {},
          audio_file: form.audio_file,
          transcript: form.transcript,
        },
        steps: steps
          .filter((s) => s.title.trim() !== "")
          .map((s) => ({
            title: s.title,
            hint: s.hint,
            expected_text: s.expected_text,
            time_limit_sec: Number(s.time_limit_sec) || 15,
          })),
      };
      await api.post("/api/teacher/scenarios", payload);
      toast.success("Сценарий создан");
      setForm({ ...form, title: "", transcript: "" });
      setSteps([]);
      reload();
    } catch (e: any) {
      toast.error(e.response?.data?.detail || "Ошибка создания сценария");
    } finally {
      setBusy(false);
    }
  };

  const publish = async (id: number) => {
    try {
      await api.post(`/api/teacher/scenarios/${id}/publish`);
      toast.success(`Сценарий #${id} опубликован`);
      reload();
    } catch {
      toast.error("Не удалось опубликовать сценарий");
    }
  };

  const doAssign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assign.scenario_id || !assign.student_id) {
      toast.error("Выберите сценарий и студента");
      return;
    }
    setAssignBusy(true);
    try {
      await api.post(
        `/api/teacher/assign?scenario_id=${assign.scenario_id}&student_id=${assign.student_id}`
      );
      toast.success("Сценарий назначен");
      setAssign({ scenario_id: "", student_id: "" });
    } catch {
      toast.error("Не удалось назначить сценарий");
    } finally {
      setAssignBusy(false);
    }
  };

  const exportCsv = async () => {
    setExportBusy(true);
    const id = toast.loading("Готовим CSV…");
    try {
      const filename = `reports_${new Date()
        .toISOString()
        .slice(0, 19)
        .replace(/[:T]/g, "_")}.csv`;
      await downloadFile("/api/teacher/reports/export", filename);
      toast.success("CSV скачан", { id });
    } catch {
      toast.error("Не удалось скачать CSV", { id });
    } finally {
      setExportBusy(false);
    }
  };

  // ============ ГРУППЫ ============
  const createGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGroup.name.trim()) {
      toast.error("Введите название группы");
      return;
    }
    setGroupBusy(true);
    try {
      await api.post("/api/teacher/groups", {
        name: newGroup.name,
        description: newGroup.description,
      });
      toast.success("Группа создана");
      setNewGroup({ name: "", description: "" });
      reload();
    } catch {
      toast.error("Не удалось создать группу");
    } finally {
      setGroupBusy(false);
    }
  };

  const deleteGroup = async (gid: number) => {
    if (!confirm("Удалить группу?")) return;
    try {
      await api.delete(`/api/teacher/groups/${gid}`);
      toast.success("Группа удалена");
      reload();
    } catch {
      toast.error("Не удалось удалить группу");
    }
  };

  const addMember = async (gid: number) => {
    const sid = groupMemberPick[gid];
    if (!sid) {
      toast.error("Выберите студента");
      return;
    }
    try {
      await api.post(`/api/teacher/groups/${gid}/members?student_id=${sid}`);
      toast.success("Студент добавлен");
      setGroupMemberPick({ ...groupMemberPick, [gid]: "" });
      reload();
    } catch {
      toast.error("Не удалось добавить студента");
    }
  };

  const removeMember = async (gid: number, sid: number) => {
    try {
      await api.delete(`/api/teacher/groups/${gid}/members/${sid}`);
      toast.success("Студент удалён из группы");
      reload();
    } catch {
      toast.error("Не удалось удалить студента");
    }
  };

  const doAssignGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assignGroup.scenario_id || !assignGroup.group_id) {
      toast.error("Выберите сценарий и группу");
      return;
    }
    setAssignGroupBusy(true);
    try {
      const { data } = await api.post(
        `/api/teacher/assign-group?scenario_id=${assignGroup.scenario_id}&group_id=${assignGroup.group_id}`
      );
      toast.success(
        `Назначено ${data.added} студентам${
          data.skipped > 0 ? ` (пропущено ${data.skipped})` : ""
        }`
      );
      setAssignGroup({ scenario_id: "", group_id: "" });
    } catch {
      toast.error("Не удалось назначить сценарий группе");
    } finally {
      setAssignGroupBusy(false);
    }
  };

  const userById = (id: number) => students.find((s) => s.id === id);
  const scenarioById = (id: number) => scenarios.find((s) => s.id === id);

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold">Кабинет преподавателя</h1>

      {/* ============ Аналитика группы ============ */}
      <section className="bg-white rounded shadow p-4 space-y-4">
        <h2 className="font-semibold text-lg">Аналитика группы</h2>

        {!insights || insights.total_reports === 0 ? (
          <p className="text-slate-500 text-sm">Нет данных для анализа</p>
        ) : (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <MetricCard label="Всего отчётов" value={insights.total_reports} />
              <MetricCard
                label="Средний балл"
                value={insights.avg_score}
                color={
                  insights.avg_score >= 70 ? "text-green-600" : "text-red-600"
                }
              />
              <MetricCard
                label="Средний тайминг"
                value={`${insights.avg_timing_delta > 0 ? "+" : ""}${
                  insights.avg_timing_delta
                } сек`}
                color={
                  insights.avg_timing_delta <= 0
                    ? "text-green-600"
                    : "text-orange-500"
                }
              />
              <MetricCard
                label="Проблемных сценариев"
                value={insights.worst_scenarios.length}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="border rounded p-3">
                <div className="font-semibold mb-2 text-sm">
                  Топ ошибок группы
                </div>
                {insights.top_errors.length === 0 ? (
                  <div className="text-xs text-slate-500">Ошибок нет</div>
                ) : (
                  <ul className="space-y-1 text-sm">
                    {insights.top_errors.map((e, i) => (
                      <li key={i}>
                        <div className="flex justify-between">
                          <span>{e.label}</span>
                          <span className="text-slate-500">
                            {e.count} ({e.percent}%)
                          </span>
                        </div>
                        <div className="w-full bg-slate-200 h-1.5 rounded mt-0.5">
                          <div
                            className="bg-red-500 h-1.5 rounded"
                            style={{ width: `${e.percent}%` }}
                          />
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div className="border rounded p-3">
                <div className="font-semibold mb-2 text-sm">
                  Проблемные сценарии
                </div>
                {insights.worst_scenarios.length === 0 ? (
                  <div className="text-xs text-slate-500">
                    Все сценарии проходят успешно
                  </div>
                ) : (
                  <ul className="space-y-2 text-sm">
                    {insights.worst_scenarios.map((w) => (
                      <li
                        key={w.scenario_id}
                        className="flex justify-between items-center"
                      >
                        <div>
                          <div className="font-medium">{w.title}</div>
                          <div className="text-xs text-slate-500">
                            попыток: {w.attempts}
                          </div>
                        </div>
                        <div
                          className={
                            w.avg_score >= 70
                              ? "text-green-600 font-semibold"
                              : "text-red-600 font-semibold"
                          }
                        >
                          {w.avg_score}
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>

            <div className="border rounded p-3">
              <div className="font-semibold mb-2 text-sm">
                Распределение баллов
              </div>
              <div className="flex gap-2">
                {insights.score_distribution.map((b, i) => (
                  <div key={i} className="flex-1 text-center">
                    <div className="text-xs text-slate-500">{b.range}</div>
                    <div
                      className="bg-blue-500 rounded mt-1"
                      style={{
                        height: `${Math.max(6, b.percent * 1.2)}px`,
                      }}
                    />
                    <div className="text-xs mt-1">
                      {b.count} ({b.percent}%)
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </section>

      {/* ============ Тепловая карта ошибок ============ */}
      <section className="bg-white rounded shadow p-4 space-y-3">
        <h2 className="font-semibold text-lg">Тепловая карта ошибок</h2>
        <p className="text-xs text-slate-500">
          Показывает долю отчётов с ошибкой по каждому критерию для каждого
          сценария. Чем краснее — тем чаще ошибаются студенты.
        </p>
        {heatmap ? (
          <Heatmap columns={heatmap.columns} rows={heatmap.rows} />
        ) : (
          <p className="text-slate-500 text-sm">Загрузка…</p>
        )}
      </section>

      {/* ============ Группы студентов ============ */}
      <section className="bg-white rounded shadow p-4 space-y-4">
        <h2 className="font-semibold text-lg">Группы студентов</h2>

        <form
          onSubmit={createGroup}
          className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end"
        >
          <label className="text-sm">
            Название группы
            <input
              className="border p-2 rounded w-full"
              placeholder="например, «Смена №1»"
              value={newGroup.name}
              onChange={(e) =>
                setNewGroup({ ...newGroup, name: e.target.value })
              }
              required
            />
          </label>
          <label className="text-sm md:col-span-1">
            Описание
            <input
              className="border p-2 rounded w-full"
              placeholder="необязательно"
              value={newGroup.description}
              onChange={(e) =>
                setNewGroup({ ...newGroup, description: e.target.value })
              }
            />
          </label>
          <button
            type="submit"
            disabled={groupBusy}
            className={`bg-blue-600 text-white px-4 py-2 rounded ${
              groupBusy ? "opacity-50 cursor-not-allowed" : "hover:bg-blue-700"
            }`}
          >
            {groupBusy ? "Создаём…" : "Создать группу"}
          </button>
        </form>

        {groups.length === 0 ? (
          <p className="text-slate-500 text-sm">Групп пока нет</p>
        ) : (
          <div className="space-y-3">
            {groups.map((g) => (
              <div key={g.id} className="border rounded p-3 space-y-2">
                <div className="flex justify-between items-start">
                  <div>
                    <div className="font-semibold">{g.name}</div>
                    {g.description && (
                      <div className="text-xs text-slate-500">
                        {g.description}
                      </div>
                    )}
                    <div className="text-xs text-slate-500 mt-1">
                      Участников: {g.members.length}
                    </div>
                  </div>
                  <button
                    onClick={() => deleteGroup(g.id)}
                    className="text-red-600 text-xs underline"
                  >
                    Удалить группу
                  </button>
                </div>

                {/* участники */}
                {g.members.length > 0 && (
                  <ul className="flex flex-wrap gap-2">
                    {g.members.map((m) => (
                      <li
                        key={m.id}
                        className="bg-slate-100 rounded px-2 py-1 text-xs flex items-center gap-2"
                      >
                        <span>{m.full_name}</span>
                        <button
                          onClick={() => removeMember(g.id, m.id)}
                          className="text-red-600"
                          title="Удалить из группы"
                        >
                          ×
                        </button>
                      </li>
                    ))}
                  </ul>
                )}

                {/* добавить участника */}
                <div className="flex gap-2 items-center">
                  <select
                    className="border p-1 rounded text-sm flex-1"
                    value={groupMemberPick[g.id] || ""}
                    onChange={(e) =>
                      setGroupMemberPick({
                        ...groupMemberPick,
                        [g.id]: e.target.value,
                      })
                    }
                  >
                    <option value="">— выбрать студента —</option>
                    {students
                      .filter(
                        (s) => !g.members.some((m) => m.id === s.id)
                      )
                      .map((s) => (
                        <option key={s.id} value={s.id}>
                          #{s.id} — {s.full_name} ({s.username})
                        </option>
                      ))}
                  </select>
                  <button
                    onClick={() => addMember(g.id)}
                    className="bg-green-600 text-white px-3 py-1 rounded text-sm hover:bg-green-700"
                  >
                    Добавить
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ============ Создать сценарий ============ */}
      <section className="bg-white rounded shadow p-4 space-y-3">
        <h2 className="font-semibold">Создать сценарий</h2>

        <div className="flex gap-2 flex-wrap">
          <select
            className="border p-2 rounded"
            value={form.incident_type_code}
            onChange={(e) =>
              setForm({ ...form, incident_type_code: e.target.value })
            }
          >
            {types.length === 0 && <option value="16">ДТП (16)</option>}
            {types.map((t) => (
              <option key={t.code} value={t.code}>
                {t.name} ({t.code})
              </option>
            ))}
          </select>

          <button
            type="button"
            onClick={gen}
            disabled={genBusy}
            className={`bg-blue-600 text-white px-4 py-2 rounded ${
              genBusy ? "opacity-50 cursor-not-allowed" : "hover:bg-blue-700"
            }`}
          >
            {genBusy ? "Генерация…" : "Сгенерировать черновик"}
          </button>

          {draft && (
            <button
              type="button"
              onClick={applyDraft}
              className="bg-slate-700 text-white px-4 py-2 rounded hover:bg-slate-800"
            >
              Перенести черновик в форму
            </button>
          )}
        </div>

        <form
          onSubmit={createScenario}
          className="grid grid-cols-1 md:grid-cols-2 gap-3"
        >
          <input
            className="border p-2 rounded md:col-span-2"
            placeholder="Название сценария"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            required
          />

          <label className="text-sm">
            Сложность (1–5)
            <input
              type="number"
              min={1}
              max={5}
              className="border p-2 rounded w-full"
              value={form.difficulty}
              onChange={(e) =>
                setForm({ ...form, difficulty: Number(e.target.value) })
              }
            />
          </label>

          <label className="text-sm">
            Лимит времени (сек)
            <input
              type="number"
              min={5}
              max={600}
              className="border p-2 rounded w-full"
              value={form.time_limit_sec}
              onChange={(e) =>
                setForm({ ...form, time_limit_sec: Number(e.target.value) })
              }
            />
          </label>

          <label className="text-sm md:col-span-2">
            Эталонный текст ответа
            <textarea
              className="border p-2 rounded w-full"
              rows={2}
              value={form.expected_text}
              onChange={(e) =>
                setForm({ ...form, expected_text: e.target.value })
              }
            />
          </label>

          <label className="text-sm md:col-span-2">
            Службы (коды через запятую, напр. 102,103)
            <input
              className="border p-2 rounded w-full"
              value={form.expected_services}
              onChange={(e) =>
                setForm({ ...form, expected_services: e.target.value })
              }
            />
          </label>

          <label className="text-sm md:col-span-2">
            Аудиофайл звонка (имя в папке backend/app/data/audio)
            <input
              className="border p-2 rounded w-full"
              placeholder="например, call_dtp.mp3"
              value={form.audio_file}
              onChange={(e) =>
                setForm({ ...form, audio_file: e.target.value })
              }
            />
          </label>

          <label className="text-sm md:col-span-2">
            Транскрипт звонка
            <textarea
              className="border p-2 rounded w-full"
              rows={3}
              value={form.transcript}
              onChange={(e) =>
                setForm({ ...form, transcript: e.target.value })
              }
            />
          </label>

          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={form.is_published}
              onChange={(e) =>
                setForm({ ...form, is_published: e.target.checked })
              }
            />
            Опубликовать сразу
          </label>

          <div className="md:col-span-2 border-t pt-3 mt-2">
            <div className="flex justify-between items-center mb-2">
              <div className="font-semibold">Этапы сценария</div>
              <button
                type="button"
                onClick={addStep}
                className="text-blue-600 underline text-sm"
              >
                + Добавить этап
              </button>
            </div>

            {steps.length === 0 && (
              <div className="text-xs text-slate-500">
                Этапы не заданы. Студент пройдёт сценарий как одну карточку.
              </div>
            )}

            {steps.map((st, i) => (
              <div key={i} className="border rounded p-2 mb-2 bg-slate-50">
                <div className="flex justify-between items-center mb-1">
                  <div className="text-sm font-medium">Этап {i + 1}</div>
                  <button
                    type="button"
                    onClick={() => removeStep(i)}
                    className="text-red-600 text-xs underline"
                  >
                    Удалить
                  </button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
                  <input
                    className="border p-1 rounded text-sm"
                    placeholder="Название этапа"
                    value={st.title}
                    onChange={(e) => updateStep(i, "title", e.target.value)}
                  />
                  <input
                    className="border p-1 rounded text-sm"
                    placeholder="Подсказка"
                    value={st.hint}
                    onChange={(e) => updateStep(i, "hint", e.target.value)}
                  />
                  <input
                    className="border p-1 rounded text-sm"
                    placeholder="Эталонный текст"
                    value={st.expected_text}
                    onChange={(e) =>
                      updateStep(i, "expected_text", e.target.value)
                    }
                  />
                  <input
                    type="number"
                    className="border p-1 rounded text-sm"
                    placeholder="Сек"
                    value={st.time_limit_sec}
                    onChange={(e) =>
                      updateStep(i, "time_limit_sec", Number(e.target.value))
                    }
                  />
                </div>
              </div>
            ))}
          </div>

          <button
            type="submit"
            disabled={busy}
            className={`bg-green-600 text-white px-4 py-2 rounded md:col-span-2 ${
              busy ? "opacity-50 cursor-not-allowed" : "hover:bg-green-700"
            }`}
          >
            {busy ? "Создаём…" : "Создать сценарий"}
          </button>
        </form>
      </section>

      {/* ============ Назначение одиночное ============ */}
      <section className="bg-white rounded shadow p-4 space-y-3">
        <h2 className="font-semibold">Назначить сценарий студенту</h2>
        <form onSubmit={doAssign} className="flex flex-wrap gap-3 items-end">
          <label className="text-sm flex-1 min-w-[200px]">
            Сценарий
            <select
              className="border p-2 rounded w-full"
              value={assign.scenario_id}
              onChange={(e) =>
                setAssign({ ...assign, scenario_id: e.target.value })
              }
            >
              <option value="">— выберите —</option>
              {scenarios
                .filter((s) => s.is_published)
                .map((s) => (
                  <option key={s.id} value={s.id}>
                    #{s.id} — {s.title}
                  </option>
                ))}
            </select>
          </label>

          <label className="text-sm flex-1 min-w-[200px]">
            Студент
            <select
              className="border p-2 rounded w-full"
              value={assign.student_id}
              onChange={(e) =>
                setAssign({ ...assign, student_id: e.target.value })
              }
            >
              <option value="">— выберите —</option>
              {students.map((s) => (
                <option key={s.id} value={s.id}>
                  #{s.id} — {s.full_name} ({s.username})
                </option>
              ))}
            </select>
          </label>

          <button
            type="submit"
            disabled={assignBusy}
            className={`bg-blue-600 text-white px-4 py-2 rounded ${
              assignBusy ? "opacity-50 cursor-not-allowed" : "hover:bg-blue-700"
            }`}
          >
            {assignBusy ? "Назначаем…" : "Назначить"}
          </button>
        </form>
      </section>

      {/* ============ Назначение группе ============ */}
      <section className="bg-white rounded shadow p-4 space-y-3">
        <h2 className="font-semibold">Назначить сценарий группе</h2>
        {groups.length === 0 ? (
          <p className="text-slate-500 text-sm">
            Сначала создайте хотя бы одну группу выше
          </p>
        ) : (
          <form
            onSubmit={doAssignGroup}
            className="flex flex-wrap gap-3 items-end"
          >
            <label className="text-sm flex-1 min-w-[200px]">
              Сценарий
              <select
                className="border p-2 rounded w-full"
                value={assignGroup.scenario_id}
                onChange={(e) =>
                  setAssignGroup({
                    ...assignGroup,
                    scenario_id: e.target.value,
                  })
                }
              >
                <option value="">— выберите —</option>
                {scenarios
                  .filter((s) => s.is_published)
                  .map((s) => (
                    <option key={s.id} value={s.id}>
                      #{s.id} — {s.title}
                    </option>
                  ))}
              </select>
            </label>

            <label className="text-sm flex-1 min-w-[200px]">
              Группа
              <select
                className="border p-2 rounded w-full"
                value={assignGroup.group_id}
                onChange={(e) =>
                  setAssignGroup({
                    ...assignGroup,
                    group_id: e.target.value,
                  })
                }
              >
                <option value="">— выберите —</option>
                {groups.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.name} (участников: {g.members.length})
                  </option>
                ))}
              </select>
            </label>

            <button
              type="submit"
              disabled={assignGroupBusy}
              className={`bg-emerald-600 text-white px-4 py-2 rounded ${
                assignGroupBusy
                  ? "opacity-50 cursor-not-allowed"
                  : "hover:bg-emerald-700"
              }`}
            >
              {assignGroupBusy ? "Назначаем…" : "Назначить группе"}
            </button>
          </form>
        )}
      </section>

      {/* ============ Сценарии ============ */}
      <section className="bg-white rounded shadow p-4">
        <h2 className="font-semibold mb-3">Сценарии</h2>
        <table className="w-full text-sm">
          <thead className="bg-slate-100">
            <tr>
              <th className="p-2 text-left">ID</th>
              <th className="p-2 text-left">Название</th>
              <th className="p-2 text-left">Тип</th>
              <th className="p-2 text-left">Сложн.</th>
              <th className="p-2 text-left">Лимит</th>
              <th className="p-2 text-left">Статус</th>
              <th className="p-2"></th>
            </tr>
          </thead>
          <tbody>
            {scenarios.map((s) => (
              <tr key={s.id} className="border-t">
                <td className="p-2">{s.id}</td>
                <td className="p-2">{s.title}</td>
                <td className="p-2">{s.incident_type_code}</td>
                <td className="p-2">{s.difficulty}</td>
                <td className="p-2">{s.time_limit_sec} сек</td>
                <td className="p-2">
                  {s.is_published ? (
                    <span className="text-green-600">опубликован</span>
                  ) : (
                    <span className="text-orange-600">черновик</span>
                  )}
                </td>
                <td className="p-2 text-right">
                  {!s.is_published && (
                    <button
                      onClick={() => publish(s.id)}
                      className="text-blue-600 underline"
                    >
                      Опубликовать
                    </button>
                  )}
                </td>
              </tr>
            ))}
            {scenarios.length === 0 && (
              <tr>
                <td colSpan={7} className="p-3 text-slate-500">
                  Пока нет сценариев
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </section>

      {/* ============ Отчёты ============ */}
      <section className="bg-white rounded shadow p-4">
        <div className="flex justify-between items-center mb-3">
          <h2 className="font-semibold">Отчёты студентов</h2>
          <button
            onClick={exportCsv}
            disabled={exportBusy || reports.length === 0}
            className={`bg-emerald-600 text-white px-3 py-1.5 rounded text-sm ${
              exportBusy || reports.length === 0
                ? "opacity-50 cursor-not-allowed"
                : "hover:bg-emerald-700"
            }`}
          >
            {exportBusy ? "Готовим…" : "Скачать CSV"}
          </button>
        </div>
        <table className="w-full text-sm">
          <thead className="bg-slate-100">
            <tr>
              <th className="p-2 text-left">ID</th>
              <th className="p-2 text-left">Студент</th>
              <th className="p-2 text-left">Сценарий</th>
              <th className="p-2 text-left">Балл</th>
              <th className="p-2 text-left">Тайминг</th>
              <th className="p-2 text-left">Совпадение</th>
            </tr>
          </thead>
          <tbody>
            {reports.map((r) => (
              <tr key={r.id} className="border-t">
                <td className="p-2">{r.id}</td>
                <td className="p-2">
                  {userById(r.student_id)?.full_name || `#${r.student_id}`}
                </td>
                <td className="p-2">
                  {scenarioById(r.scenario_id)?.title || `#${r.scenario_id}`}
                </td>
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
              </tr>
            ))}
            {reports.length === 0 && (
              <tr>
                <td colSpan={6} className="p-3 text-slate-500">
                  Пока нет отчётов
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </section>
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