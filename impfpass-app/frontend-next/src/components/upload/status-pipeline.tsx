"use client";

import { motion } from "framer-motion";
import { CheckCircle2, Circle, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export type UploadStatus =
  | "idle"
  | "uploading"
  | "ocr"
  | "ai"
  | "extracted"
  | "review"
  | "saved";

const steps: { key: UploadStatus; label: string; description: string }[] = [
  { key: "uploading", label: "Hochgeladen", description: "Datei wird übertragen" },
  { key: "ocr", label: "OCR läuft", description: "Text wird erkannt" },
  { key: "ai", label: "KI analysiert", description: "Daten werden extrahiert" },
  { key: "extracted", label: "Extrahiert", description: "Struktur erkannt" },
  { key: "review", label: "Prüfung", description: "Ihre Bestätigung" },
  { key: "saved", label: "Gespeichert", description: "Erfolgreich abgeschlossen" },
];

const ORDER: UploadStatus[] = ["idle", "uploading", "ocr", "ai", "extracted", "review", "saved"];

function stepIndex(status: UploadStatus) {
  return ORDER.indexOf(status);
}

interface StatusPipelineProps {
  status: UploadStatus;
}

export function StatusPipeline({ status }: StatusPipelineProps) {
  const current = stepIndex(status);

  return (
    <div className="w-full px-2">
      <div className="flex items-start justify-between gap-1">
        {steps.map((step, i) => {
          const stepIdx = i + 1; // +1 because ORDER[0] = idle
          const done = current > stepIdx;
          const active = current === stepIdx;

          return (
            <div key={step.key} className="flex flex-1 flex-col items-center gap-1.5">
              {/* Connector line + icon */}
              <div className="flex w-full items-center">
                {i > 0 && (
                  <div
                    className={cn(
                      "h-0.5 flex-1 transition-colors duration-500",
                      done || active ? "bg-primary" : "bg-border",
                    )}
                  />
                )}
                <motion.div
                  initial={{ scale: 0.8 }}
                  animate={{ scale: active ? [1, 1.15, 1] : 1 }}
                  transition={{ repeat: active ? Infinity : 0, duration: 1.5, ease: "easeInOut" as const }}
                >
                  {done ? (
                    <CheckCircle2 className="h-5 w-5 text-primary" />
                  ) : active ? (
                    <Loader2 className="h-5 w-5 animate-spin text-primary" />
                  ) : (
                    <Circle className="h-5 w-5 text-muted-foreground/40" />
                  )}
                </motion.div>
                {i < steps.length - 1 && (
                  <div
                    className={cn(
                      "h-0.5 flex-1 transition-colors duration-500",
                      done ? "bg-primary" : "bg-border",
                    )}
                  />
                )}
              </div>

              {/* Label */}
              <div className="flex flex-col items-center gap-0.5 text-center">
                <span
                  className={cn(
                    "text-[10px] font-semibold leading-tight",
                    done || active ? "text-primary" : "text-muted-foreground/60",
                  )}
                >
                  {step.label}
                </span>
                <span className="hidden text-[9px] leading-tight text-muted-foreground sm:block">
                  {step.description}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
