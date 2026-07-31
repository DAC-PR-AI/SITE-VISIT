import type { Booking, Project, Unit, BookingInput } from "./booking-types";
import { DEPARTMENTS } from "./departments";

export const MOCK_PROJECTS: Project[] = [];
export const MOCK_UNITS: Unit[] = [];

export function getTodayISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export const INITIAL_MOCK_BOOKINGS: Booking[] = [];

let inMemoryBookings: Booking[] = [];

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
