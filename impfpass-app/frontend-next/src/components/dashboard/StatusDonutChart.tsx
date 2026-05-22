"use client";

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MOCK_STATUS_DATA } from "@/lib/mock-data";

export function StatusDonutChart() {
  const total = MOCK_STATUS_DATA.reduce((s, d) => s + d.value, 0);

  return (
    <Card className="border-border shadow-none rounded-2xl">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold">Signaturstatus</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="relative">
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie
                data={MOCK_STATUS_DATA}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={90}
                paddingAngle={3}
                dataKey="value"
              >
                {MOCK_STATUS_DATA.map((entry) => (
                  <Cell key={entry.name} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  background: "white",
                  border: "1px solid #e2e8f0",
                  borderRadius: "12px",
                  fontSize: 12,
                }}
              />
            </PieChart>
          </ResponsiveContainer>
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-2xl font-bold">{total.toLocaleString("de-DE")}</span>
            <span className="text-xs text-muted-foreground">Gesamt</span>
          </div>
        </div>
        <div className="mt-2 flex justify-center gap-4">
          {MOCK_STATUS_DATA.map((d) => (
            <div key={d.name} className="flex items-center gap-1.5">
              <div className="h-2.5 w-2.5 rounded-full" style={{ background: d.color }} />
              <span className="text-xs text-muted-foreground">{d.name}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
