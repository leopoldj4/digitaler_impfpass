"use client";

import { useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { Copy, Check } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface QRCodeSectionProps {
  patientId: number;
}

export function QRCodeSection({ patientId }: QRCodeSectionProps) {
  const [copied, setCopied] = useState(false);
  const verifyUrl = `https://impfpass.demo/verify?pid=${patientId}&t=${Date.now()}`;

  function copyLink() {
    navigator.clipboard.writeText(verifyUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <Card className="border-border shadow-none rounded-2xl">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold">QR-Code zur Verifizierung</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col items-center gap-4">
        <div className="flex h-[180px] w-[180px] items-center justify-center rounded-xl border border-border bg-white p-4 shadow-sm">
          <QRCodeSVG
            value={verifyUrl}
            size={148}
            fgColor="#0F172A"
            bgColor="transparent"
            level="M"
          />
        </div>
        <div className="w-full space-y-2">
          <p className="text-center text-xs text-muted-foreground">
            QR-Code scannen zur digitalen Verifikation
          </p>
          <Button
            variant="outline"
            size="sm"
            className="w-full gap-1.5"
            onClick={copyLink}
          >
            {copied ? (
              <>
                <Check className="h-3.5 w-3.5 text-emerald-600" />
                Kopiert!
              </>
            ) : (
              <>
                <Copy className="h-3.5 w-3.5" />
                Verifikations-Link kopieren
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
