type Point = { label: string; value: number };

export default function LineChart({
  data,
  height = 180,
  max = 100,
  color = "#2563eb",
}: {
  data: Point[];
  height?: number;
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

  const width = Math.max(300, data.length * 40);
  const padding = { top: 20, right: 20, bottom: 30, left: 30 };
  const innerW = width - padding.left - padding.right;
  const innerH = height - padding.top - padding.bottom;

  const points = data.map((d, i) => {
    const x = padding.left + (i / Math.max(1, data.length - 1)) * innerW;
    const y = padding.top + innerH - (Math.min(d.value, max) / max) * innerH;
    return { x, y, ...d };
  });

  const polyline = points.map((p) => `${p.x},${p.y}`).join(" ");

  return (
    <div className="overflow-x-auto">
      <svg width={width} height={height} className="bg-slate-50 rounded">
        {[0, 25, 50, 75, 100].map((v) => {
          const y = padding.top + innerH - (v / max) * innerH;
          return (
            <g key={v}>
              <line
                x1={padding.left}
                x2={width - padding.right}
                y1={y}
                y2={y}
                stroke="#e2e8f0"
                strokeWidth={1}
              />
              <text
                x={padding.left - 6}
                y={y + 3}
                fontSize={10}
                fill="#94a3b8"
                textAnchor="end"
              >
                {v}
              </text>
            </g>
          );
        })}

        <polyline points={polyline} fill="none" stroke={color} strokeWidth={2} />

        {points.map((p, i) => (
          <g key={i}>
            <circle cx={p.x} cy={p.y} r={3} fill={color} />
            <text
              x={p.x}
              y={height - 10}
              fontSize={9}
              fill="#64748b"
              textAnchor="middle"
            >
              {p.label}
            </text>
          </g>
        ))}
      </svg>
    </div>
  );
}