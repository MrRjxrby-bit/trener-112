import { useEffect, useState } from "react";

export type Card112Value = {
  surname: string;
  address: string;
  okrug: string;
  district: string;
  street: string;
  house: string;
  incident_type: string;
  signs: Record<string, string>;
  services: string[];
  text: string;
  status_flags: string[];
};

type TypeItem = { code: string; name: string };
type ServiceItem = { code: string; name: string };
type SignItem = { code: string; name: string; options: string[] };

export default function Card112({
  incidentTypes,
  services,
  signs,
  okrugs,
  initial,
  timeLimitSec,
  onSave,
  onCancel,
}: {
  incidentTypes: TypeItem[];
  services: ServiceItem[];
  signs: SignItem[];
  okrugs: { code: string; name: string }[];
  initial?: Partial<Card112Value>;
  timeLimitSec: number;
  onSave: (v: Card112Value) => void;
  onCancel: () => void;
}) {
  const [v, setV] = useState<Card112Value>({
    surname: "",
    address: "",
    okrug: "cao",
    district: "",
    street: "",
    house: "",
    incident_type: incidentTypes[0]?.code || "",
    signs: {},
    services: [],
    text: "",
    status_flags: [],
    ...initial,
  });

  const [seconds, setSeconds] = useState(timeLimitSec);
  const [serviceSearch, setServiceSearch] = useState("");

  useEffect(() => {
    if (seconds <= 0) return;
    const t = setTimeout(() => setSeconds((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [seconds]);

  // ============ ГОРЯЧИЕ КЛАВИШИ ============
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // Ctrl+S — Сохранить
      if (e.ctrlKey && e.key.toLowerCase() === "s") {
        e.preventDefault();
        onSave(v);
        return;
      }
      // Ctrl+Enter — сохранить из любого поля
      if (e.ctrlKey && e.key === "Enter") {
        e.preventDefault();
        onSave(v);
        return;
      }
      // Esc — Отмена
      if (e.key === "Escape") {
        e.preventDefault();
        onCancel();
        return;
      }
      // Ctrl+1..5 — быстрая отметка первых 5 признаков как "Да"
      if (e.ctrlKey && ["1", "2", "3", "4", "5"].includes(e.key)) {
        const idx = Number(e.key) - 1;
        const sign = signs[idx];
        if (sign) {
          e.preventDefault();
          const option = sign.options[0]; // обычно "Да"
          setV((prev) => ({
            ...prev,
            signs: { ...prev.signs, [sign.code]: option },
          }));
        }
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [v, onSave, onCancel, signs]);

  const up = <K extends keyof Card112Value>(k: K, val: Card112Value[K]) =>
    setV((prev) => ({ ...prev, [k]: val }));

  const toggleService = (code: string) => {
    setV((prev) => {
      const set = new Set(prev.services);
      set.has(code) ? set.delete(code) : set.add(code);
      return { ...prev, services: Array.from(set) };
    });
  };

  const toggleFlag = (flag: string) => {
    setV((prev) => {
      const set = new Set(prev.status_flags);
      set.has(flag) ? set.delete(flag) : set.add(flag);
      return { ...prev, status_flags: Array.from(set) };
    });
  };

  const setSign = (code: string, val: string) =>
    setV((prev) => ({ ...prev, signs: { ...prev.signs, [code]: val } }));

  const filteredServices = services.filter((s) =>
    (s.name + s.code).toLowerCase().includes(serviceSearch.toLowerCase())
  );

  const timeColor =
    seconds > timeLimitSec * 0.5
      ? "text-green-600"
      : seconds > timeLimitSec * 0.2
      ? "text-orange-500"
      : "text-red-600 animate-pulse";

  return (
    <div className="bg-slate-200 dark:bg-slate-900 rounded shadow border border-slate-300 dark:border-slate-700">
      {/* ======= Верхняя панель ======= */}
      <div className="bg-slate-800 text-white px-4 py-2 flex items-center justify-between rounded-t">
        <div className="flex items-center gap-4">
          <span className="font-bold text-orange-400">Происшествие 112</span>
          <span className="text-xs opacity-70">
            Оператор · Москва · {new Date().toLocaleDateString("ru-RU")}
          </span>
          <span className="text-xs opacity-50">
            Ctrl+S — сохранить · Esc — отмена
          </span>
        </div>
        <div className={`text-2xl font-mono font-bold ${timeColor}`}>
          {String(Math.floor(seconds / 60)).padStart(2, "0")}:
          {String(seconds % 60).padStart(2, "0")}
        </div>
      </div>

      {/* ======= Основная область ======= */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-2 p-2">
        {/* ===== Левая колонка ===== */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-800 rounded p-3 space-y-2">
          <div className="font-semibold text-slate-700 dark:text-slate-200 border-b pb-1">
            Данные заявителя
          </div>

          <Field label="Фамилия">
            <input
              className="card-input"
              value={v.surname}
              onChange={(e) => up("surname", e.target.value)}
            />
          </Field>

          <Field label="Адрес">
            <input
              className="card-input"
              value={v.address}
              onChange={(e) => up("address", e.target.value)}
            />
          </Field>

          <div className="grid grid-cols-2 gap-2">
            <Field label="Субъект">
              <select
                className="card-input"
                value={v.okrug}
                onChange={(e) => up("okrug", e.target.value)}
              >
                <option value="cao">Москва</option>
                {okrugs.map((o) => (
                  <option key={o.code} value={o.code}>
                    {o.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Район">
              <input
                className="card-input"
                value={v.district}
                onChange={(e) => up("district", e.target.value)}
              />
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <Field label="Улица">
              <input
                className="card-input"
                value={v.street}
                onChange={(e) => up("street", e.target.value)}
              />
            </Field>
            <Field label="Дом">
              <input
                className="card-input"
                value={v.house}
                onChange={(e) => up("house", e.target.value)}
              />
            </Field>
          </div>

          <div className="pt-2 border-t">
            <div className="text-xs text-slate-500 dark:text-slate-400 mb-1">
              Кнопки состояний
            </div>
            <div className="flex flex-wrap gap-1">
              {[
                "Повторные",
                "Нет доступа",
                "Нет контакта",
                "Заблокировано",
                "Срочно",
              ].map((f) => (
                <button
                  key={f}
                  type="button"
                  onClick={() => toggleFlag(f)}
                  className={`text-xs px-2 py-1 rounded border ${
                    v.status_flags.includes(f)
                      ? "bg-red-600 text-white border-red-700"
                      : "bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 border-slate-300 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-600"
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* ===== Центральная колонка: признаки ===== */}
        <div className="lg:col-span-1 bg-white dark:bg-slate-800 rounded p-3 space-y-2">
          <div className="font-semibold text-slate-700 dark:text-slate-200 border-b pb-1">
            Признаки
          </div>
          {signs.map((s, i) => (
            <Field key={s.code} label={`${s.name}${i < 5 ? ` (Ctrl+${i + 1})` : ""}`}>
              <select
                className="card-input"
                value={v.signs[s.code] || ""}
                onChange={(e) => setSign(s.code, e.target.value)}
              >
                <option value="">—</option>
                {s.options.map((o) => (
                  <option key={o}>{o}</option>
                ))}
              </select>
            </Field>
          ))}
        </div>

        {/* ===== Правая колонка ===== */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-800 rounded p-3 space-y-2 flex flex-col">
          <div className="font-semibold text-slate-700 dark:text-slate-200 border-b pb-1">
            Что случилось?
          </div>
          <select
            className="card-input"
            value={v.incident_type}
            onChange={(e) => up("incident_type", e.target.value)}
          >
            {incidentTypes.map((t) => (
              <option key={t.code} value={t.code}>
                {t.code}. {t.name}
              </option>
            ))}
          </select>

          <Field label="Комментарий оператора (текст ответа)">
            <textarea
              className="card-input"
              rows={5}
              value={v.text}
              onChange={(e) => up("text", e.target.value)}
              placeholder="Опишите действия оператора… (Ctrl+Enter — сохранить)"
            />
          </Field>
        </div>
      </div>

      {/* ======= Службы ======= */}
      <div className="px-2 pb-2">
        <div className="bg-white dark:bg-slate-800 rounded p-3">
          <div className="font-semibold text-slate-700 dark:text-slate-200 border-b pb-1 mb-2">
            Направляемые службы
          </div>
          <input
            className="card-input mb-2"
            placeholder="Поиск службы…"
            value={serviceSearch}
            onChange={(e) => setServiceSearch(e.target.value)}
          />
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-1 max-h-48 overflow-y-auto">
            {filteredServices.map((s) => (
              <label
                key={s.code}
                className={`text-xs p-1 rounded border cursor-pointer flex items-center gap-1 ${
                  v.services.includes(s.code)
                    ? "bg-blue-100 dark:bg-blue-900 border-blue-400"
                    : "bg-white dark:bg-slate-700 border-slate-200 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-600"
                }`}
              >
                <input
                  type="checkbox"
                  checked={v.services.includes(s.code)}
                  onChange={() => toggleService(s.code)}
                />
                <span className="dark:text-slate-200">
                  {s.code}. {s.name}
                </span>
              </label>
            ))}
          </div>
          <div className="text-xs text-slate-500 dark:text-slate-400 mt-2">
            Выбрано: {v.services.length}
          </div>
        </div>
      </div>

      {/* ======= Нижние кнопки ======= */}
      <div className="bg-slate-800 rounded-b px-4 py-2 flex justify-between items-center">
        <div className="text-white text-xs opacity-70">
          Лимит: {timeLimitSec} сек
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 bg-slate-600 text-white rounded hover:bg-slate-700"
          >
            Отмена (Esc)
          </button>
          <button
            type="button"
            onClick={() => onSave(v)}
            className="px-4 py-2 bg-orange-500 text-white rounded hover:bg-orange-600"
          >
            Сохранить (Ctrl+S)
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <div className="text-xs text-slate-500 dark:text-slate-400 mb-0.5">
        {label}
      </div>
      {children}
    </label>
  );
}