"use client";

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { MovieSummary } from "@/types/movie";

interface RatingsChartProps {
  movies: MovieSummary[];
}

const COLORS: Record<string, string> = {
  "Watched": "#22c55e",
  "Anticipated": "#f59e0b",
  "Discover": "#3b82f6",
};

export function RatingsChart({ movies }: RatingsChartProps) {
  const watchedCount = movies.filter((m) => m.source === "watched-list").length;
  const anticipatedCount = movies.filter(
    (m) => m.source === "anticipated"
  ).length;
  const discoverCount = movies.filter((m) => m.source === "discover").length;
  const total = movies.length;

  const data = [
    { name: "Watched", value: watchedCount },
    { name: "Anticipated", value: anticipatedCount },
    { name: "Discover", value: discoverCount },
  ].filter((d) => d.value > 0);

  if (data.length === 0) return null;

  return (
    <ResponsiveContainer width="100%" height={200}>
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          innerRadius={55}
          outerRadius={80}
          paddingAngle={3}
          dataKey="value"
          stroke="none"
        >
          {data.map((entry) => (
            <Cell key={entry.name} fill={COLORS[entry.name]} />
          ))}
        </Pie>
        <Tooltip
          contentStyle={{
            backgroundColor: "hsl(var(--card))",
            border: "1px solid hsl(var(--border))",
            borderRadius: "8px",
            fontSize: "12px",
          }}
        />
        {/* Center label */}
        <text
          x="50%"
          y="46%"
          textAnchor="middle"
          dominantBaseline="central"
          className="fill-foreground text-2xl font-bold"
        >
          {total}
        </text>
        <text
          x="50%"
          y="58%"
          textAnchor="middle"
          dominantBaseline="central"
          className="fill-muted-foreground text-xs"
        >
          movies
        </text>
      </PieChart>
    </ResponsiveContainer>
  );
}
