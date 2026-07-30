import { createServerFn } from "@tanstack/react-start";
import type { Booking, Project, Unit, BookingInput } from "./booking-types";

const BOOKING_COLS = 13; // A..M

function pad(row: string[], n: number): string[] {
  const out = row.slice(0, n);
  while (out.length < n) out.push("");
  return out;
}

function rowsToBookings(rows: string[][]): Booking[] {
  return rows
    .map((r, i) => {
      const p = pad(r, BOOKING_COLS);
      if (!p[0] && !p[1]) return null;
      return {
        BookingID: p[0],
        EmployeeName: p[1],
        Department: p[2],
        CustomerName: p[3],
        MobileNumber: p[4],
        ProjectName: p[5],
        UnitNumber: p[6],
        VisitDate: p[7],
        StartTime: p[8],
        EndTime: p[9],
        Purpose: p[10],
        Remarks: p[11],
        CreatedAt: p[12],
        _row: i + 2, // header is row 1
      } as Booking;
    })
    .filter(Boolean) as Booking[];
}

export const listProjects = createServerFn({ method: "GET" }).handler(async () => {
  const { getRange } = await import("./sheets.server");
  const rows = await getRange("Projects!A2:B");
  return rows
    .filter((r) => r[0] || r[1])
    .map<Project>((r) => ({ ProjectID: r[0] ?? "", ProjectName: r[1] ?? "" }));
});

export const listUnits = createServerFn({ method: "GET" }).handler(async () => {
  const { getRange } = await import("./sheets.server");
  const rows = await getRange("Units!A2:C");
  return rows
    .filter((r) => r[0] || r[1])
    .map<Unit>((r) => ({
      ProjectID: r[0] ?? "",
      UnitNumber: r[1] ?? "",
      Availability: r[2] ?? "",
    }));
});

export const listBookings = createServerFn({ method: "GET" }).handler(async () => {
  const { getRange } = await import("./sheets.server");
  const rows = await getRange("Bookings!A2:M");
  return rowsToBookings(rows);
});

export const listDepartments = createServerFn({ method: "GET" }).handler(async () => {
  const { getRange } = await import("./sheets.server");
  const { DEPARTMENTS } = await import("./departments");
  const rows = await getRange("Departments!A2:A");
  const names = rows.map((r) => (r[0] ?? "").trim()).filter(Boolean);
  return names.length ? Array.from(new Set(names)) : [...DEPARTMENTS];
});

export const createBooking = createServerFn({ method: "POST" })
  .inputValidator((data: BookingInput) => data)
  .handler(async ({ data }) => {
    const { getRange, appendRow } = await import("./sheets.server");
    const { overlaps } = await import("./booking-types");

    // Overlap check
    const rows = await getRange("Bookings!A2:M");
    const existing = rowsToBookings(rows);
    const conflict = existing.find(
      (b) =>
        b.ProjectName === data.ProjectName &&
        b.UnitNumber === data.UnitNumber &&
        b.VisitDate === data.VisitDate &&
        overlaps(data.StartTime, data.EndTime, b.StartTime, b.EndTime),
    );
    if (conflict) {
      throw new Error(
        `This unit is already booked from ${conflict.StartTime}–${conflict.EndTime} by ${conflict.EmployeeName}.`,
      );
    }

    const id = `BK${Date.now().toString(36).toUpperCase()}`;
    const createdAt = new Date().toISOString();
    await appendRow("Bookings!A:M", [
      id,
      data.EmployeeName,
      data.Department,
      data.CustomerName,
      data.MobileNumber,
      data.ProjectName,
      data.UnitNumber,
      data.VisitDate,
      data.StartTime,
      data.EndTime,
      data.Purpose,
      data.Remarks,
      createdAt,
    ]);
    return { id };
  });

function assertAdmin(code: string | undefined) {
  const expected = process.env.ADMIN_CODE;
  if (!expected) throw new Error("Admin code is not configured on the server.");
  if (!code || code.trim() !== expected.trim()) throw new Error("Invalid admin code.");
}

export const verifyAdminCode = createServerFn({ method: "POST" })
  .inputValidator((data: { code: string }) => data)
  .handler(async ({ data }) => {
    assertAdmin(data.code);
    return { ok: true };
  });

export const updateBooking = createServerFn({ method: "POST" })
  .inputValidator((data: BookingInput & { BookingID: string; _row: number; adminCode: string }) => data)
  .handler(async ({ data }) => {
    assertAdmin(data.adminCode);
    const { getRange, updateRange } = await import("./sheets.server");
    const { overlaps } = await import("./booking-types");
    const rows = await getRange("Bookings!A2:M");
    const existing = rowsToBookings(rows);
    const conflict = existing.find(
      (b) =>
        b.BookingID !== data.BookingID &&
        b.ProjectName === data.ProjectName &&
        b.UnitNumber === data.UnitNumber &&
        b.VisitDate === data.VisitDate &&
        overlaps(data.StartTime, data.EndTime, b.StartTime, b.EndTime),
    );
    if (conflict) {
      throw new Error(
        `This unit is already booked from ${conflict.StartTime}–${conflict.EndTime}.`,
      );
    }
    const orig = existing.find((b) => b.BookingID === data.BookingID);
    await updateRange(`Bookings!A${data._row}:M${data._row}`, [
      data.BookingID,
      data.EmployeeName,
      data.Department,
      data.CustomerName,
      data.MobileNumber,
      data.ProjectName,
      data.UnitNumber,
      data.VisitDate,
      data.StartTime,
      data.EndTime,
      data.Purpose,
      data.Remarks,
      orig?.CreatedAt || new Date().toISOString(),
    ]);
    return { ok: true };
  });

export const deleteBooking = createServerFn({ method: "POST" })
  .inputValidator((data: { _row: number; adminCode: string }) => data)
  .handler(async ({ data }) => {
    assertAdmin(data.adminCode);
    const { clearRange } = await import("./sheets.server");
    await clearRange(`Bookings!A${data._row}:M${data._row}`);
    return { ok: true };
  });

export const setupSheets = createServerFn({ method: "POST" }).handler(async () => {
  const { ensureTabs } = await import("./sheets.server");
  return ensureTabs();
});