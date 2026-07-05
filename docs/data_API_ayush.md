# Ayushman — Data & API Documentation

**Version**: 1.1.0
**Base URL**: `https://api.ayushman.in/v1`
**Auth**: Bearer JWT in `Authorization` header
**Content-Type**: `application/json`
**Storage**: Supabase (S3-compatible) buckets for audio/documents
**Last Updated**: July 2026

---

## 1. API Conventions

### 1.1 Request Format
```
Authorization: Bearer <access_token>
Content-Type: application/json
X-Request-ID: <uuid>          (optional, for tracing)
```

### 1.2 Response Envelope

**Success:**
```json
{
  "success": true,
  "data": { ... },
  "meta": {                    // present on paginated responses
    "page": 1,
    "limit": 20,
    "total": 145,
    "totalPages": 8
  }
}
```

**Error:**
```json
{
  "success": false,
  "error": {
    "code": "CASE_NOT_FOUND",
    "message": "The requested case does not exist.",
    "details": []              // array of field-level errors for validation
  }
}
```

### 1.3 Pagination
All list endpoints accept:
```
?page=1&limit=20&sortBy=createdAt&sortOrder=desc
```

### 1.4 Error Codes

| HTTP Status | Code | Description |
|-------------|------|-------------|
| 400 | `VALIDATION_ERROR` | Input validation failed |
| 400 | `INVALID_OTP` | OTP incorrect or expired |
| 400 | `CONSENT_REQUIRED` | Recording attempted without client consent flag |
| 401 | `UNAUTHORIZED` | Missing or invalid token |
| 401 | `SESSION_EXPIRED` | Token expired, refresh needed |
| 403 | `FORBIDDEN` | Valid token but insufficient permission |
| 403 | `BOOKINGS_DISABLED` | Consultant has "Accept Bookings" turned off |
| 403 | `ACCOUNT_SUSPENDED` | Account suspended or deleted |
| 403 | `CASE_ACCESS_DENIED` | User is not a participant on this case |
| 404 | `NOT_FOUND` | Resource not found |
| 404 | `CASE_NOT_FOUND` | Case does not exist or not accessible |
| 409 | `SLOT_UNAVAILABLE` | Slot already booked or blocked (race condition) |
| 409 | `APPOINTMENT_NOT_ACTIONABLE` | Appointment not in a state that allows this action |
| 409 | `CASE_HAS_OPEN_ITEMS` | Case has open Commitments/Tasks, cannot close |
| 409 | `DUPLICATE_REVIEW` | Review already submitted for this appointment |
| 422 | `UNPROCESSABLE` | Semantic validation failed |
| 422 | `FILE_REJECTED` | File failed type/size allow-list or malware scan |
| 429 | `RATE_LIMITED` | Too many requests |
| 500 | `INTERNAL_ERROR` | Server error |

### 1.5 Roles & Scoping (applies globally)
- **Single-consultant instance**: each deployment has exactly one `CONSULTANT` (practice owner). Clients register and book directly — no consultant discovery/search APIs.
- `CLIENT`, `CONSULTANT`, `ADMIN`. Each user has **exactly one role**, selected at signup; no dual Client+Consultant identity in v1 (see `appflow_ayush.md` §3.1). The `CONSULTANT` slot is claimable once per instance; `ADMIN` users are org staff invited by the Consultant.
- **Row-level security**: every Case-scoped query is filtered server-side by `caseId` + (`consultantId` or `clientId`) derived from the JWT — never trusted from request payloads. This applies to REST and realtime channels alike.
- Org Admin reads of clinical/legal content during disputes are written to `AuditLog` with justification (see §16).

---

## 2. Authentication Endpoints

### POST /auth/register
Register a new user (Client or Consultant).

**Request Body:**
```json
{
  "fullName": "Dr. Anita Rao",
  "email": "anita@example.com",
  "phone": "+919876543210",
  "password": "Str0ng@Pass!",
  "role": "CONSULTANT"           // "CLIENT" | "CONSULTANT"
}
```

**Response 201:**
```json
{
  "success": true,
  "data": { "message": "OTP sent to +919876543210.", "userId": "uuid" }
}
```

