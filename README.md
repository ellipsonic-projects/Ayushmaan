# Ayushman - Professional Consultation Platform

A comprehensive multi-tenant consultation booking platform connecting verified professionals with clients seeking confidential services.

## Project Overview

Ayushman is building a secure, verified professional services marketplace where consultants (therapists, business advisors, coaches, etc.) can offer time-based consultations to clients. The platform includes:

- **Multi-tenant Architecture**: Support for multiple organizations and practices
- **Role-based Access**: Consultant, client, and admin roles with distinct permissions
- **Secure Bookings**: Availability management, appointment scheduling, and session logging
- **Payment Processing**: Integration with Stripe and Razorpay
- **Credential Verification**: Document upload and verification system
- **Review & Rating System**: Client feedback and consultant ratings
- **Real-time Notifications**: Appointment reminders and status updates

## Tech Stack

### Monorepo Structure
```
├── apps/
│   ├── web/              # Next.js 16 frontend application
│   ├── api/              # Express.js backend API
│   └── services/         # Microservices (future)
├── packages/
│   ├── shared/           # Shared types, constants, utilities
│   └── config/           # Shared configuration
└── turbo.json            # Turborepo configuration
```

### Technology Choices

**Frontend (apps/web)**
- Next.js 16 (App Router)
- React 19
- TypeScript
- Tailwind CSS v4
- Lucide React (icons)
- SWR (data fetching)
- Zod (validation)
- Context API (state management)

**Backend (apps/api)**
- Express.js
- TypeScript
- Prisma ORM
- PostgreSQL (Supabase)
- JWT authentication
- bcryptjs (password hashing)
- Node-cron (scheduled tasks)

**Infrastructure**
- Supabase (PostgreSQL, Auth, Storage)
- Vercel (Frontend hosting)
- Docker (containerization)
- GitHub Actions (CI/CD)

## Project Structure

### Phase 0: Foundation (COMPLETED)
- ✅ Monorepo setup with Turborepo
- ✅ Shared types and utilities package
- ✅ Database schema and migrations
- ✅ Core API infrastructure
- ✅ Authentication API routes

### Phase 1: Core MVP (IN PROGRESS)

#### 1. Authentication & Onboarding
- ✅ User registration (consultant & client)
- ✅ Login/logout
- ✅ AuthContext for state management
- ✅ Consultant onboarding flow (4 steps)
- ⏳ Email verification
- ⏳ Password reset

#### 2. Consultant Features
- ✅ Dashboard with overview
- ✅ Profile management page
- ✅ Availability management interface
- ✅ Appointments list
- ✅ Settings and account management
- ⏳ Credential upload & verification
- ⏳ Rating and reviews management
- ⏳ Earnings tracking

#### 3. Client Features
- ✅ Dashboard with overview
- ✅ Browse consultants page
- ✅ Consultant filtering and search
- ✅ View appointments
- ⏳ Booking flow
- ⏳ Session join/leave
- ⏳ Review submission
- ⏳ Payment checkout

#### 4. Appointment Management
- ⏳ Book appointment
- ⏳ Appointment confirmation
- ⏳ Session logging
- ⏳ Meeting link generation (Zoom/Google Meet)
- ⏳ No-show handling
- ⏳ Rescheduling

## Getting Started

### Prerequisites
- Node.js 18+
- pnpm (or npm/yarn)
- PostgreSQL database (Supabase)
- Git

### Environment Setup

1. **Clone the repository**
```bash
git clone <repo-url>
cd ayushman
```

2. **Install dependencies**
```bash
pnpm install
```

3. **Configure environment variables**

Create `.env.local` in `/apps/web/`:
```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
API_URL=http://localhost:3001
```

Create `.env` in `/apps/api/`:
```env
DATABASE_URL=postgresql://user:password@localhost:5432/ayushman
JWT_SECRET=your-jwt-secret-key
NODE_ENV=development
PORT=3001
```

### Running Locally

**Terminal 1 - Frontend:**
```bash
cd apps/web
pnpm dev
```
Frontend runs on `http://localhost:3000`

**Terminal 2 - Backend:**
```bash
cd apps/api
pnpm dev
```
API runs on `http://localhost:3001`

### Database Setup

1. Create a PostgreSQL database
2. Run migrations:
```bash
cd apps/api
pnpm db:push
```

3. Seed demo data (optional):
```bash
pnpm db:seed
```

## API Documentation

### Authentication Routes
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - User login
- `POST /api/auth/refresh` - Refresh JWT token

