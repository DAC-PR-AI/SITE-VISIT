import { createServerFn } from "@tanstack/react-start";
import type { Booking, Project, Unit, BookingInput } from "./booking-types";
import {
  MOCK_PROJECTS,
  MOCK_UNITS,
  MOCK_DEPARTMENTS,
  getInMemoryBookings,
  addInMemoryBooking,
  updateInMemoryBooking,
  deleteInMemoryBooking,
} from "./mock-data";

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
    return {
      configured: false,
      reason: `Google Sheet Connection Failed (${message})`,
      sheetId: `${sheetIdVal.slice(0, 8)}...`,
    };
  }
});

export const listProjects = createServerFn({ method: "GET" }).handler(async () => {
  try {
    if (!process.env.GOOGLE_SHEET_ID) return MOCK_PROJECTS;
    const { getRange } = await import("./sheets.server");
    const rows = await getRange("Projects!A2:B");
    if (!rows || rows.length === 0) return MOCK_PROJECTS;
    const projects = rows
      .filter((r) => r[0] || r[1])
      .map<Project>((r) => ({ ProjectID: r[0] ?? "", ProjectName: r[1] ?? "" }));
    return projects.length ? projects : MOCK_PROJECTS;
  } catch (err) {
    console.warn("[sheets] Failed to list projects from Google Sheets, using mock data:", err);
    return MOCK_PROJECTS;
  }
});

export const listUnits = createServerFn({ method: "GET" }).handler(async () => {
  try {
    if (!process.env.GOOGLE_SHEET_ID) return MOCK_UNITS;
    const { getRange } = await import("./sheets.server");
    const rows = await getRange("Units!A2:C");
    if (!rows || rows.length === 0) return MOCK_UNITS;
    const units = rows
      .filter((r) => r[0] || r[1])
      .map<Unit>((r) => ({
        ProjectID: r[0] ?? "",
        UnitNumber: r[1] ?? "",
        Availability: r[2] ?? "",
      }));
    return units.length ? units : MOCK_UNITS;
  } catch (err) {
    console.warn("[sheets] Failed to list units from Google Sheets, using mock data:", err);
    return MOCK_UNITS;
  }
});

export const listBookings = createServerFn({ method: "GET" }).handler(async () => {
  try {
    if (!process.env.GOOGLE_SHEET_ID) return getInMemoryBookings();
    const { getRange } = await import("./sheets.server");
    const rows = await getRange("Bookings!A2:M");
    const bookings = rowsToBookings(rows);
    return bookings.length ? bookings : getInMemoryBookings();
  } catch (err) {
    console.warn("[sheets] Failed to list bookings from Google Sheets, using mock data:", err);
    return getInMemoryBookings();
  }
});

export const listDepartments = createServerFn({ method: "GET" }).handler(async () => {
  try {
    if (!process.env.GOOGLE_SHEET_ID) return MOCK_DEPARTMENTS;
    const { getRange } = await import("./sheets.server");
    const rows = await getRange("Departments!A2:A");
    const names = rows.map((r) => (r[0] ?? "").trim()).filter(Boolean);
    return names.length ? Array.from(new Set(names)) : MOCK_DEPARTMENTS;
  } catch (err) {
    console.warn("[sheets] Failed to list departments from Google Sheets, using mock data:", err);
    return MOCK_DEPARTMENTS;
  }
});

export const createBooking = createServerFn({ method: "POST" })
  .inputValidator((data: BookingInput) => data)
  .handler(async ({ data }) => {
    const { overlaps } = await import("./booking-types");

    let existing: Booking[] = [];
    let isGoogleLive = false;

    if (process.env.GOOGLE_SHEET_ID) {
      try {
        const { getRange, appendRow } = await import("./sheets.server");
        const rows = await getRange("Bookings!A2:M");
        existing = rowsToBookings(rows);
        isGoogleLive = true;

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
      } catch (err: unknown) {
        if ((err as Error)?.message?.includes("already booked")) throw err;
        console.warn("[sheets] Google Sheets createBooking error, using mock data:", err);
      }
    }

    // Fallback to in-memory store if Google Sheets is not configured or failed
    existing = getInMemoryBookings();
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
  const expected = process.env.ADMIN_CODE || "2727";
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
    const { overlaps } = await import("./booking-types");

    if (process.env.GOOGLE_SHEET_ID) {
      try {
        const { getRange, updateRange } = await import("./sheets.server");
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
      } catch (err: unknown) {
        if ((err as Error)?.message?.includes("already booked")) throw err;
        console.warn("[sheets] Google Sheets updateBooking error, using mock fallback:", err);
      }
    }

    updateInMemoryBooking(data);
    return { ok: true };
  });

export const deleteBooking = createServerFn({ method: "POST" })
  .inputValidator((data: { _row: number; adminCode: string }) => data)
  .handler(async ({ data }) => {
    assertAdmin(data.adminCode);
    if (process.env.GOOGLE_SHEET_ID) {
      try {
        const { clearRange } = await import("./sheets.server");
        await clearRange(`Bookings!A${data._row}:M${data._row}`);
        return { ok: true };
      } catch (err) {
        console.warn("[sheets] Google Sheets deleteBooking error, using mock fallback:", err);
      }
    }
    deleteInMemoryBooking(data._row);
    return { ok: true };
  });

export const setupSheets = createServerFn({ method: "POST" }).handler(async () => {
  if (!process.env.GOOGLE_SHEET_ID) {
    return { created: [], existing: ["Demo (Local Mode)"] };
  }
  const { ensureTabs } = await import("./sheets.server");
  return ensureTabs();
});