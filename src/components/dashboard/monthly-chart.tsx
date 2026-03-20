"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { MovieSummary } from "@/types/movie";

interface MonthlyChartProps {
  movies: MovieSummary[];
}

const MONTH_NAMES = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

export function MonthlyChart({ movies }: MonthlyChartProps) {
  const monthly = MONTH_NAMES.map((month) => ({
    month,
    watched: 0,
    anticipated: 0,
    other: 0,
  }));

  for (const movie of movies) {
    if (!movie.releaseDate || !movie.releaseDate.startsWith("2026-")) continue;
    const monthIndex = parseInt(movie.releaseDate.slice(5, 7), 10) - 1;
    if (monthIndex < 0 || monthIndex > 11) continue;

    if (movie.watched || movie.source === "watched-list") {
      monthly[monthIndex].watched++;
    } else if (movie.source === "anticipated" || movie.anticipated) {
      monthly[monthIndex].anticipated++;
    } else {
      monthly[monthIndex].other++;
    }
  }

  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart
        data={monthly}
        margin={{ top: 0, right: 8, bottom: 0, left: -16 }}
      >
        <XAxis dataKey="month" fontSize={12} tickLine={false} />
        <YAxis allowDecimals={false} fontSize={12} />
        <Tooltip
          contentStyle={{
            backgroundColor: "hsl(var(--card))",
            border: "1px solid hsl(var(--border))",
            borderRadius: "8px",
            fontSize: "12px",
          }}
        />
        <Legend iconSize={10} wrapperStyle={{ fontSize: "12px" }} />
        <Bar
          dataKey="watched"
          stackId="a"
          fill="#22c55e"
          name="Watched"
          radius={[0, 0, 0, 0]}
        />
        <Bar
          dataKey="anticipated"
          stackId="a"
          fill="#f59e0b"
          name="Anticipated"
          radius={[0, 0, 0, 0]}
        />
        <Bar
          dataKey="other"
          stackId="a"
          fill="#94a3b8"
          name="Discover"
          radius={[4, 4, 0, 0]}
        />
      </BarChart>
    </ResponsiveContainer>
  );
}
