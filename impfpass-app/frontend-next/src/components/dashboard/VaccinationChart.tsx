"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MOCK_MONTHLY_DATA } from "@/lib/mock-data";

export function VaccinationChart() {
  return (
    <Card className="border-border shadow-none rounded-2xl">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold">Impfungen pro Monat</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={MOCK_MONTHLY_DATA} barGap={4}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
            <XAxis
              dataKey="month"
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 12, fill: "#64748b" }}
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 12, fill: "#64748b" }}
              width={30}
            />
            <Tooltip
              contentStyle={{
                background: "white",
                border: "1px solid #e2e8f0",
                borderRadius: "12px",
                boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.05)",
                fontSize: 12,
              }}
              cursor={{ fill: "#f8fafc" }}
            />
            <Bar dataKey="vaccinations" name="Gesamt" fill="#2563EB" radius={[6, 6, 0, 0]} />
            <Bar dataKey="verified" name="Signiert" fill="#14B8A6" radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
