"use client";

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";

export interface DonutSegment {
  name: string;
  value: number;
  color: string;
}

interface DonutChartProps {
  data: DonutSegment[];
  centerLabel?: string;
  centerValue?: string | number;
  height?: number;
  innerRadius?: number;
  outerRadius?: number;
}

interface TooltipPayloadItem {
  name?: string;
  value?: number | string;
  payload?: DonutSegment;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: TooltipPayloadItem[];
}

function CustomTooltip({ active, payload }: CustomTooltipProps) {
  if (!active || !payload || payload.length === 0) return null;
  const item = payload[0];
  return (
    <div className="rounded-xl border border-border bg-popover/95 backdrop-blur px-3 py-2 text-xs card-shadow">
      <div className="flex items-center gap-2">
        <span
          className="w-2 h-2 rounded-full shrink-0"
          style={{ background: item.payload?.color }}
        />
        <span className="text-muted-foreground">{item.name}:</span>
        <span className="font-semibold text-foreground tabular-nums">{item.value}</span>
      </div>
    </div>
  );
}

export function DonutChart({
  data,
  centerLabel,
  centerValue,
  height = 240,
  innerRadius = 60,
  outerRadius = 90,
}: DonutChartProps) {
  const total = data.reduce((sum, d) => sum + d.value, 0);
  const filteredData = total === 0 ? [{ name: "No data", value: 1, color: "var(--muted)" }] : data;

  return (
    <div className="relative" style={{ width: "100%", height }}>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={filteredData}
            dataKey="value"
            nameKey="name"
            cx="50%"
            cy="50%"
            innerRadius={innerRadius}
            outerRadius={outerRadius}
            paddingAngle={total === 0 ? 0 : 2}
            cornerRadius={4}
            stroke="var(--card)"
            strokeWidth={2}
          >
            {filteredData.map((entry, i) => (
              <Cell key={i} fill={entry.color} />
            ))}
          </Pie>
          {total > 0 && <Tooltip content={<CustomTooltip />} />}
        </PieChart>
      </ResponsiveContainer>
      {(centerValue !== undefined || centerLabel) && (
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          {centerValue !== undefined && (
            <div className="text-3xl font-bold tracking-tight tabular-nums text-foreground">
              {centerValue}
            </div>
          )}
          {centerLabel && (
            <div className="text-xs text-muted-foreground font-medium mt-0.5">{centerLabel}</div>
          )}
        </div>
      )}
    </div>
  );
}
