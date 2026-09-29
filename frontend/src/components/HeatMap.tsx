type Column = { key: string; label: string };
type Row = {
  scenario_id: number;
  title: string;
  attempts: number;
  values: Record<string, number>;
};

function cellColor(percent: number): string {
  // 0% → зелёный, 50% → жёлтый, 100% → красный
  const p = Math.min(100, Math.max(0, percent));
  const hue = (1 - p / 100) * 120; // 120 = зелёный, 0 = красный
  return `hsl(${hue}, 75%, 55%)`;
}

function textColor(percent: number): string {
  // на тёмных клетках текст белый, на светлых — тёмный
  return percent > 45 ? "#ffffff" : "#0f172a";
}

export default function Heatmap({
  columns,
  rows,
}: {
  columns: Column[];
  rows: Row[];
}) {
  if (!columns.length || !rows.length) {
    return (
      <div className="text-xs text-slate-500 text-center py-6">
        Нет данных для тепловой карты
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr>
            <th className="text-left p-2 border-b bg-slate-50">Сценарий</th>
            <th className="text-center p-2 border-b bg-slate-50 w-20">Попыток</th>
            {columns.map((c) => (
              <th
                key={c.key}
                className="text-center p-2 border-b bg-slate-50 min-w-[110px]"
              >
                {c.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.scenario_id}>
              <td className="p-2 border-b">
                <div className="font-medium">{r.title}</div>
                <div className="text-xs text-slate-500">
                  ID #{r.scenario_id}
                </div>
              </td>
              <td className="p-2 border-b text-center text-slate-600">
                {r.attempts}
              </td>
              {columns.map((c) => {
                const v = r.values[c.key] ?? 0;
                return (
                  <td
                    key={c.key}
                    className="p-2 border-b text-center font-semibold"
                    style={{
                      backgroundColor: cellColor(v),
                      color: textColor(v),
                    }}
                    title={`${c.label}: ${v}% ошибок`}
                  >
                    {v}%
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>

      <div className="flex items-center gap-3 text-xs text-slate-600 mt-3">
        <span>0% ошибок</span>
        <div
          className="h-3 flex-1 rounded"
          style={{
            background:
              "linear-gradient(to right, hsl(120,75%,55%), hsl(60,75%,55%), hsl(0,75%,55%))",
          }}
        />
        <span>100% ошибок</span>
      </div>
    </div>
  );
}