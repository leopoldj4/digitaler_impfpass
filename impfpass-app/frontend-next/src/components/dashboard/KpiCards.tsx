"use client";

import { motion } from "framer-motion";
import { Users, ShieldCheck, AlertTriangle, FileText } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { MOCK_DASHBOARD_STATS } from "@/lib/mock-data";

const cards = [
  {
    label: "Patienten",
    value: MOCK_DASHBOARD_STATS.totalPatients,
    icon: Users,
    color: "text-blue-600",
    bg: "bg-blue-50",
    suffix: "",
  },
  {
    label: "Signiert diesen Monat",
    value: MOCK_DASHBOARD_STATS.verifiedThisMonth,
    icon: ShieldCheck,
    color: "text-emerald-600",
    bg: "bg-emerald-50",
    suffix: "",
  },
  {
    label: "Review ausstehend",
    value: MOCK_DASHBOARD_STATS.pendingReview,
    icon: AlertTriangle,
    color: "text-amber-600",
    bg: "bg-amber-50",
    suffix: "",
  },
  {
    label: "Dokumente verarbeitet",
    value: MOCK_DASHBOARD_STATS.documentsProcessed,
    icon: FileText,
    color: "text-purple-600",
    bg: "bg-purple-50",
    suffix: "",
  },
];

export function KpiCards() {
  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      {cards.map((card, i) => (
        <motion.div
          key={card.label}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: i * 0.07 }}
        >
          <Card className="border-border shadow-none hover:shadow-sm transition-shadow rounded-2xl">
            <CardContent className="p-5">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    {card.label}
                  </p>
                  <p className="mt-2 text-3xl font-bold tracking-tight text-foreground">
                    {card.value.toLocaleString("de-DE")}
                    {card.suffix}
                  </p>
                </div>
                <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${card.bg}`}>
                  <card.icon className={`h-5 w-5 ${card.color}`} />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      ))}
    </div>
  );
}
