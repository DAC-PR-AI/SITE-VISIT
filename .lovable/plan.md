# Site Visit Booking — Build Plan

Using the selected "Architectural Ledger" direction (Urbanist + Epilogue, Cloud White palette with department color chips), and matching the Hall Booking reference for the booking page composition (summary cards on top, tabbed section: Timeline / New Booking / All Bookings, legend, recent booking dark card).

## Backend: Google Sheets via connector

Google Sheets connector is already linked. I need one thing from you: **your Google Sheet ID**. I'll request it as a secret named `GOOGLE_SHEET_ID` (safer than pasting a URL in code — the sheet is identity-sensitive).

The sheet must have three tabs with exactly these headers in row 1:

```
Projects:  ProjectID | ProjectName
Units:     ProjectID | UnitNumber | Availability
Bookings:  BookingID | EmployeeName | Department | CustomerName | MobileNumber |
           ProjectName | UnitNumber | VisitDate | StartTime | EndTime |
           Purpose | Remarks | CreatedAt
```

Share the sheet with the Google account you connected (Editor access).

## Server functions (TanStack Start, gateway-routed)

- `listProjects` — GET `/values/Projects!A2:B`
- `listUnits` — GET `/values/Units!A2:C`
- `listBookings` — GET `/values/Bookings!A2:M`
- `createBooking` — POST append to `Bookings!A:M`, with server-side overlap check
- `updateBooking` — PUT `/values/Bookings!A{row}:M{row}`
- `deleteBooking` — batchUpdate (clear row)

All calls go through `https://connector-gateway.lovable.dev/google_sheets/v4/...` with `Authorization: Bearer $LOVABLE_API_KEY` and `X-Connection-Api-Key: $GOOGLE_SHEETS_API_KEY`.

## Frontend structure

Sidebar dashboard layout, matching selected direction.

Routes:
- `/` — Dashboard: KPI cards, project status cards (Today's count, Next visit, Free/Busy/None), Today's schedule, Recent bookings
- `/timeline` — Full-width horizontal timeline: hours across top, projects vertically, colored blocks per department, day nav (Prev/Today/Next/Jump), department legend
- `/bookings` — All bookings table with filters (date, project, department, employee, customer), global search, edit/cancel actions, "Export to Excel" (xlsx via `xlsx` package)
- `/new` — Booking form: Employee, Department, Mobile, Customer, Project (dropdown), Unit (dependent dropdown, availability-filtered), Date, From/To time, Purpose, Remarks. Validates required fields + overlap.

Booking block click → shadcn Dialog with full details + Edit / Cancel.

## Design tokens (added to `src/styles.css`)
- Urbanist (display), Epilogue (body), JetBrains Mono for time labels
- Department color tokens: sales/marketing/ops/finance/hr/mgmt/crm
- Cloud White surface tokens (already close to shadcn defaults)

## Extras included
- Auto refresh every 60s (TanStack Query `refetchInterval`)
- Toast notifications (sonner) for success/error
- Loading skeletons
- Global search across bookings
- Export to xlsx

## Files

- `src/styles.css` — tokens, fonts
- `src/routes/__root.tsx` — sidebar layout, header, search
- `src/routes/index.tsx` — Dashboard
- `src/routes/timeline.tsx` — Timeline view
- `src/routes/bookings.tsx` — All bookings + filters + export
- `src/routes/new.tsx` — New booking form
- `src/lib/sheets.functions.ts` — server functions
- `src/lib/sheets.server.ts` — gateway fetch helper
- `src/lib/departments.ts` — department color map
- `src/components/app-sidebar.tsx`
- `src/components/booking-detail-dialog.tsx`
- `src/components/timeline-view.tsx`
- `src/components/booking-form.tsx`

After you approve, I'll set the `GOOGLE_SHEET_ID` secret request and build everything.
