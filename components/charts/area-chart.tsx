"use client";

import {
  AreaChart as RechartsAreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

export interface AreaChartSeries {
  key: string;
  label: string;
  color: string;
}

interface AreaChartProps {
  data: Array<Record<string, string | number>>;
  series: AreaChartSeries[];
  xKey: string;
  height?: number;
  showLegend?: boolean;
  yTickFormatter?: (value: number) => string;
}

interface TooltipPayloadItem {
  name?: string;
  value?: number | string;
  color?: string;
  dataKey?: string;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: TooltipPayloadItem[];
  label?: string | number;
}

function CustomTooltip({ active, payload, label }: CustomTooltipProps) {
  if (!active || !payload || payload.length === 0) return null;
  return (
    <div className="rounded-xl border border-border bg-popover/95 backdrop-blur px-3 py-2 text-xs card-shadow">
      <div className="font-semibold text-foreground mb-1.5">{label}</div>
      {payload.map((entry, i) => (
        <div key={i} className="flex items-center gap-2 py-0.5">
          <span
            className="w-2 h-2 rounded-full shrink-0"
            style={{ background: entry.color }}
          />
          <span className="text-muted-foreground capitalize">{entry.name}:</span>
          <span className="font-semibold text-foreground tabular-nums">
            {typeof entry.value === "number" ? entry.value.toLocaleString() : entry.value}
          </span>
        </div>
      ))}
    </div>
  );
}

export function AreaChart({
  data,
  series,
  xKey,
  height = 280,
  showLegend = true,
  yTickFormatter,
}: AreaChartProps) {
  return (
    <div style={{ width: "100%", height }}>
      <ResponsiveContainer width="100%" height="100%">
        <RechartsAreaChart data={data} margin={{ top: 8, right: 12, left: -12, bottom: 0 }}>
          <defs>
            {series.map((s) => (
              <linearGradient key={s.key} id={`gradient-${s.key}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={s.color} stopOpacity={0.35} />
                <stop offset="95%" stopColor={s.color} stopOpacity={0} />
              </linearGradient>
            ))}
          </defs>
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="var(--border)"
            strokeOpacity={0.5}
            vertical={false}
          />
          <XAxis
            dataKey={xKey}
            stroke="var(--muted-foreground)"
            fontSize={11}
            tickLine={false}
            axisLine={false}
            tickMargin={8}
          />
          <YAxis
            stroke="var(--muted-foreground)"
            fontSize={11}
            tickLine={false}
            axisLine={false}
            tickFormatter={yTickFormatter}
            width={42}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ stroke: "var(--border)", strokeWidth: 1 }} />
          {showLegend && (
            <Legend
              verticalAlign="top"
              align="right"
              iconType="circle"
              iconSize={8}
              wrapperStyle={{ fontSize: 12, paddingBottom: 8 }}
              formatter={(value) => (
                <span className="text-muted-foreground capitalize ml-1">{value}</span>
              )}
            />
          )}
          {series.map((s) => (
            <Area
              key={s.key}
              type="monotone"
              dataKey={s.key}
              name={s.label}
              stroke={s.color}
              strokeWidth={2}
              fillOpacity={1}
              fill={`url(#gradient-${s.key})`}
              activeDot={{ r: 4, strokeWidth: 2, stroke: "var(--background)" }}
            />
          ))}
        </RechartsAreaChart>
      </ResponsiveContainer>
    </div>
  );
}
