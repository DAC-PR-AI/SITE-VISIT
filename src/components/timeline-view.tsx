import { useMemo, useState } from "react";
import type { Booking } from "@/lib/booking-types";
import { toMinutes } from "@/lib/booking-types";
import { deptColors, DEPARTMENTS } from "@/lib/departments";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ChevronLeft, ChevronRight, CalendarDays } from "lucide-react";
import { BookingDetailDialog } from "./booking-detail-dialog";

const START_HOUR = 8;
const END_HOUR = 20;
const HOURS = Array.from({ length: END_HOUR - START_HOUR + 1 }, (_, i) => START_HOUR + i);

function todayISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function shiftDate(iso: string, days: number): string {
  const d = new Date(iso + "T00:00:00");
  d.setDate(d.getDate() + days);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function formatDay(iso: string): string {
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short", year: "numeric" });
}

export function TimelineView({
  bookings,
  projectNames,
  date: initialDate,
}: {
  bookings: Booking[];
  projectNames: string[];
  date?: string;
}) {
  const [date, setDate] = useState(initialDate || todayISO());
  const [selected, setSelected] = useState<Booking | null>(null);

  const dayBookings = useMemo(() => bookings.filter((b) => b.VisitDate === date), [bookings, date]);

  const rows = useMemo(() => {
    const projects = projectNames.length ? projectNames : Array.from(new Set(bookings.map((b) => b.ProjectName))).filter(Boolean);
    return projects;
  }, [projectNames, bookings]);

  const totalMinutes = (END_HOUR - START_HOUR) * 60;

  return (
    <div className="rounded-2xl border border-border bg-white shadow-sm overflow-hidden">
      {/* Controls */}
      <div className="flex flex-wrap items-center gap-3 border-b border-border bg-slate-50/50 px-4 py-3">
        <div className="flex items-center gap-1">
          <Button size="sm" variant="outline" onClick={() => setDate(shiftDate(date, -1))}>
            <ChevronLeft className="size-4" />
          </Button>
          <Button size="sm" variant="outline" onClick={() => setDate(todayISO())}>
            Today
          </Button>
          <Button size="sm" variant="outline" onClick={() => setDate(shiftDate(date, 1))}>
            <ChevronRight className="size-4" />
          </Button>
        </div>

        <div className="flex items-center gap-2 rounded-md border border-border bg-white px-2 py-1">
          <CalendarDays className="size-4 text-muted-foreground" />
          <Input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="h-6 w-36 border-none p-0 shadow-none focus-visible:ring-0"
          />
        </div>

        <p className="ml-auto font-display font-semibold">{formatDay(date)}</p>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-3 border-b border-border px-4 py-3">
        {DEPARTMENTS.map((d) => {
          const c = deptColors(d);
          return (
            <div key={d} className="flex items-center gap-1.5 text-xs">
              <span className={`size-2.5 rounded-full ${c.solid}`} />
              <span className="text-muted-foreground">{d}</span>
            </div>
          );
        })}
      </div>

      {/* Grid */}
      <div className="overflow-x-auto">
        <div className="min-w-[900px]">
          {/* Hour rail */}
          <div className="flex border-b border-border">
            <div className="w-40 shrink-0 border-r border-border px-4 py-2 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
              Project
            </div>
            <div className="flex flex-1">
              {HOURS.map((h) => (
                <div
                  key={h}
                  className="flex-1 border-r border-border/50 py-2 text-center font-mono text-[10px] text-muted-foreground last:border-r-0"
                >
                  {String(h).padStart(2, "0")}:00
                </div>
              ))}
            </div>
          </div>

          {rows.length === 0 && (
            <div className="p-12 text-center text-sm text-muted-foreground">
              No projects yet. Add some to your Google Sheet's Projects tab.
            </div>
          )}

          {rows.map((project, idx) => {
            const items = dayBookings.filter((b) => b.ProjectName === project);
            return (
              <div key={project} className={`flex border-b border-border ${idx % 2 ? "bg-slate-50/30" : ""}`}>
                <div className="w-40 shrink-0 border-r border-border px-4 py-4 text-sm font-medium truncate">
                  {project}
                </div>
                <div className="relative flex-1 h-20">
                  {/* grid lines */}
                  <div className="absolute inset-0 flex pointer-events-none">
                    {HOURS.map((h) => (
                      <div key={h} className="flex-1 border-r border-border/30 last:border-r-0" />
                    ))}
                  </div>
                  {items.map((b) => {
                    const start = toMinutes(b.StartTime) - START_HOUR * 60;
                    const end = toMinutes(b.EndTime) - START_HOUR * 60;
                    const left = Math.max(0, (start / totalMinutes) * 100);
                    const width = Math.max(2, ((Math.min(end, totalMinutes) - Math.max(start, 0)) / totalMinutes) * 100);
                    const c = deptColors(b.Department);
                    return (
                      <button
                        key={b.BookingID}
                        onClick={() => setSelected(b)}
                        style={{ left: `${left}%`, width: `${width}%` }}
                        className={`absolute top-3 h-14 rounded-lg border-l-4 ${c.border} ${c.bg} px-2 py-1.5 text-left shadow-sm transition-transform hover:-translate-y-0.5 hover:shadow-md overflow-hidden`}
                      >
                        <p className={`text-[10px] font-bold ${c.text} truncate`}>
                          {b.CustomerName || b.EmployeeName}
                        </p>
                        <p className="text-[9px] text-slate-600 truncate">
                          {b.StartTime}–{b.EndTime} · {b.Department}
                        </p>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <p className="border-t border-border px-4 py-2 text-[11px] text-muted-foreground">
        Click any block to see full details
      </p>

      <BookingDetailDialog booking={selected} onOpenChange={(o) => !o && setSelected(null)} />
    </div>
  );
}