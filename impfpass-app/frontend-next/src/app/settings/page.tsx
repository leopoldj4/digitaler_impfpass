"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Copy, Check, RefreshCw, ShieldCheck, UserPlus, KeyRound } from "lucide-react";
import { TopBar } from "@/components/layout/TopBar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";

const praxisSchema = z.object({
  name: z.string().min(2, "Mindestens 2 Zeichen"),
  street: z.string().min(3),
  city: z.string().min(2),
  zip: z.string().regex(/^\d{5}$/, "5-stellige PLZ"),
  phone: z.string().min(6),
  email: z.string().email("Ungültige E-Mail"),
  doctorName: z.string().min(2),
  landarztId: z.string().optional(),
});

type PraxisForm = z.infer<typeof praxisSchema>;

const MOCK_USERS = [
  { id: 1, name: "Dr. Erika Meier", email: "e.meier@praxis-demo.de", role: "Admin", status: "Aktiv" },
  { id: 2, name: "Sabine Koch", email: "s.koch@praxis-demo.de", role: "Arzthelferin", status: "Aktiv" },
  { id: 3, name: "Dr. Thomas Bauer", email: "t.bauer@praxis-demo.de", role: "Arzt", status: "Aktiv" },
];

const roleColors: Record<string, string> = {
  Admin: "bg-purple-50 text-purple-700 border-purple-200",
  Arzthelferin: "bg-blue-50 text-blue-700 border-blue-200",
  Arzt: "bg-emerald-50 text-emerald-700 border-emerald-200",
};