### Consultant Routes
- `GET /api/consultants` - List public consultant profiles
- `GET /api/consultants/:id` - Get consultant by ID
- `GET /api/consultants/:id/availability` - Get consultant availability
- `GET /api/consultants/:id/credentials` - Get consultant credentials
- `GET /api/consultants/:id/reviews` - Get consultant reviews

### Appointment Routes (Protected)
- `GET /api/appointments` - Get user's appointments
- `POST /api/appointments` - Create new appointment
- `GET /api/appointments/:id` - Get appointment details
- `PUT /api/appointments/:id` - Update appointment
- `POST /api/appointments/:id/cancel` - Cancel appointment
- `GET /api/appointments/:id/sessions` - Get session logs

### Availability Routes (Protected)
- `GET /api/availability/:consultantId` - Get availability windows
- `POST /api/availability` - Create availability window
- `DELETE /api/availability/:id` - Delete availability window
- `GET /api/availability/:consultantId/blackout` - Get blackout dates
- `POST /api/availability/:consultantId/blackout` - Add blackout date
- `POST /api/availability/:consultantId/slots` - Get available slots

## Database Schema

See `/apps/api/prisma/migrations/001_initial_schema.sql` for the complete schema.

**Key Tables:**
- `organizations` - Tenant information
- `users` - User accounts
- `user_roles` - User roles per organization
- `consultant_profiles` - Consultant details
- `consultant_credentials` - Credentials and certifications
- `client_profiles` - Client information
- `availability_windows` - Consultant availability
- `blackout_dates` - Time off periods
- `appointments` - Booking records
- `session_logs` - Session details
- `payments` - Payment records
- `reviews` - Client reviews
- `notifications` - User notifications

## Features In Progress

### Phase 2: Advanced Booking
- Video conferencing integration
- Automated reminders
- Rescheduling capability
- Cancellation policies

### Phase 3: Payments
- Stripe integration
- Razorpay integration
- Payout system
- Invoice generation

### Phase 4: AI & Analytics
- AI-powered recommendations
- Consultant analytics dashboard
- Usage insights
- Performance metrics

## Styling & UI

The project uses **Tailwind CSS v4** with a custom color system:
- **Primary**: Blue (`#2563EB`)
- **Neutral**: Slate (`#475569` to `#F1F5F9`)
- **Accent**: Emerald (for positive actions)
- **Destructive**: Red (for deletions)

All components follow shadcn/ui patterns and are fully accessible with ARIA attributes.

## State Management

### Frontend State
- **Auth Context**: User authentication and profile
- **SWR**: Data fetching and caching
- **Local State**: Component-specific state with useState

### Backend State
- **Express middleware**: Authentication
- **JWT tokens**: Session management
- **Database**: Persistent data storage

## Security

- ✅ Password hashing with bcryptjs
- ✅ JWT token authentication
- ✅ CORS enabled
- ✅ Environment variable protection
- ⏳ Row-level security (RLS) on Supabase
- ⏳ Rate limiting
- ⏳ Input validation with Zod
- ⏳ HTTPS enforcement

## Testing

Comprehensive testing setup (coming soon):
- Unit tests with Vitest
- Integration tests with Supertest
- E2E tests with Playwright
- Component tests with Testing Library

## Deployment

### Vercel (Frontend)
```bash
vercel deploy
```

### Railway/Heroku (Backend)
```bash
git push heroku main
```

### Database Migrations
```bash
# On production server
pnpm prisma migrate deploy
```

## Contributing

1. Create a feature branch (`git checkout -b feature/amazing-feature`)
2. Commit changes (`git commit -m 'Add amazing feature'`)
3. Push to branch (`git push origin feature/amazing-feature`)
4. Open a Pull Request

## Roadmap

- [ ] MVP launch (Q2 2026)
- [ ] Payment processing (Q3 2026)
- [ ] Mobile app (Q4 2026)
- [ ] AI recommendations (Q1 2027)
- [ ] Group consultations (Q2 2027)
- [ ] International expansion (Q3 2027)

## Support & Resources

- **Documentation**: See `/docs` folder
- **API Docs**: Available at `http://localhost:3001/docs`
- **GitHub Issues**: Report bugs and request features
- **Email**: support@ayushman.app

## License

MIT License - see LICENSE file for details

## Acknowledgments

Built with ❤️ using Next.js, Express, and Supabase.

---

**Last Updated**: January 2026
**Status**: Phase 1 - Core MVP Development
