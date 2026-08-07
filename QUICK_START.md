# Quick Start Guide - Ayushman MVP

Get Ayushman running in 5 minutes!

## Prerequisites
- Node.js 18+ installed
- pnpm installed (`npm install -g pnpm`)
- A Supabase account (free tier works)

## 30-Second Setup

1. **Install dependencies** (1 min)
```bash
cd /path/to/ayushman
pnpm install
```

2. **Add environment variables** (1 min)
   - Create `apps/web/.env.local`:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
   API_URL=http://localhost:3001
   ```
   - Create `apps/api/.env`:
   ```env
   DATABASE_URL=postgresql://postgres:password@localhost:5432/ayushman
   JWT_SECRET=your_generated_secret
   NODE_ENV=development
   PORT=3001
   ```

3. **Start servers** (1 min)
   ```bash
   # Terminal 1
   cd apps/web && pnpm dev
   
   # Terminal 2
   cd apps/api && pnpm dev
   ```

4. **Open in browser**
   - Frontend: http://localhost:3000
   - Backend: http://localhost:3001

5. **Start testing**
   - Click "Get Started"
   - Register as a consultant
   - Explore the dashboard

## What You Can Do Right Now

### As a Consultant:
- ✅ Register and create account
- ✅ Complete onboarding (4 steps)
- ✅ View professional dashboard
- ✅ Edit consultant profile
- ✅ Manage availability schedule
- ✅ View appointments (empty for now)
- ✅ Manage account settings
- ✅ Logout

### As a Client:
- ✅ Register and create account
- ✅ View client dashboard
- ✅ Browse available consultants (mock data)
- ✅ Filter consultants by specialty
- ✅ View consultant details
- ✅ View appointments (empty for now)
- ✅ Logout

## Test Accounts (After Setup)

After you register, you can:
- Register multiple accounts (different emails)
- Test switching between consultant and client roles
- Navigate between different user dashboards

### Demo Consultants (Already Loaded)
When browsing consultants:
- Dr. Sarah Johnson - Licensed Clinical Psychologist ($150/hr)
- Prof. Michael Chen - Business Strategy Consultant ($200/hr)

## File Structure to Know

```
ayushman/
├── apps/web/                    # Frontend (Next.js)
│   ├── app/page.tsx             # Landing page
│   ├── app/auth/                # Login & Register
│   ├── app/dashboard/           # User dashboards
│   ├── app/browse-consultants/  # Consultant browsing
│   └── lib/auth/                # Authentication logic
├── apps/api/                    # Backend (Express)
│   ├── src/routes/              # API endpoints
│   ├── src/middleware/          # Auth & errors
│   └── prisma/                  # Database schema
├── README.md                    # Full documentation
├── ENV_SETUP.md                # Detailed env guide
└── IMPLEMENTATION_SUMMARY.md    # What was built
```

## Common Issues & Fixes

### Error: "Can't find module '@ayushman/shared'"
```bash
# Fix: Install from root directory
cd /path/to/ayushman
pnpm install
```

### Error: "Port 3000 already in use"
```bash
# Kill process on port 3000
lsof -ti:3000 | xargs kill -9
# Or change port in package.json
```

### Error: "DATABASE_URL is missing"
```bash
# Make sure apps/api/.env has DATABASE_URL
cat apps/api/.env | grep DATABASE_URL
```

### Frontend loads but says "errors"
- Check that API_URL in `.env.local` matches backend port
- Verify backend is running on correct port

## Next Development Tasks

Once you're comfortable with the MVP:

1. **Connect Real Database**
   - Set up Supabase project
   - Run `pnpm prisma db push` to migrate schema
   - Update DATABASE_URL

2. **Implement Booking Flow**
   - Create booking form in `/app/consultants/[id]/book`
   - Connect to `/api/appointments` endpoint
   - Add payment checkout

3. **Add Notifications**
   - Send email on booking
   - Send reminders 24 hours before
   - Send review request after session

4. **Deploy**
   - Push to GitHub
   - Deploy frontend to Vercel
   - Deploy backend to Railway/Heroku

## Key Features Implemented

### Authentication ✅
- Registration (consultant & client)
- Login/logout
- JWT tokens
- Protected routes

### Consultant Features ✅
- Onboarding wizard
- Profile management
- Availability scheduling
- Appointment viewing
- Settings/preferences

### Client Features ✅
- Dashboard
- Consultant browsing & filtering
- Appointment viewing
- Search functionality

### UI/UX ✅
- Responsive design (mobile-friendly)
- Dark mode support
- Professional styling
- Accessible components

## Features Not Yet Implemented

- Actual appointment booking
- Video meeting integration
- Payment processing
- Email notifications
- Review submissions
- Consultant credentials upload
- Real-time notifications

## Helpful Commands

```bash
# From root directory:

# Install all dependencies
pnpm install

# Start frontend dev server
cd apps/web && pnpm dev

# Start backend dev server
cd apps/api && pnpm dev

# View database in GUI
cd apps/api && pnpm prisma studio

# Format code
pnpm format

# Type check
pnpm type-check

# Run linter
pnpm lint
```

## API Endpoints Ready to Use

```
POST   /api/auth/register       → Register user
POST   /api/auth/login          → Login user
POST   /api/auth/refresh        → Refresh token

GET    /api/consultants         → List consultants
GET    /api/consultants/:id     → Get consultant details
GET    /api/consultants/:id/availability
GET    /api/consultants/:id/credentials
GET    /api/consultants/:id/reviews

GET    /api/appointments        → Get user appointments (protected)
POST   /api/appointments        → Create appointment (protected)
PUT    /api/appointments/:id    → Update appointment (protected)
POST   /api/appointments/:id/cancel

GET    /api/availability/:consultantId
POST   /api/availability        → Add availability (protected)
POST   /api/availability/:id/blackout

GET    /api/clients/profile     → Get client profile (protected)
GET    /api/clients/appointments
POST   /api/clients/reviews     → Submit review (protected)
```

## Database Tables Available

- organizations, users, user_roles
- consultant_profiles, consultant_credentials
- client_profiles
- availability_windows, blackout_dates
- appointments, session_logs
- payments, reviews, notifications

## Testing the API with Postman/Insomnia

1. **Register & get token**
   - POST to `http://localhost:3001/api/auth/register`
   - Body: `{ email, password, firstName, lastName, userType }`
   - Save the returned `token`

2. **Use token for protected routes**
   - Add header: `Authorization: Bearer <token>`
   - Call `/api/appointments` or other protected routes

## Need More Help?

- **README.md** - Full documentation
- **ENV_SETUP.md** - Environment setup details
- **IMPLEMENTATION_SUMMARY.md** - What's been built
- **Code comments** - Throughout the codebase

---

**You're all set!** 🚀

Start with http://localhost:3000 and explore the application.
Happy coding!
