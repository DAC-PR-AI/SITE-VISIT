import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { queryOptions } from "@tanstack/react-query";
import { listBookings, listProjects, listUnits } from "@/lib/sheets.functions";
import { deptColors } from "@/lib/departments";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { CalendarClock, Users, Building2, TrendingUp, Plus, ArrowRight } from "lucide-react";
import { TimelineView } from "@/components/timeline-view";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Dashboard — Visitly Site Visit Booking" },
      { name: "description", content: "Overview of today's site visits, project availability, and booking activity." },
      { property: "og:title", content: "Dashboard — Visitly" },
      { property: "og:description", content: "Overview of today's site visits, project availability, and booking activity." },
    ],
  }),
  loader: ({ context }) => {
    context.queryClient.ensureQueryData(bookingsQO);
    context.queryClient.ensureQueryData(projectsQO);
    context.queryClient.ensureQueryData(unitsQO);
  },
  component: Dashboard,
});

const bookingsQO = queryOptions({ queryKey: ["bookings"], queryFn: () => listBookings() });
const projectsQO = queryOptions({ queryKey: ["projects"], queryFn: () => listProjects() });
const unitsQO = queryOptions({ queryKey: ["units"], queryFn: () => listUnits() });

function todayISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function Dashboard() {
  const bookings = useSuspenseQuery(bookingsQO).data;
  const projects = useSuspenseQuery(projectsQO).data;
  const units = useSuspenseQuery(unitsQO).data;

  const today = todayISO();
  const todays = bookings.filter((b) => b.VisitDate === today);
  const upcoming = bookings.filter((b) => b.VisitDate >= today).length;
  const uniqueEmployees = new Set(bookings.map((b) => b.EmployeeName)).size;

  const perDept = bookings.reduce<Record<string, number>>((acc, b) => {
    const k = b.Department || "Other";
    acc[k] = (acc[k] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <div className="mx-auto max-w-[1400px] px-6 py-8 md:py-10 space-y-8">
      {/* Header */}
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
            {new Date().toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })}
          </p>
          <h1 className="mt-1 font-display text-3xl font-bold tracking-tight md:text-4xl">
            Site Visit Command Center
          </h1>
          <p className="mt-1 text-muted-foreground">
            {projects.length} projects · {units.length} units · synced live from Google Sheets
          </p>
        </div>
        <Button asChild size="lg">
          <Link to="/new">
            <Plus className="mr-1 size-4" />
            New Booking
          </Link>
        </Button>
      </header>

      {/* KPIs */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard icon={CalendarClock} label="Today's Visits" value={todays.length} accent="bg-blue-500" />
        <KpiCard icon={TrendingUp} label="Upcoming" value={upcoming} accent="bg-emerald-500" />
        <KpiCard icon={Building2} label="Active Projects" value={projects.length} accent="bg-orange-500" />
        <KpiCard icon={Users} label="Employees Booking" value={uniqueEmployees} accent="bg-purple-500" />
      </div>

      {/* Timeline preview */}
      <section className="space-y-3">
        <div className="flex items-end justify-between">
          <div>
            <h2 className="font-display text-xl font-semibold">Today's Timeline</h2>
            <p className="text-sm text-muted-foreground">All visits scheduled for today across every project</p>
          </div>
          <Button asChild variant="ghost" size="sm">
            <Link to="/timeline">
              Full timeline
              <ArrowRight className="ml-1 size-4" />
            </Link>
          </Button>
        </div>
        <TimelineView bookings={bookings} projectNames={projects.map((p) => p.ProjectName)} date={today} />
      </section>

      {/* Split: Department breakdown + Recent */}
      <section className="grid gap-6 lg:grid-cols-3">
        <Card className="p-6 lg:col-span-1">
          <h3 className="font-display text-lg font-semibold">By Department</h3>
          <p className="text-sm text-muted-foreground mb-4">All-time bookings distribution</p>
          <div className="space-y-3">
            {Object.entries(perDept)
              .sort((a, b) => b[1] - a[1])
              .map(([dept, count]) => {
                const c = deptColors(dept);
                const max = Math.max(...Object.values(perDept), 1);
                return (
                  <div key={dept}>
                    <div className="flex items-center justify-between text-sm">
                      <span className="flex items-center gap-2">
                        <span className={`size-2.5 rounded-full ${c.solid}`} />
                        {dept}
                      </span>
                      <span className="font-mono text-xs text-muted-foreground">{count}</span>
                    </div>
                    <div className="mt-1 h-1.5 rounded-full bg-slate-100 overflow-hidden">
                      <div className={`h-full ${c.solid}`} style={{ width: `${(count / max) * 100}%` }} />
                    </div>
                  </div>
                );
              })}
            {Object.keys(perDept).length === 0 && (
              <p className="text-sm text-muted-foreground">No bookings yet.</p>
            )}
          </div>
        </Card>

        <Card className="p-6 lg:col-span-2">
          <h3 className="font-display text-lg font-semibold">Recent Bookings</h3>
          <p className="text-sm text-muted-foreground mb-4">Latest activity across all projects</p>
          <div className="divide-y divide-border">
            {bookings
              .slice()
              .sort((a, b) => (a.CreatedAt < b.CreatedAt ? 1 : -1))
              .slice(0, 6)
              .map((b) => {
                const c = deptColors(b.Department);
                return (
                  <div key={b.BookingID} className="flex items-center gap-3 py-3">
                    <span className={`h-8 w-1 rounded-full ${c.solid}`} />
                    <div className="min-w-0 flex-1">
                      <p className="font-medium truncate">
                        {b.CustomerName} · {b.ProjectName} <span className="text-muted-foreground">/ {b.UnitNumber}</span>
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {b.VisitDate} · {b.StartTime}–{b.EndTime} · {b.EmployeeName}
                      </p>
                    </div>
                    <span className={`rounded-md px-2 py-0.5 text-[10px] uppercase tracking-wider font-mono ${c.bg} ${c.text}`}>
                      {b.Department}
                    </span>
                  </div>
                );
              })}
            {bookings.length === 0 && (
              <p className="py-6 text-center text-sm text-muted-foreground">
                No bookings yet. Create your first visit from the New Booking page.
              </p>
            )}
          </div>
        </Card>
      </section>
    </div>
  );
}

function KpiCard({ icon: Icon, label, value, accent }: { icon: typeof CalendarClock; label: string; value: number; accent: string }) {
  return (
    <Card className="relative overflow-hidden p-5">
      <div className={`absolute inset-x-0 top-0 h-1 ${accent}`} />
      <div className="flex items-center gap-3">
        <div className={`grid size-10 place-items-center rounded-xl ${accent} text-white shadow-sm`}>
          <Icon className="size-5" />
        </div>
        <div>
          <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">{label}</p>
          <p className="font-display text-3xl font-bold leading-tight">{value}</p>
        </div>
      </div>
    </Card>
  );
}