**Validation:**
- `email`/`phone` unique; `password` min 8 chars, 1 uppercase, 1 number, 1 special char
- Registering as `CONSULTANT` creates a linked `ConsultantProfile` (only if the Consultant slot is unclaimed on this instance)

---

### POST /auth/verify-otp
**Request:** `{ "userId": "uuid", "otp": "483921" }`
**Response 200:** `{ "accessToken": "...", "user": { ...User } }`

**Edge Cases:** OTP expires after 10 min (`400 INVALID_OTP`); max 3 attempts before invalidation; sets `phoneVerified = true`.

---

### POST /auth/login
**Request:** `{ "email": "...", "password": "..." }`
**Response 200:** `{ "accessToken": "...", "user": {...} }` (`refresh_token` set as HttpOnly cookie)
**Errors:** Wrong credentials → generic `401`; 5 failed attempts → `429`, 15 min lockout.

---

### POST /auth/refresh
Refresh access token via HttpOnly cookie. `401 SESSION_EXPIRED` if revoked/missing.

### POST /auth/logout
Invalidates the current session/refresh token.

### POST /auth/forgot-password / POST /auth/reset-password
Standard email-token reset flow; forgot-password always returns `200` (prevents enumeration).

### POST /auth/resend-otp
Rate limited to 3/hour per `userId`.

---

## 3. Profiles

### GET /users/me
Returns the base `User` plus whichever profile(s) exist.

```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "email": "anita@example.com",
    "phone": "+919876543210",
    "role": "CONSULTANT",
    "isVerified": true,
    "isActive": true,
    "clientProfile": null,
    "consultantProfile": {
      "id": "uuid",
      "category": "MEDICAL",
      "verificationStatus": "VERIFIED",
      "isAcceptingNewClients": true
    }
  }
}
```

### PATCH /clients/me
Update `ClientProfile`. Supports partial, category-conditional sections per FR4 (e.g., medical-history block only required/shown once the client books a `MEDICAL` consultant).

```json
{
  "fullName": "Priya Sharma",
  "dob": "1990-02-10",
  "preferredLanguage": "kn"
  // Note: Guardian linking for minors is managed via the /clients/me/guardians endpoints mapping to the guardian_links table
}
```

### PATCH /consultants/me
Update `ConsultantProfile` (bio, qualifications, fee, languages, `isAcceptingNewClients`). Changing `category` may require re-uploading category-specific credential documents.

### POST /consultants/me/credentials
Upload or replace self-attested credential documents (FR3). **Tiered by category** (matches `appflow_ayush.md` §4):
- `MEDICAL` / `LEGAL`: license number + license PDF (original filename preserved for UI)
- `PHYSIOTHERAPY` / `IT`: qualification certificate(s) PDF
- `ASTROLOGY` / `HOMEOPATHY`: government ID; Homeopathy may optionally add a qualification certificate

```json
{
  "licenseNumber": "MCI-KA-2019-04521",
  "licenseDocKey": "verification/uuid/license.pdf",
  "idProofKey": "verification/uuid/id_proof.pdf"
}
```
**Response 200:** `{ "credentialsUpdatedAt": "..." }` — profile is active immediately; bookability is controlled by `isAcceptingNewClients`.

### GET /consultants/public
Public profile for this instance's single Consultant — bio, category, ratings, published reviews, credential badges. Used by `/book`. Never exposes `payoutAccountDetails`.

---

## 4. Direct Booking (No Discovery)

There is **no** `GET /consultants` search/list endpoint. Clients book via `/book`, which calls `GET /consultants/public` and `GET /consultants/public/availability`.

---

## 5. Availability & Slots

### POST /consultants/me/availability
FR6 — define recurring weekly availability or one-off overrides.

