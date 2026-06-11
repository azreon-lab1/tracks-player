# PLAN: Reports feature (HTML report hosting + viewing)

Status: design agreed in chat, ready to implement. Build on the existing
Azreon Tracks Platform (Worker + B2 + D1 + the tracks-player app). Same
auth/session model as tracks.

## Goal
Host HTML reports and let:
- **Participants** see and open ONLY their own reports (after the normal OTP login).
- **Admins** see/open ALL reports (participant + admin-only), and upload new ones.
Reports render as standalone HTML pages but inside a **sandboxed iframe** so they
cannot read the app's session token. Reports may contain JavaScript (charts) →
sandbox uses `allow-scripts` (NOT `allow-same-origin`).

## Two report categories
- **participant** — belongs to exactly one participant (one user_id). Filename-driven.
- **admin** — visible only to admins. Any filename. Ordered by upload time.

## Identifiers — BOTH are supported (stored + access)

Every report stores BOTH its structured identity AND a simple numeric id:
- **Structured identity** (participant reports): user_id + protocol_id + report_date
  + report_number — the meaningful, human-readable metadata from the filename. Used
  for display, organisation, querying, and as an alternative access key.
- **Simple numeric id** (all reports): the primary key. The universal handle, shown
  after upload ("Report with ID 45 added successfully!") and usable for any report.

### Two access URL forms (both work)
```
?report=45                  → by simple id. Works for ANY report (admin or participant),
                              subject to the access check. Universal, shareable.
?report=2026_06_01-1        → by date+number. Resolves against THIS user's user_id
                              (implicit from the token). Participant reports only.
```
Worker /report endpoint accepts EITHER:
- `?id=NN`                          → look up by primary key
- `?date=yyyy-mm-dd&number=N`       → look up by (requester's user_id, date, number)
The frontend deep-link reader accepts both URL shapes and calls the matching endpoint.

Access check is identical regardless of which form was used:
- admin report → requester must be is_admin
- participant report → requester.user_id === report.user_id OR requester is_admin
- else 403

Note: the date+number form is only meaningful for participant reports (admin reports
have no date/number). The simple id form is the universal one. Both are offered so you
have the easy shareable handle AND the structured, human-meaningful access path.

## Data model (D1) — new table, no user_reports needed
A participant report belongs to exactly one participant, so store user_id on the row.
```sql
CREATE TABLE IF NOT EXISTS reports (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  scope         TEXT NOT NULL,         -- 'participant' | 'admin'
  r2_key        TEXT NOT NULL UNIQUE,  -- sanitised filename in B2 (reports/ prefix)
  user_id       TEXT,                  -- participant reports only (e.g. U005); NULL for admin
  protocol_id   TEXT,                  -- participant reports only (e.g. P2)
  report_date   TEXT,                  -- participant reports only (yyyy-mm-dd)
  report_number INTEGER,               -- participant reports only (1,2,3 per day)
  title         TEXT NOT NULL,         -- display name (de-slugged report name, or admin name)
  enabled       INTEGER NOT NULL DEFAULT 1,
  created_at    TEXT NOT NULL DEFAULT (datetime('now'))
);
-- Uniqueness for participant reports (defensive; app also checks):
CREATE UNIQUE INDEX IF NOT EXISTS idx_reports_participant
  ON reports(user_id, report_date, report_number) WHERE scope='participant';
```
Also add an admin flag to allowed_emails:
```sql
ALTER TABLE allowed_emails ADD COLUMN is_admin INTEGER NOT NULL DEFAULT 0;
```
(One-time migration on the live DB; SQLite ADD COLUMN has no IF NOT EXISTS — run once.)

## Filename convention (participant reports)
```
participantId-protocolId-yyyy_mm_dd-number-reportName.html
e.g.  U005-P2-2026_06_01-1-weekly_summary.html
```
Parse by splitting on the FIRST 4 hyphens (reportName may contain hyphens):
- participantId → user_id (must exist in allowed_emails; resolve email from it)
- protocolId
- date yyyy_mm_dd → store as yyyy-mm-dd
- number (integer)
- reportName → title (de-slug: underscores/hyphens → spaces, Title Case) for display
Sanitisation: reject filenames with spaces or invalid characters — show a clear
error so the admin fixes the source name (do NOT silently rewrite).

Admin reports: any filename. Must not already exist in B2 / reports table; if it
does, instruct the admin to rename (e.g. add V2). Ordered by created_at.

## Upload tab (admin only)
A new "Upload" tab in the app, visible only when is_admin. Flow:
1. Admin drops/selects an .html file (works on computer and phone).
2. A checkbox: "This is an admin report".
3. On select, the system inspects the filename:
   - If admin box ticked → treat as admin report (validate name is unique).
   - If not ticked → validate against the participant filename pattern.
     - Matches → parse and show a confirmation summary
       (Participant U005 / maria@…, Protocol P2, Date 2026-06-01, Number 1,
        Title "Weekly Summary", Scope participant).
     - Does NOT match → STOP and ask:
       "This filename doesn't match the participant format. Upload as an Admin
        report instead?  [Yes, admin report] [No, fix the filename]"
       (never silently upload a mis-named participant report as admin).
4. Admin confirms → file is uploaded to B2 (via the Worker) and registered in D1.
5. Success message returns the new ID: "Report with ID 45 added successfully!"

Upload mechanism for v1: browser → Worker → B2 (HTML files are tiny; well within
Worker request limits). Later we can add curl/API/webhook paths that converge on the
same registration step. (Separate "upload" from "register" conceptually.)

## Worker endpoints
```
GET  /reports               (Bearer) → this participant's reports (scope=participant,
                                        user_id = theirs), ordered by date then number.
                                        Also returns is_admin so the app can show admin tabs.
GET  /admin/reports         (Bearer + is_admin) → ALL reports (both scopes); admin reports
                                        ordered by created_at; participant grouped/listed too.
GET  /report?id=NN          (Bearer) → serve HTML by simple id, if allowed
GET  /report?date=Y-M-D&number=N (Bearer) → serve HTML by (requester user_id, date, number)
                                        Both forms apply the same access check:
                                - admin report → requester must be is_admin
                                - participant report → requester.user_id === report.user_id
                                                       OR requester is_admin
                                - else 403
POST /admin/reports         (Bearer + is_admin, multipart or JSON+base64) → upload file to B2
                                        + insert the reports row; returns the new id.
```
Auth: all of these require a valid session token (Bearer). is_admin is read from
allowed_emails for the token's email. (We rely on the token, as with everything else;
the admin-tool password/ADMIN_KEY is separate and unchanged.)

