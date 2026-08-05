import { createServerFn } from "@tanstack/react-start";
import type { Booking, Project, Unit, BookingInput, VisitStatusValue } from "./booking-types";
import {
  MOCK_PROJECTS,
  MOCK_UNITS,
  MOCK_DEPARTMENTS,
  getInMemoryBookings,
  addInMemoryBooking,
  updateInMemoryBooking,
  deleteInMemoryBooking,
} from "./mock-data";
import { DEPARTMENTS, normalizeDepartmentName } from "./departments";

const BOOKING_COLS = 15; // A..O

function isQuotaExceededError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error ?? "");
  const body = typeof error === "object" && error && "body" in error ? String((error as { body?: unknown }).body ?? "") : "";
  return /429|quota exceeded|resource_exhausted|too many requests|rate limit/i.test(`${message}\n${body}`);
}

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
        VisitStatus: p[13] || p[14] || undefined,
        _row: i + 2, // header is row 1
      } as Booking;
    })
    .filter(Boolean) as Booking[];
}

function bookingToSheetRow(booking: Booking, visitStatus?: string) {
  return [
    booking.BookingID,
    booking.EmployeeName,
    booking.Department,
    booking.CustomerName,
    booking.MobileNumber,
    booking.ProjectName,
    booking.UnitNumber,
    booking.VisitDate,
    booking.StartTime,
    booking.EndTime,
    booking.Purpose,
    booking.Remarks,
    booking.CreatedAt,
    "", // col N – reserved / was old Status header
    visitStatus ?? booking.VisitStatus ?? "", // col O – Status (user's column)
  ] as (string | number)[];
}

export const checkSheetConnection = createServerFn({ method: "GET" }).handler(async () => {
  const sheetIdVal = process.env.GOOGLE_SHEET_ID;
  const saEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || process.env.GOOGLE_CLIENT_EMAIL;
  const saKey = process.env.GOOGLE_PRIVATE_KEY || process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY;
  const apiKey = process.env.GOOGLE_SHEETS_API_KEY || process.env.GOOGLE_API_KEY;

  if (!sheetIdVal) {
    return {
      configured: false,
      reason: "GOOGLE_SHEET_ID is not set in environment variables.",
      sheetId: null,
    };
  }

  if (!saEmail && !saKey && !apiKey) {
    return {
      configured: false,
      reason: "No Google API credentials found (GOOGLE_SERVICE_ACCOUNT_EMAIL or GOOGLE_SHEETS_API_KEY).",
      sheetId: `${sheetIdVal.slice(0, 8)}...`,
    };
  }

  try {
    const { getRange } = await import("./sheets.server");
    await getRange("Projects!A1:B1");
    return {
      configured: true,
      reason: "Successfully connected to Google Sheet.",
      sheetId: `${sheetIdVal.slice(0, 8)}...`,
    };
  } catch (err: unknown) {
    const message = (err as Error)?.message || "Unknown error";
    const reason = isQuotaExceededError(err)
      ? "Google Sheets is temporarily rate-limited. Using demo data for now."
      : `Google Sheet Connection Failed (${message})`;
    return {
      configured: false,
      reason,
      sheetId: `${sheetIdVal.slice(0, 8)}...`,
    };
  }
});

export const listProjects = createServerFn({ method: "GET" }).handler(async () => {
  if (!process.env.GOOGLE_SHEET_ID) return MOCK_PROJECTS;
  try {
    const { getRange } = await import("./sheets.server");
    const rows = await getRange("Projects!A2:B");
    if (!rows) return [];
    return rows
      .filter((r) => r[0] || r[1])
      .map<Project>((r) => ({ ProjectID: r[0] ?? "", ProjectName: r[1] ?? "" }));
  } catch (err) {
    if (isQuotaExceededError(err)) {
      console.warn("[sheets] Google Sheets quota exceeded while listing projects — using mock fallback.");
      return MOCK_PROJECTS;
    }
    console.error("[sheets] Failed to list projects from Google Sheets:", err);
    throw err;
  }
});

export const listUnits = createServerFn({ method: "GET" }).handler(async () => {
  if (!process.env.GOOGLE_SHEET_ID) return MOCK_UNITS;
  try {
    const { getRange } = await import("./sheets.server");
    const rows = await getRange("Units!A2:C");
    if (!rows) return [];
    return rows
      .filter((r) => r[0] || r[1])
      .map<Unit>((r) => ({
        ProjectID: r[0] ?? "",
        UnitNumber: r[1] ?? "",
        Availability: r[2] ?? "",
      }));
  } catch (err) {
    if (isQuotaExceededError(err)) {
      console.warn("[sheets] Google Sheets quota exceeded while listing units — using mock fallback.");
      return MOCK_UNITS;
    }
    console.error("[sheets] Failed to list units from Google Sheets:", err);
    throw err;
  }
});

