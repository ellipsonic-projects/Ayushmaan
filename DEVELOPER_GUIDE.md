# Developer Guide - Ayushman

Quick reference for developers working on Ayushman.

## Development Setup

### Prerequisites
- Node.js 18+
- pnpm (recommended package manager)
- PostgreSQL (via Supabase)
- Git

### Initial Setup

```bash
# Clone repository
git clone <repo-url>
cd ayushman

# Install dependencies
pnpm install

# Create .env files
cp .env.example .env.local (apps/web)
cp .env.example .env (apps/api)

# Fill in environment variables (see ENV_SETUP.md)

# Start development servers
cd apps/web && pnpm dev  # Frontend on http://localhost:3000
cd apps/api && pnpm dev  # Backend on http://localhost:3001
```

## Monorepo Commands

```bash
# Build entire monorepo
pnpm turbo run build

# Run dev servers for all apps
pnpm turbo run dev

# Lint all packages
pnpm turbo run lint

# Type check all packages
pnpm turbo run type-check

# Clean build artifacts
pnpm turbo run clean
```

## Frontend Development

### Key Directories
- `apps/web/app/` - Next.js app directory (routes)
- `apps/web/components/` - React components
- `apps/web/lib/` - Utilities, hooks, contexts
- `apps/web/public/` - Static assets

### Adding a New Page

1. Create route in `app/[route]/page.tsx`
2. Add auth check if needed using `useAuth()` hook
3. Import and use components
4. Add to navigation if needed

### Creating a Component

1. Create file in `components/[feature]/Component.tsx`
2. Export named component
3. Add 'use client' directive if using hooks
4. Import types from `packages/shared`

### Using Data Hooks

```typescript
import { useConsultants } from '@/lib/hooks/useConsultants';
import { useAuth } from '@/lib/auth/context';

function MyComponent() {
  const { user, token } = useAuth();
  const { consultants, loading } = useConsultants();
  
  return <div>{/* Use data */}</div>;
}
```

### Adding Form Validation

```typescript
import { z } from 'zod';

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

type FormData = z.infer<typeof schema>;
```

## Backend Development

### Key Directories
- `apps/api/src/routes/` - API endpoints
- `apps/api/src/middleware/` - Express middleware
- `apps/api/prisma/` - Database schema and migrations

### Creating a New Route

```typescript
// apps/api/src/routes/newfeature.ts
import { Router, Request, Response } from "express";
import { AuthenticatedRequest } from "../middleware/auth";

export const newRouter = Router();

newRouter.get("/", async (req: Request, res: Response) => {
  try {
    // Your logic here
    res.json({ data: [] });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch" });
  }
});

// Register in src/index.ts
app.use('/api/newfeature', newRouter);
```

### Working with Supabase

```typescript
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_ANON_KEY!
);

// Query data
const { data, error } = await supabase
  .from('table_name')
  .select('*')
  .eq('id', id);
```

### Database Migrations

```bash
# Create migration
pnpm prisma migrate dev --name feature_name

# Apply migration
pnpm prisma migrate deploy

# Generate Prisma client
pnpm prisma generate
```

## Shared Types & Constants

### Defining Types

```typescript
// packages/shared/src/types/index.ts
export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  userType: 'consultant' | 'client';
}
```

### Using Types

```typescript
// In both web and api apps
import { User } from '@ayushman/shared';
```

### Adding Constants

```typescript
// packages/shared/src/constants.ts
export const USER_ROLES = {
  CONSULTANT: 'consultant',
  CLIENT: 'client',
} as const;
```

## Authentication Flow

### Frontend
1. User submits form → `handleRegister()` or `handleLogin()`
2. Call `/api/auth/register` or `/api/auth/login`
3. Receive JWT token in response
4. Store in localStorage and state
5. Redirect to dashboard

### Backend
1. Receive credentials
2. Hash password with bcryptjs
3. Create user in database
4. Generate JWT token
5. Return token and user data

