# FIC – Forge India Connect | Banking Placement CRM

## Quick Start

### Backend
```bash
cd backend
npm install
npm run seed      # First-time only: seeds banks, programs, vendors & super admin
npm run dev       # Starts on http://localhost:5000
```

### Frontend
```bash
cd frontend
npm install
npm run dev       # Starts on http://localhost:5173
```

---

## Default Login Credentials

| Field    | Value                    |
|----------|--------------------------|
| Email    | admin@forgeindia.com     |
| Password | FIC@Admin2026            |
| Role     | Super Admin (MD)         |

---

## Project Structure

```
FIC_Vendor-Tracking-crm/
├── backend/
│   ├── src/
│   │   ├── config/          # DB connection, environment config
│   │   ├── controllers/     # Route handlers
│   │   ├── middleware/      # Auth, RBAC, rate limiting, upload, errors
│   │   ├── models/          # Mongoose schemas
│   │   ├── routes/          # Express routers
│   │   ├── scripts/         # Database seed script
│   │   └── utils/           # Response helpers, ID generator, audit logger
│   ├── uploads/resumes/     # Secure file storage (not public)
│   └── .env                 # Environment variables
└── frontend/
    └── src/
        ├── api/             # API client & endpoint definitions
        ├── components/      # Shared UI components & layout
        ├── contexts/        # Auth & Toast contexts
        ├── pages/           # Feature pages
        ├── types/           # TypeScript types
        └── utils/           # Status helpers & formatters
```

---

## User Roles

| Role         | Access                                                              |
|--------------|---------------------------------------------------------------------|
| SUPER_ADMIN  | Full access: all candidates, users, masters, reports, audit logs    |
| ADMIN        | Candidates, masters, programs, payments, reports                    |
| HR_EXECUTIVE | Register candidates, update interviews, view assigned candidates    |
| ACCOUNTS     | View & record payments, verify transactions, payment reports        |

---

## API Endpoints

| Method | Endpoint                                      | Description                    |
|--------|-----------------------------------------------|--------------------------------|
| POST   | /api/auth/login                               | Login                          |
| POST   | /api/auth/logout                              | Logout                         |
| GET    | /api/auth/me                                  | Get current user               |
| GET    | /api/applications                             | List applications (filterable) |
| POST   | /api/applications/register                    | Register candidate + app       |
| GET    | /api/applications/:id                         | Application detail             |
| PATCH  | /api/applications/:id/status                  | Update overall status          |
| PATCH  | /api/applications/:id/interview/:roundId      | Update interview round         |
| POST   | /api/applications/:id/payment                 | Record payment                 |
| PATCH  | /api/applications/:id/loan                    | Update loan status             |
| PATCH  | /api/applications/:id/campus                  | Update campus status           |
| GET    | /api/banks                                    | List banks                     |
| GET    | /api/programs                                 | List programs                  |
| GET    | /api/vendors                                  | List vendors                   |
| GET    | /api/users/hr-references                      | HR dropdown list               |
| GET    | /api/reports/interview-status                 | Interview status report        |
| GET    | /api/reports/enrollment-fee                   | Enrollment fee report          |
| GET    | /api/reports/interview-status/export          | Export as Excel                |
| GET    | /api/reports/enrollment-fee/export            | Export as Excel                |
| GET    | /api/audit-logs                               | Audit logs (admin only)        |

---

## Key Business Rules Implemented

1. **Full Payment Route** — When ROUTE_B_FULL_PAYMENT is selected:
   - `enrollmentFeeAmount` = 0, `paymentStatus` = "Not Applicable"
   - `isLoanRequired` = false, `loanStatus` = "Not Applicable"
   - No Manipal enrollment record is created

2. **Dynamic Interview Rounds** — Rounds are configured per Program. The tracking table generates columns dynamically from live program config.

3. **Interview History** — Every reschedule preserves the previous attempt in an `attempts[]` array. No history is ever overwritten.

4. **Duplicate Detection** — Email + mobile duplicate checks before registration with admin-override option.

5. **Unique Application Numbers** — Format: `FIC-YYYYMMDD-XXXXXX` with collision retry logic.

6. **Backend RBAC** — Every API route verifies the JWT and role server-side. Frontend button hiding is cosmetic only.

---

## Security Features

- JWT (8-hour expiry) + HttpOnly cookies
- Bcrypt password hashing (12 rounds)
- Login rate limiting (10 attempts / 15 min window)
- Account lockout after 5 failed attempts (15 min)
- Secure password reset with SHA-256 hashed tokens (1-hour TTL)
- Helmet security headers
- CORS restricted to frontend origin
- File uploads: validated MIME type + extension, server-generated filenames, 5MB limit
- Complete audit log trail for all mutations
- NoSQL injection prevention via Mongoose strict mode
- Input sanitisation on all API endpoints

---

## MongoDB Collections

- `users` — Employee accounts
- `candidates` — Candidate master profiles
- `applications` — One per program application (embeds interview rounds)
- `banks` — Bank master
- `programs` — Program configs with dynamic interview rounds
- `vendors` — Vendor master
- `payments` — Enrollment fee & transaction records
- `loanstatuses` — Loan status per application
- `campusstatuses` — Campus status per application
- `activitylogs` — Immutable audit trail
- `passwordresettokens` — Time-limited reset tokens (TTL index)