export const listBookings = createServerFn({ method: "GET" }).handler(async () => {
  if (!process.env.GOOGLE_SHEET_ID) return getInMemoryBookings();
  try {
    const { getRange } = await import("./sheets.server");
    const rows = await getRange("Bookings!A2:O");
    if (!rows) return [];
    return rowsToBookings(rows);
  } catch (err) {
    if (isQuotaExceededError(err)) {
      console.warn("[sheets] Google Sheets quota exceeded while listing bookings — using mock fallback.");
      return getInMemoryBookings();
    }
    console.error("[sheets] Failed to list bookings from Google Sheets:", err);
    throw err;
  }
});

export const listDepartments = createServerFn({ method: "GET" }).handler(async () => {
  if (!process.env.GOOGLE_SHEET_ID) return MOCK_DEPARTMENTS;
  try {
    const { getRange } = await import("./sheets.server");
    const rows = await getRange("Departments!A2:A");
    if (!rows || rows.length === 0) return [...DEPARTMENTS];
    const names = rows
      .map((r) => normalizeDepartmentName(r[0] ?? ""))
      .filter((name): name is string => Boolean(name));
    return names.length ? Array.from(new Set(names)) : [...DEPARTMENTS];
  } catch (err) {
    if (isQuotaExceededError(err)) {
      console.warn("[sheets] Google Sheets quota exceeded while listing departments — using fallback departments.");
      return [...MOCK_DEPARTMENTS];
    }
    console.error("[sheets] Failed to list departments from Google Sheets:", err);
    const { DEPARTMENTS } = await import("./departments");
    return [...DEPARTMENTS];
  }
});

const DEFAULT_PURPOSES = [
  "General Site Visit",
  "Customization",
  "Joint Inspection - Interior",
  "Joint Inspection - Final Key",
  "Others",
];

export const listPurposes = createServerFn({ method: "GET" }).handler(async () => {
  if (!process.env.GOOGLE_SHEET_ID) return DEFAULT_PURPOSES;
  try {
    const { getRange } = await import("./sheets.server");
    const rows = await getRange("Purposes!A2:A");
    if (!rows || rows.length === 0) return DEFAULT_PURPOSES;
    const names = rows
      .map((r) => (r[0] ?? "").trim())
      .filter((name): name is string => Boolean(name));
    return names.length ? Array.from(new Set(names)) : DEFAULT_PURPOSES;
  } catch (err) {
    if (isQuotaExceededError(err)) {
      console.warn("[sheets] Google Sheets quota exceeded while listing purposes — using defaults.");
      return DEFAULT_PURPOSES;
    }
    console.error("[sheets] Failed to list purposes from Google Sheets:", err);
    return DEFAULT_PURPOSES;
  }
});

import { enforceRateLimit } from "./rate-limit";

function validateBookingInput(data: BookingInput) {
  if (!data.EmployeeName || data.EmployeeName.trim().length < 2 || data.EmployeeName.length > 80) {
    throw new Error("Invalid employee name.");
  }
  if (!data.CustomerName || data.CustomerName.trim().length < 2 || data.CustomerName.length > 80) {
    throw new Error("Invalid customer name.");
  }
  if (!data.MobileNumber || data.MobileNumber.trim().length < 7 || data.MobileNumber.length > 20) {
    throw new Error("Invalid mobile number.");
  }
  if (!data.ProjectName || data.ProjectName.length > 100) {
    throw new Error("Invalid project name.");
  }
  if (!data.UnitNumber || data.UnitNumber.length > 50) {
    throw new Error("Invalid unit number.");
  }
  if (!data.VisitDate || !/^\d{4}-\d{2}-\d{2}$/.test(data.VisitDate)) {
    throw new Error("Invalid visit date format.");
  }
  if (!data.StartTime || !/^\d{2}:\d{2}$/.test(data.StartTime)) {
    throw new Error("Invalid start time format.");
  }
  if (!data.EndTime || !/^\d{2}:\d{2}$/.test(data.EndTime)) {
    throw new Error("Invalid end time format.");
  }
  if (data.Purpose && data.Purpose.length > 200) {
    throw new Error("Purpose exceeds maximum length.");
  }
  if (data.Remarks && data.Remarks.length > 500) {
    throw new Error("Remarks exceed maximum length.");
  }
}

