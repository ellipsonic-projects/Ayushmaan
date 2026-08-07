## 1. Supabase auth is the preferred auth management, otp based login for all, email and phone verification, password reset

## 2. Use twilio for message interaction wiith clients

## 3. A microservice using WhisperAI based audio transribing using hugging face model with tests, traffic analysis, health metrics

## 4. Pine cone for chunking interactions, commitments, tasks, supporting docs for RAG

## 5. TEMP (dev-mode): all new signups force `emailIsVerified: true` at creation (auth-register.router.ts, users.router.ts, consultants.router.ts, clients.router.ts, tenants.router.ts). Revert once real Supabase email confirmation is enforced — remove the hardcoded `true` and derive it from `identity.emailVerified` / Supabase's `email_confirmed_at` instead.

## 6. Make it mandatory for phone number verification along with email verification for clients, consultants, superadmin and tenantadmin after signup. This should be done later in production. Currently the product is in development.
