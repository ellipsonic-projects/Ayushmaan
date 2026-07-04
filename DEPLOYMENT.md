# Deployment Guide - Ayushman

This guide covers deploying Ayushman to production using Vercel (frontend) and your preferred hosting platform (backend API).

## Architecture Overview

```
├── apps/web (Next.js 16)         → Deploy to Vercel
├── apps/api (Express.js)         → Deploy to Railway, Render, or AWS
└── packages/shared (TypeScript)  → Shared across both apps
```

## Frontend Deployment (Vercel)

### 1. Connect Repository

```bash
# Push your code to GitHub
git add .
git commit -m "Initial commit: Ayushman MVP"
git push origin main
```

### 2. Deploy Web App

1. Go to [vercel.com](https://vercel.com)
2. Click "New Project"
3. Import your GitHub repository
4. Configure build settings:
   - Framework: Next.js
   - Root Directory: `apps/web`
   - Build Command: `pnpm turbo run build`
   - Output Directory: `.next`

### 3. Set Environment Variables

In Vercel dashboard, add:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
NEXT_PUBLIC_API_BASE_URL=https://your-api-domain.com
```

### 4. Deploy

Click "Deploy" to go live!

## Backend Deployment Options

### Option A: Railway.app (Recommended)

1. Install Railway CLI: `npm i -g @railway/cli`
2. Create project on railway.app
3. Connect GitHub repository
4. Add environment variables:
   ```env
   DATABASE_URL=your_postgres_url
   SUPABASE_URL=your_supabase_url
   SUPABASE_ANON_KEY=your_supabase_anon_key
   JWT_SECRET=generate_random_secret
   ```
5. Set root directory: `apps/api`
6. Deploy!

### Option B: Render.com

1. Go to [render.com](https://render.com)
2. Create new "Web Service"
3. Connect your GitHub repo
4. Configure:
   - Build command: `cd apps/api && npm install && npm run build`
   - Start command: `npm start`
   - Environment variables: (same as above)
5. Deploy!

### Option C: AWS ECS Fargate

1. Containerize the API:
   ```dockerfile
   FROM node:18
   WORKDIR /app
   COPY . .
   WORKDIR /app/apps/api
   RUN npm ci
   RUN npm run build
   CMD ["npm", "start"]
   ```

2. Push to ECR
3. Create ECS cluster and task definition
4. Set up RDS PostgreSQL database
5. Configure environment variables

## Database Setup

### Supabase (Recommended)

1. Sign up at [supabase.com](https://supabase.com)
2. Create new project
3. Run SQL migrations from `apps/api/prisma/migrations/001_initial_schema.sql`
4. Copy credentials to environment variables

### Self-Hosted PostgreSQL

1. Set up PostgreSQL server (AWS RDS, DigitalOcean, etc.)
2. Create database: `ayushman_prod`
3. Run migrations
4. Update DATABASE_URL in environment

## Domain & SSL

### Frontend (Vercel)

1. Go to Project Settings → Domains
2. Add custom domain
3. SSL automatically configured

### Backend API

Use a reverse proxy (Cloudflare, AWS Route53):

```
api.yourdomain.com → Your backend server
```

## Monitoring & Logging

### Frontend
- Vercel Analytics: Automatically enabled
- Use `@vercel/analytics` for custom metrics

### Backend
- Set up logging: Sentry, Datadog, or CloudWatch
- Monitor API response times and errors
- Set up alerts for critical failures

## CI/CD Pipeline

GitHub Actions workflow:

```yaml
name: Deploy Ayushman
on:
  push:
    branches: [main]

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: pnpm/action-setup@v2
      - uses: actions/setup-node@v2
        with:
          node-version: '18'
          cache: 'pnpm'
      
      - name: Install dependencies
        run: pnpm install
      
      - name: Run tests
        run: pnpm turbo run test
      
      - name: Build
        run: pnpm turbo run build
```

## Post-Deployment Checklist

- [ ] Test all authentication flows (login, register, logout)
- [ ] Test booking flow end-to-end
- [ ] Verify database connectivity
- [ ] Check SSL certificate
- [ ] Set up automated backups
- [ ] Configure monitoring and alerts
- [ ] Test email notifications (if implemented)
- [ ] Performance testing and optimization
- [ ] Security audit
- [ ] User acceptance testing

## Scaling Considerations

### Database
- Enable connection pooling (PgBouncer)
- Add read replicas for high traffic
- Regular backups and point-in-time recovery

### API
- Load balancing (AWS ALB, Nginx)
- Horizontal scaling with container orchestration
- Redis caching for frequent queries
- CDN for static assets

### Frontend
- Leverage Vercel's edge network
- Optimize images and bundle size
- Implement service workers for offline support

## Rollback Procedure

### Frontend
```bash
# On Vercel dashboard, go to Deployments and click Rollback
```

### Backend
```bash
# Revert to previous version
git revert <commit-hash>
git push origin main
```

## Emergency Contacts

- Vercel Support: support@vercel.com
- Database Support: based on provider
- API Monitoring: based on tool selected
