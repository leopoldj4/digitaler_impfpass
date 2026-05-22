import { KpiCards } from "@/components/dashboard/KpiCards";
import { VaccinationChart } from "@/components/dashboard/VaccinationChart";
import { StatusDonutChart } from "@/components/dashboard/StatusDonutChart";
import { ActivityFeed } from "@/components/dashboard/ActivityFeed";
import { TopBar } from "@/components/layout/TopBar";

export default function DashboardPage() {
  return (
    <>
      <TopBar crumbs={[{ label: "Übersicht" }]} />
      <main className="flex-1 space-y-6 p-6">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Willkommen zurück, Dr. Meier</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Hier ist ein Überblick über Ihre Praxisaktivitäten.
          </p>
        </div>
        <KpiCards />
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
          <div className="lg:col-span-3">
            <VaccinationChart />
          </div>
          <div className="lg:col-span-2">
            <StatusDonutChart />
          </div>
        </div>
        <ActivityFeed />
      </main>
    </>
  );
}