export const createBooking = createServerFn({ method: "POST" })
  .inputValidator((data: BookingInput) => data)
  .handler(async ({ data }) => {
    enforceRateLimit("global", "createBooking");
    validateBookingInput(data);
    const { overlaps } = await import("./booking-types");

    if (process.env.GOOGLE_SHEET_ID) {
      const { getRange, appendRow } = await import("./sheets.server");
      const rows = await getRange("Bookings!A2:O");
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
      await appendRow("Bookings!A:N", [
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
        "",
      ]);
      return { id };
    }

    // Fallback to in-memory store ONLY if GOOGLE_SHEET_ID is not set at all
    const existing = getInMemoryBookings();
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
    const newB = addInMemoryBooking({
      BookingID: id,
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
      CreatedAt: new Date().toISOString(),
    });
    return { id: newB.BookingID };
  });

function assertAdmin(code: string | undefined) {
  const expected = process.env.ADMIN_CODE;
  if (!expected) {
    throw new Error("ADMIN_CODE is not set on the server.");
  }
  if (!code || code.trim() !== expected.trim()) throw new Error("Invalid admin code.");
}

export const verifyAdminCode = createServerFn({ method: "POST" })
  .inputValidator((data: { code: string }) => data)
  .handler(async ({ data }) => {
    enforceRateLimit("global", "verifyAdmin");
    assertAdmin(data.code);
    return { ok: true };
  });

export const updateBooking = createServerFn({ method: "POST" })
  .inputValidator((data: BookingInput & { BookingID: string; _row: number; adminCode: string }) => data)
  .handler(async ({ data }) => {
    enforceRateLimit("global", "updateBooking");
    assertAdmin(data.adminCode);
    validateBookingInput(data);
    const { overlaps } = await import("./booking-types");

    if (process.env.GOOGLE_SHEET_ID) {
      const { getRange, updateRange } = await import("./sheets.server");
      const rows = await getRange("Bookings!A2:O");
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
      await updateRange(`Bookings!A${data._row}:N${data._row}`, [
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
        data.VisitStatus ?? orig?.VisitStatus ?? "",
      ]);
      return { ok: true };
    }

    updateInMemoryBooking(data);
    return { ok: true };
  });

export const deleteBooking = createServerFn({ method: "POST" })
  .inputValidator((data: { _row: number; adminCode: string }) => data)
  .handler(async ({ data }) => {
    enforceRateLimit("global", "deleteBooking");
    assertAdmin(data.adminCode);
    if (process.env.GOOGLE_SHEET_ID) {
      const { clearRange } = await import("./sheets.server");
      await clearRange(`Bookings!A${data._row}:N${data._row}`);
      return { ok: true };
    }
    deleteInMemoryBooking(data._row);
    return { ok: true };
  });

export const updateBookingStatus = createServerFn({ method: "POST" })
  .inputValidator((data: { bookingId: string; status: VisitStatusValue }) => data)
  .handler(async ({ data }) => {
    enforceRateLimit("global", "updateBookingStatus");
    if (!["Yes", "No", "Unknown"].includes(data.status)) {
      throw new Error("Invalid visit status.");
    }
    if (process.env.GOOGLE_SHEET_ID) {
      const { getRange, updateRange } = await import("./sheets.server");
      const rows = await getRange("Bookings!A2:O");
      const existing = rowsToBookings(rows);
      const booking = existing.find((item) => item.BookingID === data.bookingId);
      if (!booking) throw new Error("Booking not found.");

      const nextStatus = data.status === "Unknown" ? "" : data.status;
      const row = bookingToSheetRow(booking, nextStatus);
      await updateRange(`Bookings!A${booking._row}:O${booking._row}`, row);
      return { ok: true };
    }

    const existing = getInMemoryBookings();
    const booking = existing.find((item) => item.BookingID === data.bookingId);
    if (!booking) throw new Error("Booking not found.");

    const nextStatus = data.status === "Unknown" ? "" : data.status;
    updateInMemoryBooking({
      ...booking,
      VisitStatus: nextStatus,
      _row: booking._row ?? 0,
      BookingID: booking.BookingID,
    } as BookingInput & { BookingID: string; _row: number });
    return { ok: true };
  });

export const setupSheets = createServerFn({ method: "POST" }).handler(async () => {
  if (!process.env.GOOGLE_SHEET_ID) {
    return { created: [], existing: ["Demo (Local Mode)"] };
  }
  const { ensureTabs } = await import("./sheets.server");
  return ensureTabs();
});