```json
{
  "dayOfWeek": "MONDAY",            // omit if specificDate is set
  "specificDate": null,
  "startTime": "09:00",
  "endTime": "13:00",
  "slotDurationMins": 30,
  "isRecurring": true,
  "bufferBeforeMins": 5,
  "bufferAfterMins": 5,
  "maxBookingsPerSlot": 1
}
```
Consultant timezone is stored on `ConsultantProfile`; all `startTime`/`endTime` are interpreted in it and displayed to clients explicitly zone-labeled (edge case #6). Stored internally in UTC.

### GET /consultants/:id/availability
Returns expanded, bookable open slots for a date range (recurring rules expanded server-side, DST-safe).
```
?dateFrom=2026-07-05&dateTo=2026-07-12
```

### PATCH /consultants/me/availability/:id — block/unblock
Blocking a slot window that already has confirmed Appointments does **not** silently cancel them (edge case #2/#8) — it returns `409 APPOINTMENT_NOT_ACTIONABLE` with a list of `affectedAppointmentIds` and requires calling `POST /appointments/:id/reschedule-request` for each before the block can proceed with `?force=true`.

### DELETE /consultants/me/availability/:id
Removes a future, unbooked slot only.

---

## 6. Appointments (Booking Lifecycle)

### POST /appointments
FR7 — client books an open slot.

```json
{
  "consultantId": "uuid",
  "slotId": "uuid",
  "caseId": "uuid",              // optional: attach to an existing open Case; else a new Case is created
  "mode": "VIDEO_EXTERNAL",       // "IN_PERSON" | "AUDIO" | "VIDEO_EXTERNAL"
  "meetingLink": "https://meet.google.com/xyz"   // required if mode = VIDEO_EXTERNAL, consultant-supplied
}
```

**Response 201:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "caseId": "uuid",
    "status": "REQUESTED",          // or "APPROVED" if consultant has auto-approve on
    "scheduledStart": "2026-07-05T09:00:00+05:30",
    "scheduledEnd": "2026-07-05T09:30:00+05:30",
    "feeAmount": 800,
    "paymentStatus": "UNPAID"
  }
}
```

**Concurrency guarantee (edge case #1):** slot booking is enforced via a DB-level unique constraint on `(slotId, status IN ('REQUESTED','APPROVED'))`, not application-level checks. Losing request receives `409 SLOT_UNAVAILABLE`.

**Business logic:**
1. Validate slot is `OPEN` and in the future
2. Create/attach `Case` (one Case per genuinely distinct matter between the same Client–Consultant pair, per FR/edge case #37 — client selects "new matter" vs. existing case at booking time)
3. Create `Appointment` (`REQUESTED` or `APPROVED` per consultant setting)
4. If `consultantProfile.paymentTiming = PAY_ON_BOOKING`, create Razorpay order (see §11)
5. Notify consultant (FR29)

---

### PATCH /appointments/:id/respond
FR8 — Consultant approves, proposes reschedule, or rejects a `REQUESTED` appointment.

```json
{
  "action": "RESCHEDULE_PROPOSED",  // "APPROVED" | "RESCHEDULE_PROPOSED" | "REJECTED"
  "newSlotId": "uuid",              // required if RESCHEDULE_PROPOSED
  "reason": "Clashing emergency"    // required if REJECTED or RESCHEDULE_PROPOSED
}
```
**Guards:** appointment must currently be `REQUESTED`. Non-`REQUESTED` state → `409 APPOINTMENT_NOT_ACTIONABLE`.

### PATCH /appointments/:id/reschedule-response
FR9 — Client accepts or declines a `RESCHEDULE_PROPOSED` appointment.
```json
{ "action": "ACCEPT" }              // or "DECLINE"
```
Decline sets status to `REJECTED` (client must rebook). If the client does not respond within the configurable auto-expire window, a scheduled job transitions the appointment to `CANCELLED` and notifies both parties (edge case #5).

### PATCH /appointments/:id/cancel
FR10 — Either party cancels an `APPROVED` appointment before the configurable cutoff (default 2h pre-start).
```json
{ "reason": "PLANS_CHANGED", "details": "optional text" }
```
Past the cutoff, cancellation is blocked (`409 APPOINTMENT_NOT_ACTIONABLE`) and the refund policy in §11 applies instead.

### POST /appointments/:id/no-show
System job (or either party) flags an appointment as `NO_SHOW` if neither side calls `POST /interactions/start` within the grace period after `scheduledStart` (edge case #7). Either party may dispute via `POST /appointments/:id/dispute`, resolved by the Consultant or org Admin.

### GET /appointments
List the current user's appointments (Client sees their own; Consultant sees their own).
```
?status=REQUESTED&from=2026-07-01&to=2026-07-31&page=1&limit=20
```

### GET /appointments/:id
Full appointment detail including `case`, `payment`, and `meetingLink` (only visible to the two participants).

---

## 7. Cases

A **Case** is the anchor entity for a Client–Consultant relationship/matter (§6.5). All Interactions, Commitments, Tasks, Documents, and AI activity attach to a `caseId`.

### GET /cases
```
?status=ACTIVE&page=1&limit=20
```
Consultant sees only their own cases; Client sees only their own (FR35).

### GET /cases/:id
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "clientId": "uuid",
    "consultantId": "uuid",
    "category": "MEDICAL",
    "status": "ACTIVE",
    "openedAt": "2026-05-01T00:00:00Z",
    "tags": ["hypertension"],
    "openCommitmentsCount": 1,
    "openTasksCount": 2
  }
}
```

