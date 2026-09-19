# ExpoHub Booth System

React + Vite frontend with a FastAPI / SQLAlchemy / SQLite API.

## Run the installed application

From this directory in PowerShell:

```powershell
.\start.ps1
```

Open http://127.0.0.1:8001. Stop with Ctrl+C. Port 8001 is used because another process already occupies 8000 on this machine. Use `./start.ps1 -Port 8002` if needed.
The existing database is always resolved relative to `backend/database.py`, independent of the launch directory.

For access from employee computers on the same trusted private network, first create the administrator from the server computer, then run `./start.ps1 -ListenAddress 0.0.0.0`. Employees open `http://SERVER-IP:8001`. For use beyond a trusted LAN, put the app behind HTTPS and set `COOKIE_SECURE=1`.

## Fresh setup

Use Python 3.12+ and Node.js compatible with the installed Vite version:

```powershell
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r backend/requirements.txt
npm --prefix frontend ci
npm --prefix frontend run build
.\start.ps1
```

Do not run `backend/seed_data.py` against an existing database: it drops and recreates every table.

## Development

Run the API on 8000 (`./start.ps1 -Port 8000`) and `npm --prefix frontend run dev` in another terminal. Vite proxies `/api` to 127.0.0.1:8000. Production uses same-origin `/api`; `VITE_API_BASE` can override it at build time.

## Verification

```powershell
.\.venv\Scripts\python.exe -m unittest discover -s backend/tests -v
npm --prefix frontend run lint
npm --prefix frontend run build
```

Tests use a temporary SQLite database. They cover authentication, administrator/staff permissions, first-login password changes, session expiry, login throttling, additive migration, blank floor plans, drag-layout persistence and conflicts, booking validation, simultaneous booth sales, payments, release/rebooking, audit logs, and protection of financial history.

## First administrator and staff accounts

On the first run, the local setup screen asks the company owner to create the first administrator account. No default password is included. Setup is accepted only from the same computer and closes permanently after the first account is configured.

The administrator can then open **Team & Access**, create a separate account for every employee, assign `admin` or `staff`, disable access, and issue a temporary password. Staff must replace the temporary password at their first sign-in.

## Company workflow

- A new event begins with a measured blank floor. In **Edit layout**, an administrator sets the floor size and builds the venue with movable entrances, exits, pathways, stages, restrooms, food areas, lounges, seating, plant dividers, information points, emergency exits, walls, and labels. Every venue element supports a custom label, exact X/Y position, width/depth, 90° rotation, and deletion.
- The administrator then creates booths, drags them onto the same floor, enters exact X/Y coordinates and booth width/depth, and publishes the revision. The editor does not auto-fit or rearrange the floor.
- **Focus mode** expands the manual canvas over the workspace. The unplaced-booth library stays collapsed until requested, and theme controls live under **My Account** so the floor remains the visual priority.
- Published booths use a top-down floor-plan treatment with a rear wall, counter, table, chairs, plant, status color, booth code, exhibitor and seller.
- Staff see the published plan, click an available booth, record the exhibitor and sales notes, and choose sold, hold, or direct sale with payment.
- Every active browser refreshes shared data every three seconds. The booth changes color and shows the exhibitor and seller. The server prevents two employees from selling the same booth at the same time.
- Staff can change only bookings they recorded; administrators can manage all bookings, users, events, booths, and layouts. Payment balances are calculated by the server.
- **Activity log** records login, user-management, layout, booking, payment, release, booth, and event actions.

## Behavior and limits

- The system is configured for one local FastAPI process with SQLite. Before a larger multi-computer or Internet deployment, use HTTPS, automated backups, a production database such as PostgreSQL, and a supervised deployment service.
- Shared changes are visible after a maximum of roughly three seconds; WebSocket push is not implemented.
- Holds are released manually after review. Automatic expiry notifications are not implemented.
- Booth previews are concept images rather than interactive 3D models. Khmer translation is partial.
- Existing records include B-05 and C-05 marked available with paid bookings, and C-01 and C-06 marked sold without active bookings. Review these records with the event owner; this update deliberately did not rewrite financial history.

## Research applied

- W3C native dialog guidance: https://www.w3.org/WAI/WCAG21/Techniques/html/H102 — browser-managed modal focus, Escape dismissal, and restoration of focus.
- SQLAlchemy session guidance: https://docs.sqlalchemy.org/en/20/orm/session_basics.html — booking, initial payment, and status are committed together; failed requests close/roll back the session.
- OWASP password-storage guidance: https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html — salted PBKDF2-SHA256 password hashes with 600,000 iterations.
- FastAPI security guidance: https://fastapi.tiangolo.com/tutorial/security/get-current-user/ — centralized authenticated-user dependencies and role checks.
