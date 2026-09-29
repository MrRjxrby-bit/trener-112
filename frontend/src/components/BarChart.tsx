type Bar = { label: string; value: number };

export default function BarChart({
  data,
  max = 100,
  color = "#2563eb",
}: {
  data: Bar[];
  max?: number;
  color?: string;
}) {
  if (data.length === 0) {
    return (
      <div className="text-xs text-slate-500 text-center py-6">
        Нет данных
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {data.map((b, i) => {
        const percent = Math.min(100, (b.value / max) * 100);
        const autoColor =
          b.value >= 70 ? "#16a34a" : b.value >= 50 ? "#f59e0b" : "#dc2626";
        return (
          <div key={i}>
            <div className="flex justify-between text-xs text-slate-600 mb-0.5">
              <span>{b.label}</span>
              <span className="font-medium">{b.value}</span>
            </div>
            <div className="w-full bg-slate-200 h-2 rounded">
              <div
                className="h-2 rounded transition-all"
                style={{
                  width: `${percent}%`,
                  backgroundColor: color === "auto" ? autoColor : color,
                }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}