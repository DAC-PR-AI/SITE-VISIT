import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { queryOptions, useMutation, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useState, useEffect } from "react";
import { z } from "zod";
import { createBooking, listBookings, listDepartments, listProjects, listPurposes, listUnits, updateBooking } from "@/lib/sheets.functions";
import { deptColors } from "@/lib/departments";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { CheckCircle2, AlertTriangle } from "lucide-react";
import { overlaps, toMinutes } from "@/lib/booking-types";
import { AdminCodeDialog, getStoredAdminCode } from "@/components/admin-code-dialog";

const searchSchema = z.object({ edit: z.string().optional() });

const bookingsQO = queryOptions({
  queryKey: ["bookings"],
  queryFn: () => listBookings(),
  staleTime: 60_000,
  gcTime: 10 * 60_000,
  refetchOnWindowFocus: false,
  refetchOnReconnect: false,
  refetchInterval: 5000,
});
const projectsQO = queryOptions({
  queryKey: ["projects"],
  queryFn: () => listProjects(),
  staleTime: 60_000,
  gcTime: 10 * 60_000,
  refetchOnWindowFocus: false,
  refetchOnReconnect: false,
});
const unitsQO = queryOptions({
  queryKey: ["units"],
  queryFn: () => listUnits(),
  staleTime: 60_000,
  gcTime: 10 * 60_000,
  refetchOnWindowFocus: false,
  refetchOnReconnect: false,
});
const departmentsQO = queryOptions({
  queryKey: ["departments"],
  queryFn: () => listDepartments(),
  staleTime: 60_000,
  gcTime: 10 * 60_000,
  refetchOnWindowFocus: false,
  refetchOnReconnect: false,
});
const purposesQO = queryOptions({
  queryKey: ["purposes"],
  queryFn: () => listPurposes(),
  staleTime: 30_000,
  gcTime: 10 * 60_000,
  refetchOnWindowFocus: false,
  refetchOnReconnect: false,
  refetchInterval: 15000,
});

export const Route = createFileRoute("/new")({
  head: () => ({
    meta: [
      { title: "SITE VISIT-TRACKER" },
      { name: "description", content: "Book a customer site visit with automatic conflict checking." },
      { property: "og:title", content: "SITE VISIT-TRACKER" },
      { property: "og:description", content: "Book a customer site visit with automatic conflict checking." },
    ],
  }),
  validateSearch: (s) => searchSchema.parse(s),
  loader: ({ context }) => {
    context.queryClient.ensureQueryData(projectsQO);
    context.queryClient.ensureQueryData(unitsQO);
    context.queryClient.ensureQueryData(bookingsQO);
    context.queryClient.ensureQueryData(departmentsQO);
    context.queryClient.ensureQueryData(purposesQO);
  },
  component: NewBookingPage,
});

// Granularity of the time pickers, in seconds. 60 = one-minute steps, so any
// start and end time is accepted and a visit can be any length at all.
const TIME_STEP_SECONDS = 60;
// Only used when there is no usable duration to carry over yet.
const FALLBACK_VISIT_MINUTES = 60;
const HHMM = /^\d{2}:\d{2}$/;

/** Shifts an HH:mm string by the given number of minutes, clamped to the day. */
function addMinutes(hhmm: string, minutes: number): string {
  if (!HHMM.test(hhmm)) return hhmm;
  const [h, m] = hhmm.split(":").map(Number);
  const total = Math.min(23 * 60 + 59, Math.max(0, h * 60 + m + minutes));
  return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
}

/** "1 hr 30 min" for a valid forward range, otherwise null. */
function formatDuration(start: string, end: string): string | null {
  if (!HHMM.test(start) || !HHMM.test(end)) return null;
  const mins = toMinutes(end) - toMinutes(start);
  if (mins <= 0) return null;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return [h ? `${h} hr` : null, m ? `${m} min` : null].filter(Boolean).join(" ");
}

