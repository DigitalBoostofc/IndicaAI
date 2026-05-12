"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

interface ClicksChartProps {
  data: { day: string; cliques: number }[];
}

export function ClicksChart({ data }: ClicksChartProps) {
  return (
    <ResponsiveContainer width="100%" height={240}>
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--neutral-200))" />
        <XAxis dataKey="day" stroke="hsl(var(--neutral-500))" fontSize={12} />
        <YAxis stroke="hsl(var(--neutral-500))" fontSize={12} />
        <Tooltip
          contentStyle={{
            backgroundColor: "hsl(var(--background))",
            border: "1px solid hsl(var(--border))",
            borderRadius: "0.375rem",
          }}
        />
        <Bar dataKey="cliques" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
