# Environment Setup Guide for Ayushman

## Required Services

Before running the application, you'll need to set up accounts with the following services:

### 1. Supabase (PostgreSQL + Auth)
- **Website**: https://supabase.com
- **What it provides**: PostgreSQL database, authentication, real-time features
- **Free tier**: Sufficient for MVP development

**Setup Steps:**
1. Sign up for a free Supabase account
2. Create a new project
3. Copy your project credentials:
   - Project URL
   - Anon Key (public)
   - Service Role Key (secret)

### 2. Stripe (Payments)
- **Website**: https://stripe.com
- **What it provides**: Payment processing
- **Free tier**: Yes, test mode available
- **Note**: Optional for MVP, can be added later

**Setup Steps:**
1. Sign up for Stripe account
2. Get your API keys from dashboard

### 3. GitHub (Version Control)
- **Website**: https://github.com
- **What it provides**: Code hosting, CI/CD integration
- **Note**: Recommended for deploying to Vercel

## Frontend Environment Variables

Create a file: `apps/web/.env.local`

```bash
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here

# API Configuration
API_URL=http://localhost:3001

# Analytics (Optional)
NEXT_PUBLIC_VERCEL_ANALYTICS_ID=your_analytics_id
```

### Variable Explanations:

- **NEXT_PUBLIC_SUPABASE_URL**: Your Supabase project URL
  - Found in Supabase dashboard → Settings → API
  - Format: `https://[project-id].supabase.co`
  
- **NEXT_PUBLIC_SUPABASE_ANON_KEY**: Public key for client-side Supabase operations
  - Found in Supabase dashboard → Settings → API
  - Safe to expose in frontend code (hence `NEXT_PUBLIC_`)

- **API_URL**: Backend API base URL
  - Local development: `http://localhost:3001`
  - Production: Your deployed API URL

## Backend Environment Variables

Create a file: `apps/api/.env`

```bash
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/ayushman

# JWT Secret (Generate a random string)
JWT_SECRET=your_super_secret_jwt_key_here_change_in_production

# Server Configuration
NODE_ENV=development
PORT=3001

# Email Service (Optional - for notifications)
SENDGRID_API_KEY=your_sendgrid_api_key

# Stripe (Optional - for payments)
STRIPE_SECRET_KEY=your_stripe_secret_key

# Supabase (Optional - for backend Supabase operations)
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

### Variable Explanations:

- **DATABASE_URL**: PostgreSQL connection string
  - From Supabase: Settings → Database → Connection String
  - Format: `postgresql://postgres:[PASSWORD]@[HOST]:5432/postgres`
  - Keep this SECRET - never commit to git

- **JWT_SECRET**: Secret key for signing JWT tokens
  - Generate with: `openssl rand -base64 32`
  - Use different values for dev/staging/production
  - Keep this SECRET

- **NODE_ENV**: Environment mode
  - `development` for local development
  - `production` for deployed instances

- **PORT**: API server port
  - Default: 3001
  - Change if port conflicts

## Getting Credentials from Supabase

### 1. PostgreSQL Connection
1. Go to Supabase Dashboard
2. Select your project
3. Go to Settings → Database
4. Under "Connection info", select Node.js
5. Copy the connection string
6. Replace `[YOUR-PASSWORD]` with your database password
7. Add to `apps/api/.env` as `DATABASE_URL`

### 2. API Credentials
1. Go to Settings → API
2. Copy "Project URL" → `NEXT_PUBLIC_SUPABASE_URL`
3. Copy "anon public" key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
4. Copy "service_role" key → `SUPABASE_SERVICE_ROLE_KEY` (backend only)

### 3. Generate JWT Secret
```bash
# Generate a random secret
openssl rand -base64 32

# Output example: 
# abc123xyz+/def456uvw=/ghi789rst+/
# Use this value for JWT_SECRET
```

## Step-by-Step Setup

### 1. Clone Repository
```bash
git clone https://github.com/your-username/ayushman.git
cd ayushman
```

### 2. Install Dependencies
```bash
pnpm install
```

### 3. Create Supabase Project
- Go to https://supabase.com
- Create a new project
- Wait for provisioning (5-10 minutes)
- Copy your credentials

### 4. Create Environment Files

