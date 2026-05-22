import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ConvexClientProvider } from "./ConvexClientProvider";
import { Providers } from "@/components/layout/Providers";
import { AppShell } from "@/components/layout/AppShell";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

export const metadata: Metadata = {
  title: "DigitalImpfpass — Praxissoftware",
  description: "Digitale Verwaltung und E-Signatur von Impfausweisen",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="de" className={`${inter.variable} h-full antialiased`} suppressHydrationWarning>
      <body className="h-full">
        <ConvexClientProvider>
          <Providers>
            <AppShell>{children}</AppShell>
          </Providers>
        </ConvexClientProvider>
      </body>
    </html>
  );
}
