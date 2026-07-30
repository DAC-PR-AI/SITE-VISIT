# SiteVisit Pro

I want you to build a modern Site Visit Booking Web Application for a Real Estate Company.

This application should be inspired by the Hall Booking UI shown in the reference images, but redesigned specifically for booking customer site visits.

The application should have a clean, premium dashboard with rounded cards, soft shadows, modern typography, responsive layout, and smooth animations.

=====================================

DATA SOURCE

=====================================

Use Google Sheets as the backend.

Google Sheets will contain:

1. Projects

2. Units

3. Site Visit Bookings

Projects Sheet

- ProjectID

- ProjectName

Units Sheet

- ProjectID

- UnitNumber

- Availability

Bookings Sheet

- BookingID

- EmployeeName

- Department

- CustomerName

- MobileNumber

- ProjectName

- UnitNumber

- VisitDate

- StartTime

- EndTime

- Purpose

- Remarks

- CreatedAt

=====================================

BOOKING PAGE

=====================================

Create a booking form with:

Employee Name

Department

Mobile Number

Customer Name

Project Name (Dropdown from Google Sheets)

Unit Number (Dependent Dropdown)

Visit Date

From Time

To Time

Purpose

Remarks

When a Project is selected, only that project's available units should appear.

Validate all required fields.

Store bookings into Google Sheets.

=====================================

VALIDATIONS

=====================================

Prevent duplicate bookings.

If the same unit is already booked for an overlapping time, prevent submission and show a user-friendly message.

=====================================

DASHBOARD

=====================================

Create summary cards similar to the Hall Booking reference.

Each Project card should display

Project Name

Today's Visit Count

Next Scheduled Visit

Current Status

Free Now

Busy

No Visits Today

=====================================

TIMELINE VIEW

=====================================

Create a beautiful horizontal timeline similar to the attached Hall Booking application.

Time should be displayed across the top.

Projects should appear vertically.

Each booking should appear as a colored horizontal block spanning from Start Time to End Time.

The block width should represent the booking duration.

The timeline should support:

Previous Day

Next Day

Today

Jump to Date

=====================================

BOOKING COLORS

=====================================

Assign fixed colors based on Department.

Example

Sales = Blue

Marketing = Green

Operations = Orange

Finance = Purple

HR = Pink

Management = Red

CRM = Cyan

Display a legend above the timeline.

=====================================

BOOKING DETAILS

=====================================

Clicking any booking should open a modal displaying:

Employee Name

Department

Customer Name

Mobile Number

Project

Unit

Visit Date

Start Time

End Time

Purpose

Remarks

=====================================

FILTERS

=====================================

Provide filters for

Date

Project

Department

Employee

Customer

=====================================

SEARCH

=====================================

Implement global search to quickly locate bookings by Employee, Customer, Project, or Unit.

=====================================

RESPONSIVE DESIGN

=====================================

The application must work well on desktop, tablet, and mobile.

=====================================

UI DESIGN

=====================================

Follow a premium corporate design inspired by the Hall Booking reference.

Use white cards, subtle shadows, rounded corners, modern typography, elegant spacing, smooth transitions, and color-coded timeline blocks.

Avoid clutter. The interface should feel fast, clean, and professional.

=====================================

EXTRA FEATURES

=====================================

- Today's schedule

- Upcoming visits

- Recent bookings

- Booking statistics

- Export bookings to Excel

- Edit bookings

- Cancel bookings

- Loading indicators

- Success notifications

- Error handling

- Automatic refresh every 60 seconds

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/2dcbbe96-60a0-4cad-8ae7-29b9486e3de3).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
