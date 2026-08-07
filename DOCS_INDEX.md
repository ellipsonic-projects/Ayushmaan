# Ayushman Documentation Index

Complete reference for all documentation files in the Ayushman project.

## Getting Started

Start here if you're new to the project:

1. **README.md** - Project overview and features
2. **QUICK_START.md** - 5-minute setup guide
3. **ENV_SETUP.md** - Environment configuration guide

## For Developers

### Day-to-Day Development
- **DEVELOPER_GUIDE.md** - Quick reference for developers (commands, setup, troubleshooting)
- **PROJECT_SUMMARY.md** - What's been built and project structure

### Building Features
- Review existing components and pages in `apps/web/app/` and `apps/web/components/`
- Check `packages/shared/src/types/` for available types
- Use hooks from `apps/web/lib/hooks/` for data fetching

### API Development
- Review routes in `apps/api/src/routes/`
- Add new endpoints following existing patterns
- Ensure proper error handling and validation

## For Deployment

1. **DEPLOYMENT.md** - Complete deployment guide
   - Frontend deployment to Vercel
   - Backend deployment options (Railway, Render, AWS)
   - Database setup and migrations
   - Domain configuration
   - Post-deployment checklist

2. **QUICK_START.md** - Quick reference for developers

## Project Architecture

### Frontend Stack
- Next.js 16 with App Router
- React 19
- TailwindCSS v4
- TypeScript
- SWR for data fetching

### Backend Stack
- Express.js
- TypeScript
- JWT authentication
- Zod validation
- Supabase PostgreSQL

### Database
- PostgreSQL via Supabase
- 13+ tables with RLS policies
- Migrations included

## Available Documentation

| Document | Purpose | Audience |
|----------|---------|----------|
| README.md | Project overview, features, tech stack | Everyone |
| QUICK_START.md | 5-minute setup instructions | Developers |
| ENV_SETUP.md | Environment variable configuration | Developers |
| IMPLEMENTATION_SUMMARY.md | What's been built in Phases 0 & 1 | Product, Developers |
| PROJECT_SUMMARY.md | Complete project structure and status | Everyone |
| DEVELOPER_GUIDE.md | Developer quick reference guide | Developers |
| DEPLOYMENT.md | Production deployment instructions | DevOps, Developers |
| DOCS_INDEX.md | This file - documentation guide | Everyone |

## What's Been Built (MVP - Phases 0 & 1)

### Core Features
- User authentication (register, login, logout)
- Role-based access (Consultant vs Client)
- Consultant profile and credentials management
- Availability window management
- Appointment booking and management
- Search and browse consultants
- Responsive UI with dark mode

### Database
- Complete PostgreSQL schema
- Row Level Security (RLS) configured
- Sample data migrations

### API
- 20+ REST endpoints
- JWT authentication
- Error handling middleware
- Input validation

## What's NOT Yet Built (Future Phases)

### Phase 2: Payments & Notifications
- Stripe integration
- Email notifications
- SMS reminders
- Invoice generation

### Phase 3: Communication
- Real-time messaging
- Video meeting integration
- Screen sharing

### Phase 4: Advanced Features
- Case management
- Document storage
- Detailed analytics
- Reviews and ratings

### Phase 5: Scale & Polish
- Performance optimization
- Mobile app
- Internationalization

## Project File Structure

```
ayushman/
├── apps/
│   ├── web/                 # Next.js frontend
│   │   ├── app/
│   │   ├── components/
│   │   └── lib/
│   ├── api/                 # Express backend
│   │   ├── src/
│   │   └── prisma/
│   └── ...
├── packages/
│   └── shared/              # Shared types & constants
├── README.md                # Project overview
├── QUICK_START.md          # 5-minute setup
├── ENV_SETUP.md            # Environment setup
├── IMPLEMENTATION_SUMMARY.md # What was built
├── PROJECT_SUMMARY.md      # Complete project summary
├── DEVELOPER_GUIDE.md      # Developer reference
├── DEPLOYMENT.md           # Deployment guide
└── DOCS_INDEX.md           # This file
```

## Key Concepts

### Authentication
- JWT tokens stored in localStorage
- AuthContext for state management
- Middleware for protected routes

### Data Management
- SWR hooks for client-side caching
- API client utility for consistent requests
- Supabase for backend database

### Styling
- TailwindCSS v4 with custom tokens
- Dark mode support
- Responsive design

### Component Architecture
- Card-based layout system
- Button with multiple variants
- Reusable appointment and availability components

## Common Developer Tasks

### Add a New Feature
1. Read DEVELOPER_GUIDE.md
2. Create components in `apps/web/components/`
3. Add API route in `apps/api/src/routes/`
4. Create SWR hook in `apps/web/lib/hooks/`
5. Test thoroughly

### Deploy to Production
1. Read DEPLOYMENT.md
2. Configure environment variables
3. Build and test locally
4. Deploy frontend to Vercel
5. Deploy backend to chosen provider
6. Run database migrations
7. Verify in production

### Set Up Development Environment
1. Read QUICK_START.md
2. Follow ENV_SETUP.md
3. Install dependencies with pnpm
4. Start dev servers
5. Test by creating account and booking appointment

## Getting Help

### If You're Stuck
1. Check relevant documentation file above
2. Search project code for similar implementations
3. Check error messages in browser console or server logs
4. Review git history for related changes
5. Ask team lead or create issue

### Resources
- Next.js: https://nextjs.org/docs
- Express.js: https://expressjs.com/
- Supabase: https://supabase.com/docs
- TailwindCSS: https://tailwindcss.com/
- TypeScript: https://www.typescriptlang.org/docs/

## Quick Commands

```bash
# Setup
pnpm install
cd apps/web && pnpm dev    # Terminal 1
cd apps/api && pnpm dev    # Terminal 2

# Build
pnpm turbo run build

# Deploy
# Follow DEPLOYMENT.md instructions

# Debug
npm run type-check          # Check types
npm run lint               # Check code style
```

## Next Steps

1. **If just starting**: Read README.md and QUICK_START.md
2. **If developing**: Read DEVELOPER_GUIDE.md
3. **If deploying**: Read DEPLOYMENT.md
4. **If learning about project**: Read PROJECT_SUMMARY.md
5. **If setting up environment**: Read ENV_SETUP.md

## Document Maintenance

These documents should be updated:
- When new features are added
- When deployment instructions change
- When architecture changes
- When new API endpoints are created
- When database schema changes

## Version Info

- **Next.js**: 16.2.6
- **React**: 19
- **Node.js**: 18+
- **TypeScript**: 5.7.3
- **TailwindCSS**: 4.2.0
- **Express**: Latest

Last Updated: 2026-07-04