### PATCH /cases/:id/close
```json
{ "closureReason": "Treatment concluded" }
```
**Guard:** blocked with `409 CASE_HAS_OPEN_ITEMS` unless all Commitments/Tasks are resolved or the caller passes `{ "confirmResolve": true }`, which prompts an explicit resolution step per open item (edge case #22).

---

## 8. Interactions (Session Logging)

FR11–16. An Interaction represents a logged session/encounter — may or may not map 1:1 to an Appointment (e.g., an ad-hoc follow-up call).

### POST /interactions/start
```json
{ "caseId": "uuid", "appointmentId": "uuid", "type": "RECORDED_AUDIO" }
```
**Response 201:** `{ "id": "uuid", "status": "IN_PROGRESS" }`

### POST /interactions/:id/consent
Must be recorded **before** audio capture begins if `type = RECORDED_AUDIO` (edge case #11).
```json
{ "consentGiven": true }
```
If `false`, recording is blocked (`400 CONSENT_REQUIRED`) and no audio is persisted; the consultant may continue with `NOTE` only.

### POST /interactions/:id/audio
Uploads recorded audio to a Supabase presigned URL (see §12) and enqueues async Whisper transcription.
```json
{ "audioKey": "interactions/uuid/audio.webm", "durationSeconds": 1840 }
```
- Long recordings (> 1 hour) are chunked client-side; each chunk uploads independently with a progress callback (edge case #14).
- Network/browser failure mid-recording: partial chunks already uploaded are preserved and marked `PARTIAL`; consultant is notified rather than silently losing the recording (edge case #12).
- v1 assumes a single speaker (the consultant) for transcription; multi-speaker audio is not diarized (documented limitation, edge case #15 / PRD open question #5).

**Response 202:** `{ "transcriptStatus": "PENDING" }`

### GET /interactions/:id
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "caseId": "uuid",
    "type": "RECORDED_AUDIO",
    "transcriptStatus": "COMPLETED",
    "transcriptText": "...",
    "transcriptLanguage": "kn",
    "notesText": "<p>Patient reports...</p>",
    "consentGiven": true,
    "visibility": "CONSULTANT_ONLY",
    "occurredAt": "2026-07-05T09:00:00Z"
  }
}
```
`transcriptStatus = FAILED` or a `lowConfidence: true` flag signals the consultant to manually edit; the original audio remains the source of truth and is never overwritten (edge case #13).

### PATCH /interactions/:id
Edit `notesText`, correct a transcript, or set `visibility` (`CONSULTANT_ONLY` | `SHARED_WITH_CLIENT`).

### DELETE /interactions/:id
Soft-delete with a recovery window (edge case #16); hard-deleted after the window expires by a background job. If the Interaction was already used as an AI summary source, the summary is retained but its source is marked `unavailable` rather than retroactively invalidated (edge case #31).

---

## 9. Commitments & Tasks

### POST /commitments
FR17.
```json
{
  "caseId": "uuid",
  "interactionId": "uuid",
  "madeBy": "CONSULTANT",
  "description": "Send revised contract",
  "dueDate": "2026-07-10",
  "priority": "HIGH"
}
```

### PATCH /commitments/:id
```json
{ "status": "FULFILLED" }
```
Marking `FULFILLED` is logged with actor + timestamp as the system of record; if the client later disputes it, there is no built-in arbitration in v1 — the audit trail is authoritative (edge case #19).

A scheduled job flips overdue `PENDING`/`IN_PROGRESS` commitments to `MISSED` and fires a notification to the consultant (and, transparently, to the client) (edge case #18, FR19).

### POST /tasks
FR18.
```json
{
  "caseId": "uuid",
  "interactionId": "uuid",
  "assignedTo": "CLIENT",
  "title": "Get blood test done",
  "dueDate": "2026-07-12"
}
```
Tasks assigned to a `CLIENT` fall back to SMS/WhatsApp/email if the client doesn't engage in-app (edge case #20, FR29/30).

### PATCH /tasks/:id — update status / DELETE /tasks/:id — cancel

### GET /dashboard/deadlines
FR20. Cross-client widget for the consultant.
```
?status=OVERDUE&sortBy=dueDate&page=1&limit=20
```
```json
{
  "success": true,
  "data": [
    { "id": "uuid", "kind": "TASK", "caseId": "uuid", "clientName": "Priya S.", "title": "Get blood test done", "dueDate": "2026-07-12", "status": "OVERDUE" }
  ]
}
```
No automatic dedup of duplicate tasks/commitments across sessions in v1; the UI surfaces same-`caseId` + similar-`title` items adjacently for manual review (edge case #21).

---

## 10. Documents

### POST /documents
FR15/16. Requires a presigned upload key obtained from `POST /uploads/presigned-url` (§13).
```json
{
  "caseId": "uuid",
  "interactionId": "uuid",
  "fileKey": "documents/uuid/report.pdf",
  "fileName": "blood_report.pdf",
  "category": "REPORT",
  "accessLevel": "PRIVATE_TO_CONSULTANT",
  "previousVersionId": null           // set when re-uploading a corrected file
}
```
**Guards:**
- File type allow-list + size limit enforced before acceptance; a malware scan step runs async — `scanStatus` starts `PENDING` and the file is not retrievable until `CLEAN` (edge case #23). `INFECTED` results in `422 FILE_REJECTED`.
- Re-uploading a corrected file creates a **new version** linked via `previousVersionId`; the original is retained, never overwritten (edge case #24).

### PATCH /documents/:id/access
```json
{ "accessLevel": "SHARED_WITH_CLIENT", "confirm": true }
```
`confirm: true` is required to flip a document to client-visible (edge case #25). Un-sharing (`PRIVATE_TO_CONSULTANT`) is supported going forward but cannot retract content the client has already viewed.

### GET /cases/:id/documents
```
?category=REPORT&page=1&limit=20
```
Clients only ever see documents with `accessLevel = SHARED_WITH_CLIENT`; enforced server-side, not just in the UI.

---

## 11. Payments

### POST /payments/orders
FR31. Creates a Razorpay order for an appointment fee.
```json
{ "appointmentId": "uuid" }
```
**Response 201:** `{ "razorpayOrderId": "order_xyz", "amount": 800, "currency": "INR" }`
Timing (pay-on-booking vs. pay-after-session) is controlled by `ConsultantProfile.paymentTiming` (`PAY_ON_BOOKING` | `PAY_AFTER_SESSION`).

### POST /payments/webhook
Razorpay server-to-server webhook (signature-verified, not user-authenticated). Updates `Transaction.status` and `Appointment.paymentStatus`.
A **reconciliation job** polls Razorpay for orders stuck `CREATED` beyond a threshold to correct any "paid but shows unpaid" drift from missed webhooks (edge case #32).

### POST /payments/:id/refund
Consultant/org-Admin-mediated refund per policy: full refund pre-session-start, no refund once the session has started, unless Consultant or org Admin overrides for a genuine dispute (edge case #33). Partial refunds (e.g., consultant joined late) are Consultant/org-Admin-mediated only in v1, not automated (edge case #35).
```json
{ "refundAmount": 800, "refundReason": "Consultant no-show" }
```

### GET /consultants/me/payouts
Consultant payout ledger (gross fee − platform commission). If `payoutAccountDetails` are missing/invalid, payout is blocked and the consultant notified; the transaction record is retained, not lost (edge case #36).

### GET /payments/:id/invoice
Auto-generated invoice/receipt PDF URL, generated on successful payment (FR34).

> **Scope note:** Razorpay is India-only; international clients/consultants are out of scope for payments in v1 (edge case #34).

---

## 12. Uploads & Realtime Events

### POST /uploads/presigned-url
```json
{
  "fileName": "report.pdf",
  "fileType": "application/pdf",
  "purpose": "DOCUMENT" // "DOCUMENT" | "AUDIO" | "PROFILE_PHOTO" | "VERIFICATION_DOC"
}
```
```json
{
  "success": true,
  "data": { "uploadUrl": "https://<supabase-project>.supabase.co/storage/v1/...", "fileKey": "documents/uuid/report.pdf", "expiresIn": 300 }
}
```

### WebSocket Connection
```
wss://api.ayushman.in/realtime?token=<access_token>
```

### Server → Client Events

| Event | Payload | Description |
|-------|---------|--------------|
| `transcript:status` | `{ interactionId, status }` | Whisper job progressed (`PROCESSING`/`COMPLETED`/`FAILED`) |
| `appointment:status` | `{ appointmentId, status }` | Booking lifecycle change |
| `commitment:due_soon` \| `commitment:missed` | `{ commitmentId, caseId }` | Deadline notification trigger |
| `task:due_soon` \| `task:overdue` | `{ taskId, caseId }` | Deadline notification trigger |
| `notification:new` | `{ notification }` | Generic in-app notification |
| `payment:status` | `{ transactionId, status }` | Razorpay webhook processed |
| `error` | `{ code, message }` | Socket-level error |

Realtime channels are authorized per-connection using the same case-scoping rules as REST (§1.5); a socket cannot subscribe to a `caseId` the JWT's user isn't a participant on.

---

## 13. Notifications

### GET /notifications
```
?isRead=false&channel=IN_APP&page=1&limit=20
```
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "type": "TASK_DUE",
      "channel": "IN_APP",
      "relatedEntityType": "TASK",
      "relatedEntityId": "uuid",
      "status": "SENT",
      "createdAt": "..."
    }
  ],
  "meta": { "total": 15, "unreadCount": 3 }
}
```
Types include: `APPOINTMENT_REQUEST`, `APPOINTMENT_APPROVED`, `RESCHEDULE`, `COMMITMENT_DUE`, `TASK_DUE`, `TASK_OVERDUE`, `PAYMENT_RECEIVED`, `DOCUMENT_UPLOADED`.

### PATCH /notifications/:id/read · POST /notifications/read-all

### PATCH /notifications/preferences
FR30 — per-channel opt-in/out.
```json
{ "TASK_DUE": ["IN_APP", "SMS"], "PAYMENT_RECEIVED": ["EMAIL"] }
```

---

## 14. Reviews

### POST /reviews
```json
{ "appointmentId": "uuid", "rating": 5, "comment": "Very thorough and punctual." }
```
**Guards:** appointment must be `COMPLETED`; caller is a participant; one review per appointment (`409 DUPLICATE_REVIEW`).

### GET /consultants/:id/reviews
Public, moderated (`isVisible = true`) reviews only.
```
?page=1&limit=20
```

---

## 15. Timeline

### GET /cases/:id/timeline
Unified chronological feed of Appointments, Interactions, Commitments, Tasks, and Documents for a Case.

**Query Params:**
```
?type=INTERACTION,COMMITMENT&from=2026-05-01&to=2026-07-01&q=dosage&page=1&limit=30
```
`q` performs full-text search against `notesText`/`transcriptText` in addition to titles.

**Response 200:**
```json
{
  "success": true,
  "data": [
    { "kind": "APPOINTMENT", "id": "uuid", "occurredAt": "...", "summary": "Consultation approved" },
    { "kind": "INTERACTION", "id": "uuid", "occurredAt": "...", "summary": "Recorded session, 30 min" },
    { "kind": "COMMITMENT", "id": "uuid", "occurredAt": "...", "summary": "Send revised contract — due 2026-07-10" },
    { "kind": "DOCUMENT", "id": "uuid", "occurredAt": "...", "summary": "blood_report.pdf uploaded" }
  ],
  "meta": { "page": 1, "limit": 30, "total": 42, "totalPages": 2 }
}
```
Lazy-loaded/paginated to remain performant for clients with hundreds of interactions (NFR: Performance).

---

## 16. Org Admin (Staff)

Org Admin endpoints are scoped to **this instance's single Consultant practice**. There is no platform-wide verification queue or cross-tenant moderation.

Consultant-only:
### POST /org/admins/invite
```json
{ "email": "staff@example.com", "displayName": "Reception" }
```

### DELETE /org/admins/:userId
Revoke an org Admin's access.

Consultant or org Admin:
### GET /org/disputes · PATCH /org/disputes/:id/resolve
Mediate payment disputes and no-show claims (FR36).

### GET /org/cases/:id/escalated-view
Grants time-boxed, justified access to a Case's sensitive content during an active dispute. **Every read is written to `AuditLog`** — no unrestricted Admin visibility by default (edge case #41, FR36).
```json
{ "justification": "Payment dispute #4521" }
```

### GET /org/audit-log
Paginated audit trail for this org.

### GET /org/stats
```json
{
  "success": true,
  "data": {
    "clients": { "total": 420, "activeThisMonth": 38 },
    "appointments": { "total": 1280, "completedThisMonth": 94 },
    "revenue": { "allTime": 385000, "thisMonth": 21000 }
  }
}
```

### Data deletion & retention
`POST /org/clients/:id/deletion-request` — implements the right-to-be-forgotten vs. legal-retention conflict (edge case #40): client-identifying fields are anonymized while clinically/legally mandated records are retained per category policy, rather than a hard delete. Consultant-only.

---

## 17. Data Models (TypeScript)

```typescript
export type Role = 'CLIENT' | 'CONSULTANT' | 'ADMIN';
export type ConsultantCategory = 'MEDICAL' | 'LEGAL' | 'IT' | 'PHYSIOTHERAPY' | 'HOMEOPATHY' | 'ASTROLOGY';

export interface User {
  id: string;
  email: string;
  phone: string;
  role: Role;
  isVerified: boolean;
  isActive: boolean;
  lastLoginAt: string | null;
  createdAt: string;
}

export interface ClientProfile {
  id: string;
  userId: string;
  fullName: string;
  dob: string | null;
  gender: string | null;
  preferredLanguage: string;
  timezone: string;
  profilePhotoUrl: string | null;
  isMinor: boolean;
}

export interface GuardianLink {
  id: string;
  minorClientId: string;
  guardianUserId: string;
  relationship: string;
  consentGiven: boolean;
  consentDocumentUrl: string | null;
  verifiedAt: string | null;
  verifiedBy: string | null;
}

export interface ConsultantProfile {
  id: string;
  userId: string;
  fullName: string;
  category: ConsultantCategory;
  subSpecialization: string | null;
  bio: string | null;
  qualifications: string[];
  licenseNumber: string | null;
  licenseDocUrl: string | null;
  verificationStatus: 'PENDING' | 'VERIFIED' | 'REJECTED';
  consultationFee: number;
  currency: 'INR';
  languagesSpoken: string[];
  timezone: string;
  ratingAvg: number;
  ratingCount: number;
  isAcceptingNewClients: boolean;
}

export interface Slot {
  id: string;
  consultantId: string;
  dayOfWeek: string | null;
  specificDate: string | null;
  startTime: string;
  endTime: string;
  slotDurationMins: number;
  isRecurring: boolean;
  status: 'OPEN' | 'BOOKED' | 'BLOCKED';
}

export interface Case {
  id: string;
  clientId: string;
  consultantId: string;
  category: ConsultantCategory;
  status: 'ACTIVE' | 'CLOSED' | 'ARCHIVED';
  openedAt: string;
  closedAt: string | null;
  tags: string[];
}

export type AppointmentStatus =
  'REQUESTED' | 'APPROVED' | 'RESCHEDULE_PROPOSED' | 'RESCHEDULED' |
  'REJECTED' | 'CANCELLED' | 'COMPLETED' | 'NO_SHOW';

export interface Appointment {
  id: string;
  caseId: string;
  clientId: string;
  consultantId: string;
  slotId: string | null;
  scheduledStart: string;
  scheduledEnd: string;
  status: AppointmentStatus;
  mode: 'IN_PERSON' | 'AUDIO' | 'VIDEO_EXTERNAL';
  meetingLink: string | null;
  feeAmount: number;
  paymentStatus: 'UNPAID' | 'PAID' | 'REFUNDED' | 'PARTIAL';
}

export interface Interaction {
  id: string;
  caseId: string;
  appointmentId: string | null;
  type: 'RECORDED_AUDIO' | 'NOTE' | 'FOLLOW_UP_CALL' | 'MESSAGE';
  transcriptStatus: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED' | null;
  transcriptText: string | null;
  notesText: string | null;
  consentGiven: boolean;
  visibility: 'CONSULTANT_ONLY' | 'SHARED_WITH_CLIENT';
  occurredAt: string;
}

export interface Commitment {
  id: string;
  caseId: string;
  interactionId: string | null;
  madeBy: 'CONSULTANT' | 'CLIENT';
  description: string;
  dueDate: string;
  status: 'PENDING' | 'IN_PROGRESS' | 'FULFILLED' | 'MISSED' | 'CANCELLED';
  priority: 'LOW' | 'MEDIUM' | 'HIGH';
}

export interface Task {
  id: string;
  caseId: string;
  interactionId: string | null;
  assignedTo: 'CLIENT' | 'CONSULTANT';
  title: string;
  dueDate: string;
  status: 'OPEN' | 'IN_PROGRESS' | 'DONE' | 'OVERDUE' | 'CANCELLED';
}

export interface DocumentFile {
  id: string;
  caseId: string;
  interactionId: string | null;
  fileUrl: string;
  fileName: string;
  category: 'PRESCRIPTION' | 'REPORT' | 'CONTRACT' | 'ID_PROOF' | 'OTHER';
  version: number;
  previousVersionId: string | null;
  scanStatus: 'PENDING' | 'CLEAN' | 'INFECTED';
  accessLevel: 'PRIVATE_TO_CONSULTANT' | 'SHARED_WITH_CLIENT';
}

export interface Transaction {
  id: string;
  appointmentId: string;
  razorpayOrderId: string;
  razorpayPaymentId: string | null;
  amount: number;
  currency: 'INR';
  status: 'CREATED' | 'SUCCESS' | 'FAILED' | 'REFUNDED' | 'PARTIALLY_REFUNDED';
  platformFee: number;
  consultantPayoutAmount: number;
}

export interface Review {
  id: string;
  appointmentId: string;
  rating: number;
  comment: string | null;
  isVisible: boolean;
}

export interface Notification {
  id: string;
  userId: string;
  type: string;
  relatedEntityType: string;
  relatedEntityId: string;
  channel: 'IN_APP' | 'EMAIL' | 'SMS' | 'PUSH';
  status: 'PENDING' | 'SENT' | 'FAILED' | 'READ';
}

export interface AuditLog {
  id: string;
  actorUserId: string;
  action: string;
  entityType: string;
  entityId: string;
  ipAddress: string;
  timestamp: string;
  metadata: Record<string, unknown>;
}

// API response wrappers
export interface ApiResponse<T> { success: boolean; data: T; }
export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  meta: { page: number; limit: number; total: number; totalPages: number };
}
```

---

## 18. Non-Functional Notes (informing the above design)

- **Row-level security** (Supabase/Postgres) mirrors the API-level scoping in §1.5 as defense in depth.
- **Encryption**: TLS in transit; S3 SSE at rest; column-level encryption for highly sensitive fields (e.g., `transcriptText`, `notesText` on Medical/Legal cases).
- **Async by default**: transcription and payout batching run as background jobs (queue-backed), never blocking the request/response cycle — statuses are polled via REST or pushed via WebSocket (§12).
- **Auditability**: every org Admin read of clinical/legal content during disputes, and every deletion/anonymization action, is written to `AuditLog`.
- **Out of scope for this API** (v1): consultant discovery/search/list, platform Admin verification queue, AI assistant/RAG, in-platform video calling (external links only, per open question #1), insurance claims integration, non-Razorpay payment rails, multi-consultant clinic (multiple Consultant identities per instance).
