# Wave 2 / 3 Operations Portal Features

Implemented in accordance with Section 6, 10, and 18 of the **TechMaths DC Operations Portal — Product & Development Specification**:

## 1. Real-time Ticket Chat (`src/components/portal/ticket-chat.tsx`)
- **Connection to `public.messages`**:
  - Live Supabase `postgres_changes` subscription on the `messages` table for `ticket_id`.
  - Atomic delivery via `send_ticket_message` RPC or direct table insert with RLS policy enforcement.
- **Dual Communication Channels**:
  - **Client & Team (`client`)**: Visible to client organization contacts, admin, staff, and assigned engineers.
  - **Internal Notes (`internal`)**: Strictly staff/engineer-only notes, hidden from client organizations.
- **Field Engineer Quick Updates**:
  - One-tap operational dispatch updates ("En route", "Arrived on site", "Checking in with facility security", "Awaiting client sign-off").
- **UI & Accessibility**:
  - Accessible dialog modal, sender role badges, monospace time tracking, and auto-scroll behavior.

## 2. European Live Radar Map (`src/components/portal/live-map-view.tsx`)
- **Map Visual Canvas**:
  - Dark custom vector cartography styled with TechMaths design tokens (`#05070D` canvas, `#0B1018` surfaces, `#38E1FF` cyan routes, and animated radar rings).
  - Built using SVG projection (`MAP_VIEWBOX = "0 0 1000 520"` with accurate European landmass and country contours).
- **Data Center Facilities & Active Dispatches**:
  - Visualized sites: Start Campus Sines DC1 (Lisbon), Equinix FR2 (Frankfurt), Telehouse North Two (London), Digital Realty AMS1 (Amsterdam), Interxion MAD2 (Madrid), Equinix WA1 (Warsaw).
  - Status indicators: On Site (`#FFB84D`), En Route (`#38E1FF`), Available (`#3DDC97`), Standby (`#8B97AB`).
  - Active deployment vectors connecting Lisbon HQ to mission facilities.
- **Interactive Facility Detail Drawer**:
  - Displays facility tier, 150m geofence radius, active mission tickets, engineer status, and transit ETA.
- **GDPR Compliance Protocol**:
  - Built-in GDPR privacy indicator explaining that telemetry is active only during dispatched jobs with consent.

## 3. Timesheets & Hours Logging Ledger (`src/components/portal/timesheets-view.tsx`)
- **Active Mobile Stopwatch**:
  - Real-time digital stopwatch tracking for field technicians.
  - Category selector: `on_site_work`, `travel`, `remote_work`, `waiting`.
  - Start & Stop actions persist to `public.time_entries`.
- **Manual Hours Entry**:
  - Modal form for logging past hours with category, ticket selection, duration, and work notes.
- **Coordinator Sign-Off Flow**:
  - Admin & Staff one-click `Approve` or `Reject` actions with audit trail.
- **Ledger Metrics**:
  - Total Logged Hours, Pending Coordinator Approval, Approved Billable Hours, and settlement cycle tracking.

## 4. Database Migration (`supabase/migrations/20261104061500_wave2_wave3_operations.sql`)
- Updates permissions on `public.time_entries`.
- Implements stored procedures:
  - `send_ticket_message(...)`
  - `log_time_entry(...)`
  - `approve_time_entry(...)`

## 5. Verification
- 81 automated Vitest tests pass (`npm test`).
- Type check clean (`npm run typecheck`).
- Next.js production build succeeds with 201/201 static routes and optimized portal bundle (`npm run build`).