## Frontend (tracks-player/index.html)
- New **Reports tab** (all logged-in users): calls GET /reports, lists the participant's
  reports with title + date. Click → opens the viewer.
- New **Admin Reports tab** (only if is_admin): lists scope='admin' reports.
- New **Upload tab** (only if is_admin): the upload flow above.
- **Viewer**: full-viewport sandboxed iframe. Fetch the HTML via GET /report?id=NN
  (token in header), make a blob URL, set as iframe src with
  `sandbox="allow-scripts"`. A Back control returns to the index. Renders as a
  standalone page but cannot touch the parent session.
- **Deep link**: `?report=NN` opens the app straight into the viewer for report NN
  (mirrors ?track=T1). Survives login. If not allowed → friendly message.
  Shareable between admins, and an admin can share a participant's own report link
  with that participant (they can open it because it's theirs).

## Security notes
- Sandbox: `allow-scripts` only. Never add `allow-same-origin` (that would let the
  report read the parent's localStorage/token).
- Every /report and /admin/reports call re-checks authorisation server-side; never
  trust the client to filter.
- Report bytes are served through the Worker (not a public B2 URL), so access is
  always gated by the token.

## Verification
1. Participant sees only their reports; cannot open another participant's id (403).
2. Admin sees all; can open any; Upload + Admin Reports tabs appear only for admins.
3. ?report=NN deep link works for an allowed user; blocked for a disallowed one.
4. Mis-named participant file triggers the stop-and-ask prompt.
5. Duplicate admin filename is rejected with a rename instruction.
6. A report containing a chart/script renders and runs inside the sandbox, and
   CANNOT read ap_token (verify: a test report trying to read localStorage sees nothing).

## Build order (suggested, incremental)
1. Schema: reports table + is_admin column (migrations).
2. Worker: GET /reports, GET /report?id=, is_admin in /reports response.
3. Frontend: Reports tab + sandboxed viewer + ?report= deep link.
4. Worker: GET /admin/reports + POST /admin/reports (upload).
5. Frontend: Admin Reports tab + Upload tab (with filename parse + confirm).
6. Later: curl/API/webhook upload path; email/webhook notifications.
