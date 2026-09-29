import { useEffect, useState } from "react";
import { api } from "../api/client";

export default function Help() {
  const [types, setTypes] = useState<{ code: string; name: string; category: string }[]>([]);

  useEffect(() => {
    api.get("/api/dictionaries/types").then((r) => setTypes(r.data)).catch(() => {});
  }, []);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold">Справочная база</h1>

      <section className="bg-white rounded shadow p-4 space-y-2">
        <h2 className="font-semibold text-lg">Как работать на АРМ-112</h2>
        <ol className="list-decimal pl-6 text-sm space-y-1">
          <li>Принять входящий вызов кнопкой «Ответить».</li>
          <li>Выслушать заявителя (транскрипт отображается сверху карточки).</li>
          <li>Заполнить поля заявителя: фамилия, адрес, субъект, район, улица, дом.</li>
          <li>Указать признаки происшествия (пламя, дым, доступ, угроза, правонарушение).</li>
          <li>Выбрать тип происшествия в поле «Что случилось?».</li>
          <li>Отметить службы, которые нужно направить.</li>
          <li>Заполнить комментарий оператора.</li>
          <li>Нажать «Сохранить» — система сформирует отчёт с разбором.</li>
        </ol>
      </section>

      <section className="bg-white rounded shadow p-4 space-y-2">
        <h2 className="font-semibold text-lg">Правила тайминга</h2>
        <ul className="list-disc pl-6 text-sm space-y-1">
          <li>Приём вызова — до 10 секунд.</li>
          <li>Уточнение адреса — до 15 секунд.</li>
          <li>Уточнение обстоятельств — до 20 секунд.</li>
          <li>Направление служб — до 15 секунд.</li>
        </ul>
      </section>

      <section className="bg-white rounded shadow p-4 space-y-2">
        <h2 className="font-semibold text-lg">
          Классификатор происшествий ({types.length})
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-1 text-sm">
          {types.map((t) => (
            <div key={t.code} className="border-b py-1 flex gap-2">
              <span className="text-slate-500 w-12 shrink-0">{t.code}</span>
              <span>{t.name}</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}