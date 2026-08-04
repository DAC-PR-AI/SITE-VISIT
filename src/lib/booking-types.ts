export interface Project {
  ProjectID: string;
  ProjectName: string;
}

export interface Unit {
  ProjectID: string;
  UnitNumber: string;
  Availability: string;
}

export interface Booking {
  BookingID: string;
  EmployeeName: string;
  Department: string;
  CustomerName: string;
  MobileNumber: string;
  ProjectName: string;
  UnitNumber: string;
  VisitDate: string; // YYYY-MM-DD
  StartTime: string; // HH:mm
  EndTime: string; // HH:mm
  Purpose: string;
  Remarks: string;
  CreatedAt: string;
  VisitStatus?: string;
  _row?: number; // sheet row for edit/delete
}

export type VisitStatusValue = "Yes" | "No" | "Unknown";

export interface BookingInput {
  EmployeeName: string;
  Department: string;
  CustomerName: string;
  MobileNumber: string;
  ProjectName: string;
  UnitNumber: string;
  VisitDate: string;
  StartTime: string;
  EndTime: string;
  Purpose: string;
  Remarks: string;
  VisitStatus?: string;
}

export function toMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return (h || 0) * 60 + (m || 0);
}

export function overlaps(aStart: string, aEnd: string, bStart: string, bEnd: string): boolean {
  return toMinutes(aStart) < toMinutes(bEnd) && toMinutes(bStart) < toMinutes(aEnd);
}

export function normalizeVisitStatus(value?: string | null): "Yes" | "No" | "Unknown" {
  if (!value) return "Unknown";
  const normalized = value.trim().toLowerCase();
  if (["yes", "y", "confirmed", "completed", "done", "true", "1"].includes(normalized)) return "Yes";
  if (["no", "n", "pending", "not completed", "false", "0"].includes(normalized)) return "No";
  return "Unknown";
}