**Frontend (`apps/web/.env.local`):**
```bash
NEXT_PUBLIC_SUPABASE_URL=<your-supabase-url>
NEXT_PUBLIC_SUPABASE_ANON_KEY=<your-anon-key>
API_URL=http://localhost:3001
```

**Backend (`apps/api/.env`):**
```bash
DATABASE_URL=<your-database-url>
JWT_SECRET=<your-generated-secret>
NODE_ENV=development
PORT=3001
SUPABASE_URL=<your-supabase-url>
SUPABASE_SERVICE_ROLE_KEY=<your-service-role-key>
```

### 5. Setup Database
```bash
cd apps/api

# Push schema to Supabase
pnpm prisma db push

# View database in studio
pnpm prisma studio
```

### 6. Start Development Servers

**Terminal 1 - Frontend:**
```bash
cd apps/web
pnpm dev
# Opens on http://localhost:3000
```

**Terminal 2 - Backend:**
```bash
cd apps/api
pnpm dev
# Opens on http://localhost:3001
```

### 7. Test the Application
1. Visit http://localhost:3000
2. Click "Get Started"
3. Register as a consultant
4. Complete the onboarding
5. Access the consultant dashboard

## Troubleshooting

### "Can't connect to database"
- Check `DATABASE_URL` is correct
- Verify database credentials are accurate
- Ensure Supabase project is ready
- Check network connectivity to Supabase

### "Supabase API key invalid"
- Verify `NEXT_PUBLIC_SUPABASE_URL` format
- Copy exact `NEXT_PUBLIC_SUPABASE_ANON_KEY` (no extra spaces)
- Check you're using the "anon public" key, not service role key

### "JWT authentication fails"
- Verify `JWT_SECRET` is set in `.env`
- Check token format in Authorization header
- Ensure token hasn't expired (7 days default)

### "Port 3000 or 3001 already in use"
- Change port in `apps/web/package.json` (dev script)
- Or change port in `apps/api/.env`
- Kill existing process: `lsof -ti:3000 | xargs kill` (macOS/Linux)

### "Module not found errors"
- Run `pnpm install` from root
- Clear node_modules: `pnpm clean && pnpm install`
- Check that `@ayushman/shared` is in workspace

## Security Best Practices

⚠️ **Important for Production:**

1. **Never commit .env files**
   - Add to `.gitignore`
   - Use environment variable services (Vercel, Railway, etc.)

2. **Rotate secrets regularly**
   - Generate new JWT_SECRET monthly
   - Rotate Stripe keys quarterly
   - Audit database access logs

3. **Use strong passwords**
   - Supabase database password should be 16+ characters
   - Use password manager to store credentials

4. **Enable 2FA**
   - Enable on Supabase account
   - Enable on GitHub account
   - Enable on email provider

5. **IP Whitelisting**
   - Whitelist backend server IPs in Supabase
   - Configure CORS properly

6. **API Rate Limiting**
   - Enable in Supabase
   - Implement on backend endpoints

## Environment by Deployment Platform

### Vercel (Frontend)
1. Connect GitHub repo
2. Set environment variables in Project Settings → Environment Variables
3. Variables are automatically applied on deploy

### Railway (Backend)
1. Connect GitHub repo
2. Set environment variables in Variables tab
3. Deploy automatically on git push

### Supabase (Database)
- Environment variables automatically configured
- No additional setup needed

## Quick Reference

| Variable | Where to Find | Secret? |
|----------|---------------|---------|
| NEXT_PUBLIC_SUPABASE_URL | Supabase → Settings → API | No |
| NEXT_PUBLIC_SUPABASE_ANON_KEY | Supabase → Settings → API | No |
| DATABASE_URL | Supabase → Settings → Database | Yes |
| JWT_SECRET | Generate with `openssl` | Yes |
| SUPABASE_SERVICE_ROLE_KEY | Supabase → Settings → API | Yes |
| API_URL | Your backend URL | No |

## Next Steps

After setup:
1. Test registration flow
2. Explore consultant onboarding
3. Browse consultants as a client
4. Check backend API with Postman/Insomnia
5. Review database schema in Prisma Studio

---

**Questions?** Check the main README.md or create an issue on GitHub
