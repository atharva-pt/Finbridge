"use client";

import { LineChart, Line, ResponsiveContainer, YAxis } from "recharts";

interface SparklineProps {
  data: number[];
  color: string;
  height?: number;
}

export function Sparkline({ data, color, height = 32 }: SparklineProps) {
  const chartData = data.map((value, i) => ({ x: i, y: value }));

  return (
    <div style={{ width: "100%", height }} className="pointer-events-none">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData} margin={{ top: 2, right: 0, left: 0, bottom: 2 }}>
          <YAxis hide domain={["dataMin", "dataMax"]} />
          <Line
            type="monotone"
            dataKey="y"
            stroke={color}
            strokeWidth={2}
            dot={false}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