const formSchema = z
  .object({
    EmployeeName: z.string().trim().min(2, "Employee name required").max(80),
    Department: z.string().min(1, "Department required"),
    CustomerName: z.string().trim().min(2, "Customer name required").max(80),
    MobileNumber: z.string().trim().regex(/^\+?\d[\d\s-]{7,14}$/, "Enter a valid phone number"),
    ProjectName: z.string().min(1, "Project required"),
    UnitNumber: z.string().min(1, "Unit required"),
    VisitDate: z.string().min(1, "Date required"),
    StartTime: z.string().regex(/^\d{2}:\d{2}$/, "From time required"),
    EndTime: z.string().regex(/^\d{2}:\d{2}$/, "To time required"),
    Purpose: z.string().trim().max(200).default(""),
    Remarks: z.string().trim().max(500).default(""),
  })
  .refine((d) => d.StartTime < d.EndTime, { message: "End time must be after start time", path: ["EndTime"] });

function todayISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

type FormState = z.input<typeof formSchema>;

function normalizeValue(value?: string | null) {
  return (value ?? "").trim().toLowerCase();
}

function NewBookingPage() {
  const { edit } = Route.useSearch();
  const navigate = useNavigate();
  const projects = useSuspenseQuery(projectsQO).data;
  const units = useSuspenseQuery(unitsQO).data;
  const bookings = useSuspenseQuery(bookingsQO).data;
  const departments = useSuspenseQuery(departmentsQO).data;
  const purposes = useSuspenseQuery(purposesQO).data;
  const qc = useQueryClient();

  const editing = useMemo(() => bookings.find((b) => b.BookingID === edit) || null, [bookings, edit]);

  const [form, setForm] = useState<FormState>({
    EmployeeName: "",
    Department: "",
    CustomerName: "",
    MobileNumber: "",
    ProjectName: "",
    UnitNumber: "",
    VisitDate: todayISO(),
    StartTime: "10:00",
    EndTime: "11:00",
    Purpose: "",
    Remarks: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [gateOpen, setGateOpen] = useState(false);
  const [pending, setPending] = useState<FormState | null>(null);

  useEffect(() => {
    if (editing) {
      setForm({
        EmployeeName: editing.EmployeeName,
        Department: editing.Department,
        CustomerName: editing.CustomerName,
        MobileNumber: editing.MobileNumber,
        ProjectName: editing.ProjectName,
        UnitNumber: editing.UnitNumber,
        VisitDate: editing.VisitDate,
        StartTime: editing.StartTime,
        EndTime: editing.EndTime,
        Purpose: editing.Purpose,
        Remarks: editing.Remarks,
      });
    }
  }, [editing]);

  const projectByName = useMemo(
    () => new Map(projects.map((p) => [p.ProjectName, p.ProjectID])),
    [projects],
  );
  const selectedProjectId = projectByName.get(form.ProjectName);
  const projectUnits = useMemo(() => {
    if (!form.ProjectName) return [];

    const candidates = [selectedProjectId, form.ProjectName]
      .filter(Boolean)
      .map((value) => normalizeValue(value));

    const fromUnits = units.filter((u) => candidates.includes(normalizeValue(u.ProjectID)));
    const fromBookings = bookings
      .filter((booking) => booking.ProjectName === form.ProjectName && booking.UnitNumber)
      .map((booking) => ({
        ProjectID: booking.ProjectName,
        UnitNumber: booking.UnitNumber,
        Availability: "Booked",
      }));

    const merged = [...fromUnits, ...fromBookings];
    const seen = new Set<string>();
    return merged.filter((unit) => {
      const key = normalizeValue(unit.UnitNumber);
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [bookings, form.ProjectName, selectedProjectId, units]);

  const create = useServerFn(createBooking);
  const update = useServerFn(updateBooking);

  // Live time-conflict check against existing bookings for the same unit/date.
  const conflict = useMemo(() => {
    if (!form.ProjectName || !form.UnitNumber || !form.VisitDate || !form.StartTime || !form.EndTime)
      return null;
    if (form.StartTime >= form.EndTime) return null;
    return (
      bookings.find(
        (b) =>
          b.BookingID !== editing?.BookingID &&
          b.ProjectName === form.ProjectName &&
          b.UnitNumber === form.UnitNumber &&
          b.VisitDate === form.VisitDate &&
          overlaps(form.StartTime, form.EndTime, b.StartTime, b.EndTime),
      ) ?? null
    );
  }, [bookings, form, editing]);

  const mut = useMutation({
    mutationFn: async ({ data, adminCode }: { data: FormState; adminCode: string }) => {
      const payload = {
        EmployeeName: data.EmployeeName,
        Department: data.Department,
        CustomerName: data.CustomerName,
        MobileNumber: data.MobileNumber,
        ProjectName: data.ProjectName,
        UnitNumber: data.UnitNumber,
        VisitDate: data.VisitDate,
        StartTime: data.StartTime,
        EndTime: data.EndTime,
        Purpose: data.Purpose ?? "",
        Remarks: data.Remarks ?? "",
      };
      if (editing && editing._row) {
        return update({ data: { ...payload, BookingID: editing.BookingID, _row: editing._row, adminCode } });
      }
      return create({ data: payload });
    },
    onSuccess: () => {
      toast.success(editing ? "Booking updated" : "Booking confirmed");
      qc.invalidateQueries({ queryKey: ["bookings"] });
      navigate({ to: "/bookings" });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = formSchema.safeParse(form);
    if (!parsed.success) {
      const errs: Record<string, string> = {};
      for (const issue of parsed.error.issues) errs[issue.path.join(".")] = issue.message;
      setErrors(errs);
      return;
    }
    setErrors({});
    if (conflict) {
      toast.error(
        `Time conflict: ${conflict.ProjectName} · Unit ${conflict.UnitNumber} is booked ${conflict.StartTime}–${conflict.EndTime}.`,
      );
      return;
    }
    if (editing) {
      const stored = getStoredAdminCode();
      if (!stored) {
        setPending(parsed.data);
        setGateOpen(true);
        return;
      }
      mut.mutate({ data: parsed.data, adminCode: stored });
      return;
    }
    mut.mutate({ data: parsed.data, adminCode: "" });
  };

  const set = <K extends keyof FormState>(k: K, v: FormState[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  // Moving the start time carries the end time along with it, keeping whatever
  // duration is already set — 20 minutes, 3 hours, anything. The end time stays
  // freely editable afterwards, so the duration is never forced to a fixed size.
  const setStartTime = (value: string) => {
    setForm((f) => {
      if (!HHMM.test(value)) return { ...f, StartTime: value };
      const prevStart = HHMM.test(f.StartTime) ? toMinutes(f.StartTime) : null;
      const prevEnd = HHMM.test(f.EndTime) ? toMinutes(f.EndTime) : null;
      const heldMinutes =
        prevStart !== null && prevEnd !== null && prevEnd > prevStart
          ? prevEnd - prevStart
          : FALLBACK_VISIT_MINUTES;
      return { ...f, StartTime: value, EndTime: addMinutes(value, heldMinutes) };
    });
  };

  const duration = formatDuration(form.StartTime, form.EndTime);

  const c = deptColors(form.Department);

  return (
    <div className="mx-auto max-w-4xl px-6 py-8 md:py-10">
      <header className="mb-6">
        <p className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
          {editing ? "Editing" : "New Entry"}
        </p>
        <h1 className="mt-1 font-display text-3xl font-bold tracking-tight">
          {editing ? `Edit ${editing.BookingID}` : "Book a Site Visit"}
        </h1>
        <p className="mt-1 text-muted-foreground">
          Fill in the details below. Time conflicts on the same unit are blocked automatically.
        </p>
      </header>

      <form onSubmit={onSubmit}>
        <Card className="overflow-hidden">
          <div className={`h-1 w-full ${form.Department ? c.solid : "bg-slate-200"}`} />
          <div className="p-6 grid gap-5 md:grid-cols-2">
            <Field label="Employee Name" error={errors.EmployeeName}>
              <Input value={form.EmployeeName} onChange={(e) => set("EmployeeName", e.target.value)} placeholder="e.g. Priya Sharma" />
            </Field>

            <Field label="Department" error={errors.Department}>
              <Select value={form.Department} onValueChange={(v) => set("Department", v)}>
                <SelectTrigger><SelectValue placeholder="Select department" /></SelectTrigger>
                <SelectContent>
                  {departments.map((d) => {
                    const dc = deptColors(d);
                    return (
                      <SelectItem key={d} value={d}>
                        <span className="flex items-center gap-2">
                          <span className={`size-2 rounded-full ${dc.solid}`} />
                          {d}
                        </span>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </Field>

            <Field label="Customer Name" error={errors.CustomerName}>
              <Input value={form.CustomerName} onChange={(e) => set("CustomerName", e.target.value)} placeholder="e.g. Rahul Mehta" />
            </Field>

            <Field label="Mobile Number" error={errors.MobileNumber}>
              <Input value={form.MobileNumber} onChange={(e) => set("MobileNumber", e.target.value)} placeholder="+91 98765 43210" />
            </Field>

            <Field label="Project" error={errors.ProjectName}>
              <Select value={form.ProjectName} onValueChange={(v) => { set("ProjectName", v); set("UnitNumber", ""); }}>
                <SelectTrigger><SelectValue placeholder="Select project" /></SelectTrigger>
                <SelectContent>
                  {projects.map((p) => (
                    <SelectItem key={p.ProjectID || p.ProjectName} value={p.ProjectName}>{p.ProjectName}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>

            <Field label="Unit Number" error={errors.UnitNumber}>
              <Select value={form.UnitNumber} onValueChange={(v) => set("UnitNumber", v)} disabled={!form.ProjectName}>
                <SelectTrigger><SelectValue placeholder={form.ProjectName ? "Select unit" : "Pick a project first"} /></SelectTrigger>
                <SelectContent>
                  {projectUnits.length === 0 && form.ProjectName && (
                    <div className="px-2 py-1.5 text-xs text-muted-foreground">No units listed for this project.</div>
                  )}
                  {projectUnits.map((u) => (
                    <SelectItem key={u.UnitNumber} value={u.UnitNumber}>
                      {u.UnitNumber}
                      {u.Availability && u.Availability.toLowerCase() !== "available" ? ` · ${u.Availability}` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>

            <div className="grid gap-5 sm:grid-cols-3 md:col-span-2">
              <Field label="Visit Date" error={errors.VisitDate}>
                <Input type="date" value={form.VisitDate} onChange={(e) => set("VisitDate", e.target.value)} min={todayISO()} />
              </Field>

              <Field label="From Time" error={errors.StartTime}>
                <Input
                  type="time"
                  step={TIME_STEP_SECONDS}
                  value={form.StartTime}
                  onChange={(e) => setStartTime(e.target.value)}
                />
              </Field>

              <Field label="To Time" error={errors.EndTime}>
                <Input
                  type="time"
                  step={TIME_STEP_SECONDS}
                  value={form.EndTime}
                  onChange={(e) => set("EndTime", e.target.value)}
                />
                {duration && (
                  <p className="mt-1 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                    {duration}
                  </p>
                )}
              </Field>
            </div>

            <Field label="Purpose" error={errors.Purpose} className="md:col-span-2">
              <Select value={form.Purpose} onValueChange={(v) => set("Purpose", v)}>
                <SelectTrigger><SelectValue placeholder="Select visit purpose" /></SelectTrigger>
                <SelectContent>
                  {purposes.map((p) => (
                    <SelectItem key={p} value={p}>{p}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>

            <Field label="Remarks" error={errors.Remarks} className="md:col-span-2">
              <Textarea rows={3} value={form.Remarks} onChange={(e) => set("Remarks", e.target.value)} placeholder="Any special notes about this visit…" />
            </Field>

            {conflict && (
              <div className="md:col-span-2 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                <AlertTriangle className="mt-0.5 size-4 shrink-0" />
                <span>
                  Time conflict — Unit {conflict.UnitNumber} at {conflict.ProjectName} is already booked{" "}
                  <strong>{conflict.StartTime}–{conflict.EndTime}</strong> by {conflict.EmployeeName} (
                  {conflict.CustomerName}). Pick another slot or unit.
                </span>
              </div>
            )}
          </div>

          <div className="flex items-center justify-between gap-3 border-t border-border bg-slate-50/50 px-6 py-4">
            <p className="text-xs text-muted-foreground">Data is written directly to your Google Sheet.</p>
            <div className="flex gap-2">
              <Button type="button" variant="ghost" onClick={() => navigate({ to: "/bookings" })}>Cancel</Button>
              <Button type="submit" disabled={mut.isPending || !!conflict}>
                <CheckCircle2 className="mr-1 size-4" />
                {mut.isPending ? "Saving…" : editing ? "Save changes" : "Confirm Booking"}
              </Button>
            </div>
          </div>
        </Card>
      </form>

      <AdminCodeDialog
        open={gateOpen}
        action="edit"
        onOpenChange={setGateOpen}
        onVerified={(code) => {
          if (pending) mut.mutate({ data: pending, adminCode: code });
          setPending(null);
        }}
      />
    </div>
  );
}

function Field({
  label,
  error,
  children,
  className,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <Label className="mb-1.5 block font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
        {label}
      </Label>
      {children}
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}