### Protected Routes
```typescript
// Frontend
function ProtectedPage() {
  const { user } = useAuth();
  if (!user) redirect('/auth/login');
  return <Dashboard />;
}

// Backend
app.get('/protected', authenticateJWT, (req, res) => {
  const userId = (req as AuthenticatedRequest).user?.id;
  // Access protected resource
});
```

## Common Tasks

### Add a New API Endpoint

1. Create route handler in `apps/api/src/routes/`
2. Add to Express app in `apps/api/src/index.ts`
3. Create frontend hook in `apps/web/lib/hooks/`
4. Use hook in component

### Update Database Schema

1. Modify `apps/api/prisma/schema.prisma`
2. Run migration: `pnpm prisma migrate dev --name description`
3. Update TypeScript types in `packages/shared`

### Add Frontend Form

1. Create component in `components/`
2. Add Zod validation schema
3. Handle submission with API hook
4. Show loading state and errors

### Style New Component

1. Use Tailwind classes
2. Reference design tokens in `globals.css`
3. Use semantic color classes (bg-background, text-foreground)
4. Ensure dark mode support

## Debugging

### Frontend
```typescript
// Debug state
console.log("[v0] User:", user);
console.log("[v0] Data:", data);

// Use React DevTools browser extension
// Use Network tab to inspect API calls
```

### Backend
```typescript
// Debug requests
console.log("[server] Request body:", req.body);
console.log("[server] User:", req.user);

// Use Postman or curl to test endpoints
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password"}'
```

## Performance Tips

### Frontend
- Use `useMemo` for expensive calculations
- Lazy load routes with Next.js dynamic imports
- Optimize images with Next.js Image component
- Implement pagination for large lists

### Backend
- Add database indexes for frequently queried columns
- Use connection pooling for database
- Cache responses with ETag headers
- Implement rate limiting

## Testing Best Practices

### Manual Testing
1. Test happy path (success scenario)
2. Test error paths (validation, not found)
3. Test edge cases (empty data, limits)
4. Test with different user roles

### Testing Checklist
- Authentication flows
- Form validation
- API error handling
- Permission checks
- Database consistency

## Code Style

### Naming Conventions
- Components: PascalCase (`UserProfile.tsx`)
- Files: kebab-case (`user-profile.tsx`)
- Variables/functions: camelCase (`getUserData`)
- Constants: UPPER_SNAKE_CASE (`MAX_RETRIES`)

### File Organization
```
feature/
  ├── Component.tsx      # React component
  ├── Component.test.tsx # Tests
  ├── hooks.ts          # Custom hooks
  └── types.ts          # TypeScript types
```

## Useful Commands

```bash
# Development
pnpm turbo run dev

# Build for production
pnpm turbo run build

# Type checking
pnpm turbo run type-check

# Linting
pnpm turbo run lint

# Format code
pnpm format

# Update dependencies
pnpm up --interactive --latest

# View monorepo dependencies
pnpm list --depth=0
```

## Git Workflow

```bash
# Create feature branch
git checkout -b feature/feature-name

# Make changes and commit
git add .
git commit -m "feat: add new feature"

# Push and create pull request
git push origin feature/feature-name

# After approval, merge to main
git checkout main
git pull
git merge feature/feature-name
```

## Common Issues & Solutions

### Port Already in Use
```bash
# Kill process on port
lsof -ti:3000 | xargs kill -9
```

### Database Connection Error
- Check DATABASE_URL in .env
- Verify Supabase connection string
- Ensure IP whitelisting if self-hosted

### Module Not Found
```bash
# Reinstall dependencies
rm -rf node_modules pnpm-lock.yaml
pnpm install
```

### TypeScript Errors
```bash
# Regenerate types
pnpm turbo run type-check
```

## Resources

- [Next.js Documentation](https://nextjs.org/docs)
- [Express.js Guide](https://expressjs.com/)
- [Supabase Documentation](https://supabase.com/docs)
- [Tailwind CSS](https://tailwindcss.com/)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [Turborepo Documentation](https://turbo.build/)

## Support

For questions or help:
1. Check existing documentation
2. Review similar code in codebase
3. Check GitHub issues and discussions
4. Contact team lead
