import { useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import type { Booking, VisitStatusValue } from "@/lib/booking-types";
import { normalizeVisitStatus, toMinutes } from "@/lib/booking-types";
import { DEPARTMENTS, deptColors, normalizeDepartmentName } from "@/lib/departments";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ChevronLeft, ChevronRight, CalendarDays } from "lucide-react";
import { toast } from "sonner";
import { BookingDetailDialog } from "./booking-detail-dialog";
import { updateBookingStatus } from "@/lib/sheets.functions";

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
  departments,
  date: initialDate,
  onVisitStatusChange,
}: {
  bookings: Booking[];
  projectNames: string[];
  departments?: string[];
  date?: string;
  onVisitStatusChange?: (bookingId: string, status: "Yes" | "No" | "Unknown") => void;
}) {
  const [date, setDate] = useState(initialDate || todayISO());
  const [selected, setSelected] = useState<Booking | null>(null);
  const [promptBookingId, setPromptBookingId] = useState<string | null>(null);
  const [statusByBookingId, setStatusByBookingId] = useState<Record<string, "Yes" | "No" | "Unknown">>({});
  const queryClient = useQueryClient();
  const saveStatus = useServerFn(updateBookingStatus);
  const statusMutation = useMutation({
    mutationFn: async ({ bookingId, status }: { bookingId: string; status: VisitStatusValue }) =>
      saveStatus({ bookingId, status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bookings"] });
    },
    onError: (error: Error) => toast.error(error.message || "Unable to save booking status."),
  });

  const dayBookings = useMemo(() => bookings.filter((b) => b.VisitDate === date), [bookings, date]);

  const rows = useMemo(() => {
    const projects = projectNames.length ? projectNames : Array.from(new Set(bookings.map((b) => b.ProjectName))).filter(Boolean);
    return projects;
  }, [projectNames, bookings]);

  const legendDepartments = useMemo(() => {
    const fromSheet = (departments ?? [])
      .map(normalizeDepartmentName)
      .filter((d): d is string => Boolean(d));
    const fromBookings = Array.from(
      new Set(bookings.map((b) => normalizeDepartmentName(b.Department)).filter((d): d is string => Boolean(d))),
    );

    const visible = Array.from(new Set([...fromSheet, ...fromBookings])).filter((d) => d !== "Other");
    return visible.length ? visible : [...DEPARTMENTS];
  }, [departments, bookings]);

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
        {legendDepartments.map((d) => {
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
                    const departmentLabel = normalizeDepartmentName(b.Department);
                    const c = deptColors(departmentLabel);
                    const status = normalizeVisitStatus(statusByBookingId[b.BookingID] ?? b.VisitStatus);
                    const statusClasses =
                      status === "Yes"
                        ? "border-emerald-500 bg-emerald-50 text-emerald-700 hover:border-emerald-600 hover:bg-emerald-100 hover:text-emerald-800"
                        : status === "No"
                          ? "border-rose-500 bg-rose-50 text-rose-700 hover:border-rose-600 hover:bg-rose-100 hover:text-rose-800"
                          : `${c.border} ${c.bg}`;
                    const title = `Visit status: ${status === "Unknown" ? "Not set" : status}`;
                    const showPrompt = promptBookingId === b.BookingID;
                    return (
                      <div
                        key={b.BookingID}
                        className="absolute top-3"
                        style={{ left: `${left}%`, width: `${width}%` }}
                        onMouseEnter={() => setPromptBookingId(b.BookingID)}
                        onMouseLeave={() => setPromptBookingId((current) => (current === b.BookingID ? null : current))}
                      >
                        <button
                          onClick={() => setSelected(b)}
                          title={title}
                          className={`flex h-14 w-full rounded-lg border-l-4 ${statusClasses} px-2 py-1.5 text-left shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md overflow-hidden`}
                        >
                          <div className="min-w-0 flex-1">
                            <p className={`text-[10px] font-bold ${status === "Unknown" ? c.text : "text-inherit"} truncate`}>
                              {b.CustomerName || b.EmployeeName}
                            </p>
                            <p className="text-[9px] text-slate-700 truncate">
                              {b.StartTime}–{b.EndTime} · {departmentLabel || "Other"}
                            </p>
                          </div>
                        </button>

                        {showPrompt && (
                          <div className="absolute left-0 top-[-4.7rem] z-20 w-48 rounded-xl border border-slate-200 bg-white p-3 shadow-lg">
                            <p className="text-[11px] font-semibold text-slate-900">Visit status confirmation</p>
                            <p className="mt-1 text-[10px] text-slate-600">Choose the visit result for this slot.</p>
                            <div className="mt-2 flex gap-2">
                              <Button
                                type="button"
                                size="sm"
                                className="flex-1 bg-emerald-600 text-white hover:bg-emerald-700"
                                onClick={(event) => {
                                  event.stopPropagation();
                                  const status: VisitStatusValue = "Yes";
                                  setStatusByBookingId((current) => ({ ...current, [b.BookingID]: status }));
                                  onVisitStatusChange?.(b.BookingID, status);
                                  statusMutation.mutate({ bookingId: b.BookingID, status });
                                  setPromptBookingId(null);
                                }}
                              >
                                Yes
                              </Button>
                              <Button
                                type="button"
                                size="sm"
                                variant="destructive"
                                className="flex-1"
                                onClick={(event) => {
                                  event.stopPropagation();
                                  const status: VisitStatusValue = "No";
                                  setStatusByBookingId((current) => ({ ...current, [b.BookingID]: status }));
                                  onVisitStatusChange?.(b.BookingID, status);
                                  statusMutation.mutate({ bookingId: b.BookingID, status });
                                  setPromptBookingId(null);
                                }}
                              >
                                No
                              </Button>
                            </div>
                          </div>
                        )}
                      </div>
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