function PraxisTab() {
  const form = useForm<PraxisForm>({
    resolver: zodResolver(praxisSchema),
    defaultValues: {
      name: "Gemeinschaftspraxis Müller & Meier",
      street: "Hauptstraße 42",
      city: "München",
      zip: "80331",
      phone: "089 12345678",
      email: "praxis@mueller-meier.de",
      doctorName: "Dr. Erika Meier",
      landarztId: "DE-BY-12345",
    },
  });

  function onSubmit(data: PraxisForm) {
    console.log(data);
    toast.success("Praxisdaten gespeichert");
  }

  return (
    <Card className="border-border shadow-none rounded-2xl">
      <CardHeader>
        <CardTitle className="text-base">Praxisdaten</CardTitle>
        <CardDescription>Grundlegende Informationen Ihrer Praxis</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <FormField control={form.control} name="name" render={({ field }) => (
                <FormItem className="sm:col-span-2">
                  <FormLabel>Praxisname</FormLabel>
                  <FormControl><Input {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="street" render={({ field }) => (
                <FormItem className="sm:col-span-2">
                  <FormLabel>Straße & Hausnummer</FormLabel>
                  <FormControl><Input {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="zip" render={({ field }) => (
                <FormItem>
                  <FormLabel>PLZ</FormLabel>
                  <FormControl><Input {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="city" render={({ field }) => (
                <FormItem>
                  <FormLabel>Stadt</FormLabel>
                  <FormControl><Input {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="phone" render={({ field }) => (
                <FormItem>
                  <FormLabel>Telefon</FormLabel>
                  <FormControl><Input {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="email" render={({ field }) => (
                <FormItem>
                  <FormLabel>E-Mail</FormLabel>
                  <FormControl><Input {...field} type="email" /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="doctorName" render={({ field }) => (
                <FormItem>
                  <FormLabel>Leitender Arzt</FormLabel>
                  <FormControl><Input {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="landarztId" render={({ field }) => (
                <FormItem>
                  <FormLabel>Landarzt-ID</FormLabel>
                  <FormControl><Input {...field} placeholder="DE-BY-XXXXX" /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </div>
            <div className="flex justify-end">
              <Button type="submit">Änderungen speichern</Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}

function UsersTab() {
  return (
    <Card className="border-border shadow-none rounded-2xl">
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="text-base">Benutzer & Rollen</CardTitle>
          <CardDescription>Zugriffsberechtigungen verwalten</CardDescription>
        </div>
        <Button size="sm" variant="outline" className="gap-1.5">
          <UserPlus className="h-4 w-4" />
          Einladen
        </Button>
      </CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead>Name</TableHead>
              <TableHead>E-Mail</TableHead>
              <TableHead>Rolle</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {MOCK_USERS.map((user) => (
              <TableRow key={user.id}>
                <TableCell className="font-medium">{user.name}</TableCell>
                <TableCell className="text-muted-foreground">{user.email}</TableCell>
                <TableCell>
                  <Badge variant="outline" className={`text-xs ${roleColors[user.role] ?? ""}`}>
                    {user.role}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className="text-xs bg-emerald-50 text-emerald-700 border-emerald-200">
                    {user.status}
                  </Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

function SecurityTab() {
  return (
    <Card className="border-border shadow-none rounded-2xl">
      <CardHeader>
        <CardTitle className="text-base">Sicherheit</CardTitle>
        <CardDescription>Zwei-Faktor-Authentifizierung und Sicherheitsoptionen</CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        {[
          { label: "Zwei-Faktor-Authentifizierung", desc: "TOTP-App oder SMS", enabled: true },
          { label: "Audit-Logging", desc: "Alle Aktionen protokollieren (DSGVO)", enabled: true },
          { label: "Session-Timeout", desc: "Automatisch abmelden nach 30 Min.", enabled: true },
          { label: "IP-Whitelist", desc: "Nur aus bekannten Netzwerken zulassen", enabled: false },
        ].map((item) => (
          <div key={item.label} className="flex items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-muted-foreground" />
                <Label className="text-sm font-medium">{item.label}</Label>
              </div>
              <p className="ml-6 text-xs text-muted-foreground">{item.desc}</p>
            </div>
            <Switch defaultChecked={item.enabled} />
          </div>
        ))}
        <Separator />
        <div>
          <p className="text-sm font-medium mb-2">Passwort ändern</p>
          <div className="grid gap-3 max-w-sm">
            <Input type="password" placeholder="Aktuelles Passwort" />
            <Input type="password" placeholder="Neues Passwort" />
            <Input type="password" placeholder="Passwort wiederholen" />
            <Button variant="outline" className="w-full" onClick={() => toast.success("Passwort geändert")}>
              Passwort aktualisieren
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function ApiTab() {
  const [key] = useState("sk_prod_••••••••••••••••••••••••••••3f9a");
  const [copied, setCopied] = useState(false);

  function copyKey() {
    navigator.clipboard.writeText("sk_prod_DEMO_KEY_FOR_HACKATHON_3f9a").then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <Card className="border-border shadow-none rounded-2xl">
      <CardHeader>
        <CardTitle className="text-base">API-Einstellungen</CardTitle>
        <CardDescription>Zugriff für externe Dienste und Integrationen</CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <div>
          <Label className="text-sm">API-Schlüssel</Label>
          <div className="mt-2 flex gap-2">
            <div className="flex-1 rounded-lg border border-border bg-muted/30 px-3 py-2 font-mono text-sm text-muted-foreground">
              {key}
            </div>
            <Button variant="outline" size="icon" onClick={copyKey}>
              {copied ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}
            </Button>
            <Button variant="outline" size="icon" onClick={() => toast.info("API-Schlüssel regeneriert")}>
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
          <p className="mt-1.5 text-xs text-muted-foreground">
            Schlüssel nur einmal anzeigbar. Bei Verlust neu generieren.
          </p>
        </div>
        <Separator />
        <div className="space-y-3">
          <Label className="text-sm font-medium">Endpunkte</Label>
          {[
            { method: "POST", path: "/api/v1/import", desc: "Impfpass-Import (OCR-Pipeline)" },
            { method: "GET", path: "/api/v1/patients", desc: "Patientenliste" },
            { method: "PATCH", path: "/api/v1/vaccinations/{id}/verify", desc: "Signatur" },
          ].map((ep) => (
            <div key={ep.path} className="flex items-center gap-3 rounded-lg border border-border px-3 py-2.5">
              <KeyRound className="h-4 w-4 text-muted-foreground shrink-0" />
              <Badge variant="outline" className="text-[10px] font-mono shrink-0">{ep.method}</Badge>
              <code className="text-xs font-mono text-muted-foreground">{ep.path}</code>
              <span className="ml-auto text-xs text-muted-foreground hidden sm:block">{ep.desc}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export default function SettingsPage() {
  return (
    <>
      <TopBar crumbs={[{ label: "Einstellungen" }]} />
      <main className="flex-1 p-6">
        <div className="mb-6">
          <h1 className="text-xl font-semibold">Einstellungen</h1>
          <p className="mt-1 text-sm text-muted-foreground">Praxis- und Systemkonfiguration</p>
        </div>
        <div className="max-w-3xl">
          <Tabs defaultValue="praxis">
            <TabsList className="mb-6">
              <TabsTrigger value="praxis">Praxis</TabsTrigger>
              <TabsTrigger value="users">Benutzer</TabsTrigger>
              <TabsTrigger value="security">Sicherheit</TabsTrigger>
              <TabsTrigger value="api">API</TabsTrigger>
            </TabsList>
            <TabsContent value="praxis"><PraxisTab /></TabsContent>
            <TabsContent value="users"><UsersTab /></TabsContent>
            <TabsContent value="security"><SecurityTab /></TabsContent>
            <TabsContent value="api"><ApiTab /></TabsContent>
          </Tabs>
        </div>
      </main>
    </>
  );
}
