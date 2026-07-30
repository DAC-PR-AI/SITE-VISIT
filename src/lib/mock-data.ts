import type { Booking, Project, Unit, BookingInput } from "./booking-types";
import { DEPARTMENTS } from "./departments";

export const MOCK_PROJECTS: Project[] = [
  { ProjectID: "P1", ProjectName: "Grand Horizon" },
  { ProjectID: "P2", ProjectName: "Emerald Heights" },
  { ProjectID: "P3", ProjectName: "Skyline Towers" },
  { ProjectID: "P4", ProjectName: "Royal Palms" },
];

export const MOCK_UNITS: Unit[] = [
  { ProjectID: "P1", UnitNumber: "101", Availability: "Available" },
  { ProjectID: "P1", UnitNumber: "102", Availability: "Available" },
  { ProjectID: "P1", UnitNumber: "201", Availability: "Booked" },
  { ProjectID: "P1", UnitNumber: "202", Availability: "Available" },
  { ProjectID: "P2", UnitNumber: "A-101", Availability: "Available" },
  { ProjectID: "P2", UnitNumber: "A-102", Availability: "Available" },
  { ProjectID: "P2", UnitNumber: "B-201", Availability: "Available" },
  { ProjectID: "P3", UnitNumber: "PH-1", Availability: "Available" },
  { ProjectID: "P3", UnitNumber: "PH-2", Availability: "Available" },
  { ProjectID: "P4", UnitNumber: "V-01", Availability: "Available" },
];

export function getTodayISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export const INITIAL_MOCK_BOOKINGS: Booking[] = [
  {
    BookingID: "BK-DEMO1",
    EmployeeName: "Rajesh Sharma",
    Department: "Sales",
    CustomerName: "Amit Patel",
    MobileNumber: "+91 98765 43210",
    ProjectName: "Grand Horizon",
    UnitNumber: "201",
    VisitDate: getTodayISO(),
    StartTime: "10:00",
    EndTime: "11:30",
    Purpose: "Initial Property Tour & Pricing Discussion",
    Remarks: "Client interested in 3BHK high-floor unit.",
    CreatedAt: new Date().toISOString(),
    _row: 2,
  },
  {
    BookingID: "BK-DEMO2",
    EmployeeName: "Priya Verma",
    Department: "Marketing",
    CustomerName: "Sanjay Gupta",
    MobileNumber: "+91 98123 45678",
    ProjectName: "Emerald Heights",
    UnitNumber: "A-101",
    VisitDate: getTodayISO(),
    StartTime: "14:00",
    EndTime: "15:00",
    Purpose: "Site Visit with Architect",
    Remarks: "Requires floor plan customization walkthrough.",
    CreatedAt: new Date().toISOString(),
    _row: 3,
  },
];

let inMemoryBookings: Booking[] = [...INITIAL_MOCK_BOOKINGS];

export function getInMemoryBookings(): Booking[] {
  return inMemoryBookings;
}

export function addInMemoryBooking(booking: Omit<Booking, "_row">): Booking {
  const newB: Booking = {
    ...booking,
    _row: inMemoryBookings.length + 2,
  };
  inMemoryBookings.unshift(newB);
  return newB;
}

export function updateInMemoryBooking(booking: BookingInput & { BookingID: string; _row: number }): boolean {
  const index = inMemoryBookings.findIndex((b) => b.BookingID === booking.BookingID || b._row === booking._row);
  if (index !== -1) {
    inMemoryBookings[index] = {
      ...inMemoryBookings[index],
      ...booking,
    };
    return true;
  }
  return false;
}

export function deleteInMemoryBooking(row: number): boolean {
  inMemoryBookings = inMemoryBookings.filter((b) => b._row !== row);
  return true;
}

export const MOCK_DEPARTMENTS: string[] = [...DEPARTMENTS];
