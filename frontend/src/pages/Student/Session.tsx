import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../../api/client";
import Card112, { type Card112Value } from "../../components/Card112";

const API_URL = "http://localhost:8000";

type TypeItem = { code: string; name: string };
type ServiceItem = { code: string; name: string };
type SignItem = { code: string; name: string; options: string[] };
type OkrugItem = { code: string; name: string };

type Scenario = {
  id: number;
  title: string;
  incident_type_code: string;
  time_limit_sec: number;
  payload: {
    address?: string;
    okrug?: string;
    audio_file?: string;
    transcript?: string;
    expected_text?: string;
    expected_services?: string[];
    expected_signs?: Record<string, string>;
  };
};

type Step = {
  id: number;
  order_index: number;
  title: string;
  hint?: string;
  expected_text?: string;
  time_limit_sec: number;
};

type StepResult = {
  step_index: number;
  title: string;
  text: string;
  elapsed_sec: number;
  time_limit_sec: number;
  timing_ok: boolean;
};

export default function StudentSession() {
  const nav = useNavigate();
  const sessionId = Number(localStorage.getItem("session_id"));
  const scenarioId = Number(localStorage.getItem("scenario_id"));

  const [scenario, setScenario] = useState<Scenario | null>(null);
  const [types, setTypes] = useState<TypeItem[]>([]);
  const [services, setServices] = useState<ServiceItem[]>([]);
  const [signs, setSigns] = useState<SignItem[]>([]);
  const [okrugs, setOkrugs] = useState<OkrugItem[]>([]);

  const [steps, setSteps] = useState<Step[]>([]);
  const [currentStep, setCurrentStep] = useState(0);
  const [stepText, setStepText] = useState("");
  const [stepStartedAt, setStepStartedAt] = useState<number>(0);
  const [stepSeconds, setStepSeconds] = useState<number>(0);
  const [stepResults, setStepResults] = useState<StepResult[]>([]);

  const [callAccepted, setCallAccepted] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const startedAtRef = useRef<number>(0);

  // ============ загрузка данных ============
  useEffect(() => {
    (async () => {
      try {
        const [sc, t, s, g, o] = await Promise.all([
          api.get<Scenario[]>("/api/student/scenarios"),
          api.get<TypeItem[]>("/api/dictionaries/types"),
          api.get<ServiceItem[]>("/api/dictionaries/services"),
          api.get<SignItem[]>("/api/dictionaries/signs"),
          api.get<OkrugItem[]>("/api/dictionaries/okrugs"),
        ]);
        const found = sc.data.find((x) => x.id === scenarioId);
        if (!found) {
          setErr("Сценарий не найден");
          return;
        }
        setScenario(found);
        setTypes(t.data);
        setServices(s.data);
        setSigns(g.data);
        setOkrugs(o.data);

        // этапы сценария
        try {
          const { data: st } = await api.get<Step[]>(
            `/api/student/scenarios/${scenarioId}/steps`
          );
          setSteps(st);
        } catch {
          setSteps([]);
        }
      } catch (e: any) {
        setErr(e.response?.data?.detail || "Ошибка загрузки данных");
      }
    })();
  }, [scenarioId]);

  // ============ таймер этапа ============
  useEffect(() => {
    if (!steps.length || currentStep >= steps.length || !callAccepted) return;
    if (stepSeconds <= 0) return;
    const t = setTimeout(() => setStepSeconds((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [stepSeconds, currentStep, steps, callAccepted]);

  // ============ принять звонок ============
  const acceptCall = () => {
    setCallAccepted(true);
    startedAtRef.current = Date.now();

    if (steps.length > 0) {
      setCurrentStep(0);
      setStepStartedAt(Date.now());
      setStepSeconds(steps[0].time_limit_sec);
    }

    if (audioRef.current) {
      audioRef.current.play().catch(() => {});
    }
  };

  // ============ следующий этап ============
  const nextStep = () => {
    const cur = steps[currentStep];
    const elapsed = (Date.now() - stepStartedAt) / 1000;
    const result: StepResult = {
      step_index: currentStep,
      title: cur.title,
      text: stepText,
      elapsed_sec: Math.round(elapsed * 10) / 10,
      time_limit_sec: cur.time_limit_sec,
      timing_ok: elapsed <= cur.time_limit_sec,
    };
    setStepResults((prev) => [...prev, result]);
    setStepText("");

    const next = currentStep + 1;
    setCurrentStep(next);
    if (next < steps.length) {
      setStepStartedAt(Date.now());
      setStepSeconds(steps[next].time_limit_sec);
    }
  };

  // ============ сохранить карточку ============
  const save = async (v: Card112Value) => {
    if (!scenario) return;
    setErr(null);
    setMsg(null);
    const duration = (Date.now() - startedAtRef.current) / 1000;
    try {
      await api.post(`/api/student/sessions/${sessionId}/action`, {
        scenario_id: scenario.id,
        action_type: "save",
        duration_sec: duration,
        payload: { ...v, step_results: stepResults },
      });
      const { data } = await api.post(
        `/api/student/sessions/${sessionId}/finish`
      );
      localStorage.removeItem("session_id");
      localStorage.removeItem("scenario_id");
      setMsg(
        `Отчёт создан (report_id=${data.report_ids?.[0] ?? "—"}). Возвращаемся…`
      );
      setTimeout(() => nav("/student", { replace: true }), 1200);
    } catch (e: any) {
      setErr(e.response?.data?.detail || "Не удалось сохранить карточку");
    }
  };

  // ============ отмена ============
  const cancel = () => {
    localStorage.removeItem("session_id");
    localStorage.removeItem("scenario_id");
    nav("/student", { replace: true });
  };

  // ============ экран загрузки ============
  if (!scenario) {
    return (
      <div className="p-6">
        Загрузка…
        {err && <div className="text-red-600 mt-2">{err}</div>}
      </div>
    );
  }

  const audioFile = scenario.payload?.audio_file;
  const transcript = scenario.payload?.transcript;

  // ============ экран 1: входящий вызов ============
  if (!callAccepted) {
    return (
      <div className="max-w-2xl mx-auto mt-20 bg-white rounded shadow p-8 text-center space-y-4">
        <div className="text-6xl">📞</div>
        <h1 className="text-2xl font-bold">Входящий вызов</h1>
        <p className="text-slate-600">
          Сценарий: <b>{scenario.title}</b>
        </p>
        <p className="text-slate-500 text-sm">
          Лимит времени: {scenario.time_limit_sec} сек.
          {steps.length > 0 && ` · Этапов: ${steps.length}.`}
        </p>
        <button
          onClick={acceptCall}
          className="bg-green-600 text-white px-8 py-3 rounded text-lg font-semibold hover:bg-green-700"
        >
          Ответить
        </button>

        {audioFile && (
          <audio
            ref={audioRef}
            src={`${API_URL}/audio/${audioFile}`}
            preload="auto"
            className="hidden"
          />
        )}
      </div>
    );
  }

  // ============ экран 2: карточка + этапы ============
  const stepPanelVisible = steps.length > 0 && currentStep < steps.length;
  const stepsFinished = steps.length > 0 && currentStep >= steps.length;

  return (
    <div className="max-w-7xl mx-auto space-y-3">
      {transcript && (
        <div className="bg-yellow-100 border-l-4 border-yellow-500 p-3 rounded text-sm">
          <div className="font-semibold mb-1">Заявитель:</div>
          <div className="italic">{transcript}</div>
        </div>
      )}

      {msg && (
        <div className="bg-green-100 text-green-800 p-2 rounded">{msg}</div>
      )}
      {err && <div className="bg-red-100 text-red-800 p-2 rounded">{err}</div>}

      {/* ============ Панель этапов ============ */}
      {stepPanelVisible && (
        <div className="bg-blue-50 border border-blue-300 rounded p-3 space-y-2">
          <div className="flex justify-between items-center">
            <div>
              <div className="font-semibold">
                Этап {currentStep + 1} из {steps.length}:{" "}
                {steps[currentStep].title}
              </div>
              {steps[currentStep].hint && (
                <div className="text-xs text-slate-600 mt-0.5">
                  {steps[currentStep].hint}
                </div>
              )}
            </div>
            <div className="text-xl font-mono font-bold text-red-600">
              {stepSeconds} сек
            </div>
          </div>
          <textarea
            className="card-input"
            rows={2}
            placeholder="Введите реплику / действие по этапу"
            value={stepText}
            onChange={(e) => setStepText(e.target.value)}
          />
          <button
            type="button"
            onClick={nextStep}
            className="bg-blue-600 text-white px-4 py-2 rounded text-sm"
          >
            {currentStep + 1 === steps.length
              ? "Завершить этапы"
              : "Следующий этап"}
          </button>
        </div>
      )}

      {stepsFinished && (
        <div className="bg-green-50 border border-green-300 rounded p-3 text-sm">
          Все этапы пройдены. Заполните карточку происшествия и нажмите
          «Сохранить».
        </div>
      )}

      <Card112
        incidentTypes={types}
        services={services}
        signs={signs}
        okrugs={okrugs}
        timeLimitSec={scenario.time_limit_sec}
        initial={{
          incident_type: scenario.incident_type_code,
          address: scenario.payload?.address || "",
          okrug: scenario.payload?.okrug || "cao",
        }}
        onSave={save}
        onCancel={cancel}
      />
    </div>
  );
}