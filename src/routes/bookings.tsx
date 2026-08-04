import { createFileRoute } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { listBookings, listDepartments, listProjects } from "@/lib/sheets.functions";
import { deptColors } from "@/lib/departments";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Search, Download } from "lucide-react";
import { BookingDetailDialog } from "@/components/booking-detail-dialog";
import { normalizeVisitStatus, type Booking } from "@/lib/booking-types";
import * as XLSX from "xlsx";

const bookingsQO = queryOptions({
  queryKey: ["bookings"],
  queryFn: () => listBookings(),
  staleTime: 60_000,
  gcTime: 10 * 60_000,
  refetchOnWindowFocus: false,
  refetchOnReconnect: false,
});
const projectsQO = queryOptions({
  queryKey: ["projects"],
  queryFn: () => listProjects(),
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

export const Route = createFileRoute("/bookings")({
  head: () => ({
    meta: [
      { title: "All Bookings — Visitly" },
      { name: "description", content: "Search, filter, and export every site visit booking." },
      { property: "og:title", content: "All Bookings — Visitly" },
      { property: "og:description", content: "Search, filter, and export every site visit booking." },
    ],
  }),
  loader: ({ context }) => {
    context.queryClient.ensureQueryData(bookingsQO);
    context.queryClient.ensureQueryData(projectsQO);
    context.queryClient.ensureQueryData(departmentsQO);
  },
  component: BookingsPage,
});

function BookingsPage() {
  const bookings = useSuspenseQuery(bookingsQO).data;
  const projects = useSuspenseQuery(projectsQO).data;
  const departments = useSuspenseQuery(departmentsQO).data;
  const [q, setQ] = useState("");
  const [dept, setDept] = useState<string>("all");
  const [project, setProject] = useState<string>("all");
  const [date, setDate] = useState("");
  const [employee, setEmployee] = useState<string>("all");
  const [customer, setCustomer] = useState("");
  const [selected, setSelected] = useState<Booking | null>(null);

  const employeeOptions = useMemo(
    () => Array.from(new Set(bookings.map((b) => b.EmployeeName).filter(Boolean))).sort(),
    [bookings],
  );

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    return bookings.filter((b) => {
      if (dept !== "all" && (b.Department || "").toLowerCase() !== dept.toLowerCase()) return false;
      if (project !== "all" && b.ProjectName !== project) return false;
      if (date && b.VisitDate !== date) return false;
      if (employee !== "all" && (b.EmployeeName || "").toLowerCase() !== employee.toLowerCase()) return false;
      if (customer.trim()) {
        const customerTerm = customer.trim().toLowerCase();
        const hay = `${b.CustomerName} ${b.MobileNumber}`.toLowerCase();
        if (!hay.includes(customerTerm)) return false;
      }
      if (term) {
        const hay = `${b.CustomerName} ${b.EmployeeName} ${b.MobileNumber} ${b.ProjectName} ${b.UnitNumber} ${b.BookingID} ${b.Purpose}`.toLowerCase();
        if (!hay.includes(term)) return false;
      }
      return true;
    });
  }, [bookings, q, dept, project, date, employee, customer]);

  const exportXlsx = () => {
    const rows = filtered.map((b) => ({
      "Booking ID": b.BookingID,
      Employee: b.EmployeeName,
      Department: b.Department,
      Customer: b.CustomerName,
      Mobile: b.MobileNumber,
      Project: b.ProjectName,
      Unit: b.UnitNumber,
      Date: b.VisitDate,
      Start: b.StartTime,
      End: b.EndTime,
      Purpose: b.Purpose,
      Remarks: b.Remarks,
      "Status": normalizeVisitStatus(b.VisitStatus) === "Unknown" ? "" : normalizeVisitStatus(b.VisitStatus),
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Bookings");
    XLSX.writeFile(wb, `visitly-bookings-${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  return (
    <div className="mx-auto max-w-[1400px] px-6 py-8 md:py-10 space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">Ledger</p>
          <h1 className="mt-1 font-display text-3xl font-bold tracking-tight">All Bookings</h1>
          <p className="mt-1 text-muted-foreground">{filtered.length} of {bookings.length} bookings</p>
        </div>
        <Button variant="outline" onClick={exportXlsx}>
          <Download className="mr-1 size-4" />
          Export XLSX
        </Button>
      </header>

      <Card className="p-4">
        <div className="grid gap-3 md:grid-cols-[1fr_180px_180px_180px_180px_auto]">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search customer, mobile, employee, unit…"
              className="pl-9"
            />
          </div>
          <Select value={dept} onValueChange={setDept}>
            <SelectTrigger><SelectValue placeholder="Department" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All departments</SelectItem>
              {departments.map((d) => (<SelectItem key={d} value={d}>{d}</SelectItem>))}
            </SelectContent>
          </Select>
          <Select value={project} onValueChange={setProject}>
            <SelectTrigger><SelectValue placeholder="Project" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All projects</SelectItem>
              {projects.map((p) => (<SelectItem key={p.ProjectID || p.ProjectName} value={p.ProjectName}>{p.ProjectName}</SelectItem>))}
            </SelectContent>
          </Select>
          <Select value={employee} onValueChange={setEmployee}>
            <SelectTrigger><SelectValue placeholder="Employee" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All employees</SelectItem>
              {employeeOptions.map((name) => (<SelectItem key={name} value={name}>{name}</SelectItem>))}
            </SelectContent>
          </Select>
          <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          <Input value={customer} onChange={(e) => setCustomer(e.target.value)} placeholder="Customer name" />
        </div>
        <div className="mt-3 flex justify-end">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => {
              setQ("");
              setDept("all");
              setProject("all");
              setDate("");
              setEmployee("all");
              setCustomer("");
            }}
          >
            Clear filters
          </Button>
        </div>
      </Card>

      <Card className="overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date · Time</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>Project / Unit</TableHead>
              <TableHead>Employee</TableHead>
              <TableHead>Department</TableHead>
              <TableHead>Purpose</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((b) => {
              const c = deptColors(b.Department);
              return (
                <TableRow key={b.BookingID} className="cursor-pointer" onClick={() => setSelected(b)}>
                  <TableCell className="font-mono text-xs whitespace-nowrap">
                    <div>{b.VisitDate}</div>
                    <div className="text-muted-foreground">{b.StartTime}–{b.EndTime}</div>
                  </TableCell>
                  <TableCell>
                    <div className="font-medium">{b.CustomerName}</div>
                    <div className="text-xs text-muted-foreground">{b.MobileNumber}</div>
                  </TableCell>
                  <TableCell>
                    <div className="font-medium">{b.ProjectName}</div>
                    <div className="text-xs text-muted-foreground">Unit {b.UnitNumber}</div>
                  </TableCell>
                  <TableCell className="text-sm">{b.EmployeeName}</TableCell>
                  <TableCell>
                    <span className={`rounded-md px-2 py-0.5 text-[10px] uppercase tracking-wider font-mono ${c.bg} ${c.text}`}>
                      {b.Department || "Other"}
                    </span>
                  </TableCell>
                  <TableCell className="max-w-[240px] truncate text-sm text-muted-foreground">{b.Purpose}</TableCell>
                </TableRow>
              );
            })}
            {filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="py-10 text-center text-sm text-muted-foreground">
                  No bookings match these filters.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>

      <BookingDetailDialog booking={selected} onOpenChange={(o) => !o && setSelected(null)} />
    </div>
  );
}