"use client";

import { motion } from "framer-motion";
import { ShieldCheck, Upload, LogIn, FileEdit } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { MOCK_ACTIVITY } from "@/lib/mock-data";
import { formatRelativeTime, getInitials } from "@/lib/utils";

const iconMap: Record<string, { Icon: typeof ShieldCheck; color: string }> = {
  VERIFY: { Icon: ShieldCheck, color: "text-emerald-600" },
  UPLOAD: { Icon: Upload, color: "text-blue-600" },
  IMPORT: { Icon: LogIn, color: "text-purple-600" },
  UPDATE: { Icon: FileEdit, color: "text-amber-600" },
};

export function ActivityFeed() {
  return (
    <Card className="border-border shadow-none rounded-2xl">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold">Aktivitäten</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <ul>
          {MOCK_ACTIVITY.map((item, i) => {
            const cfg = iconMap[item.action] ?? iconMap.UPDATE;
            const Icon = cfg.Icon;
            const byParts = item.by.split(" ");
            const initials = byParts.length >= 2
              ? getInitials(byParts[0], byParts[byParts.length - 1])
              : item.by.slice(0, 2).toUpperCase();

            return (
              <motion.li
                key={item.id}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.25, delay: i * 0.04 }}
                className="flex items-start gap-3 px-5 py-3 hover:bg-muted/30 transition-colors"
              >
                <Avatar className="h-8 w-8 shrink-0 mt-0.5">
                  <AvatarFallback className="text-[10px] bg-muted">{initials}</AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <Icon className={`h-3.5 w-3.5 shrink-0 ${cfg.color}`} />
                    <span className="text-sm font-medium">{item.patient}</span>
                    <span className="text-sm text-muted-foreground">·</span>
                    <span className="text-sm text-muted-foreground">{item.detail}</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">{item.by}</p>
                </div>
                <span className="shrink-0 text-xs text-muted-foreground/60">
                  {formatRelativeTime(item.at)}
                </span>
              </motion.li>
            );
          })}
        </ul>
      </CardContent>
    </Card>
  );
}
