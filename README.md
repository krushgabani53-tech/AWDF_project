# Slate Workspace - Enterprise Productivity & Governance Platform

A modular full-stack enterprise workspace platform built with React JS, Vite, Node.js, Express.js, and PostgreSQL.

---

## 🚀 Features & Architecture

The application is structured into six integrated modules:

1. **Personal Workspace (My Tasks):**
   - Full CRUD task management with ongoing/completed counters, priority tags, and combined search & filters.
   - **Protocol 5 Governance:** Immutable completion enforcement—finalized tasks cannot be modified, edited, or deleted.

2. **Projects Portfolio:**
   - Enterprise project directory with status tracking, progress bars, lead assignees, and technology badges.
   - Auto-generated project codes (e.g., `ENG-2026-XX`, `UI-2026-XX`, `NOTIF-2026-XX`).

3. **Enterprise Support & Contact Desk:**
   - Ticket dispatch system with strict input validation and auto-generated unique reference numbers (`TKT-2026-XXXXXX`).
   - Secure reference inquiry with verified email challenge protection.
   - Dynamic SMTP telemetry status indicator.

4. **Workspace Policies & Compliance:**
   - Real-time documentation of Protocol 5 (Non-Reversible Task Completion), Role-Based Access Control matrix, and Audit Logging governance.

5. **Authentication & Session Security:**
   - Secure user registration and login with bcrypt password hashing and JWT stored in **HTTP-only cookies** (`token`).
   - Brute-force rate limiting on authentication attempts.
   - Strict public registration constraint: all public users are registered with the standard `USER` role.

6. **Admin Dashboard & Role-Based Access Control (RBAC):**
   - Restricted to `ADMIN` accounts.
   - Overview metrics, real-time activity stream, and user directory management with role promotion/demotion and self-demotion prevention.
   - Complete support ticket viewer and searchable/filterable system audit trail.

---

## 🛠 Tech Stack

- **Frontend:** React 19, Vite 8, React Router DOM v7, Lucide React, Axios (with code-splitting and Vite reverse proxy).
- **Backend:** Node.js, Express.js, `pg` (node-postgres), `bcryptjs`, `jsonwebtoken`, `cookie-parser`, `cors`, `dotenv`.
- **Database:** PostgreSQL.

---

## 🏁 Getting Started

### 1. Prerequisites
- [Node.js](https://nodejs.org/) (v18+)
- [PostgreSQL](https://www.postgresql.org/) (v14+) running locally on port 5432

### 2. Database Setup
Create a PostgreSQL database named `slate_workspace`:
```sql
CREATE DATABASE slate_workspace;
```

Configure backend environment variables in `server/.env`:
```env
PORT=5000
DATABASE_URL=postgresql://postgres:password@localhost:5432/slate_workspace
CLIENT_URL=http://localhost:5173
JWT_SECRET=slate_super_secret_jwt_key_2026_enterprise_grade
JWT_EXPIRES_IN=7d
COOKIE_SECRET=slate_cookie_secret_key_2026
NODE_ENV=development
```

Run database migrations to initialize tables, indexes, and seed accounts:
```bash
node server/config/migrateAll.js
node server/config/migratePhase6.js
```

### 3. Install Dependencies
```bash
# Frontend dependencies
npm install

# Backend dependencies
cd server
npm install
cd ..
```

### 4. Run Development Servers
Start the backend server:
```bash
cd server
npm run dev
# Running on http://localhost:5000
```

In a separate terminal, start the frontend client:
```bash
npm run dev
# Running on http://localhost:5173
```

---

## 🧪 Automated Test Verification

The repository includes comprehensive automated test suites covering all modules:

```bash
# Run all test suites
node server/test-tasks.js         # Phase 3: My Tasks (13 tests)
node server/test-projects.js      # Phase 4: Projects (16 tests)
node server/test-support.js       # Phase 5: Support Desk (12 tests)
node server/test-auth-phase6.js   # Phase 6: Auth, RBAC & Admin (42 tests)
```
*Total: 83 automated test cases passing.*

---

## 👥 Default Accounts

| Role | Email | Password | Access Level |
| :--- | :--- | :--- | :--- |
| **Administrator** | `krushgabani53@gmail.com` | `Admin123!` | Full workspace, Admin Dashboard, User Directory, Audit Logs |
| **Standard User** | `standard@example.com` | `Standard123!` | Personal Workspace (isolated tasks), Projects, Support Desk |

---

## 📄 License
ISC
