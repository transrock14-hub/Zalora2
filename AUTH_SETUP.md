# Authentication setup (Supabase Auth)

Account management, account settings, nav dropdown, and protected routes use **Supabase Auth (email provider)** so sessions work reliably on Netlify and other serverless hosts.

## What you need in Supabase

1. **Enable Email provider**
   - In [Supabase Dashboard](https://supabase.com/dashboard) → your project → **Authentication** → **Providers**
   - Enable **Email**
   - Optionally turn off **Confirm email** if you don’t want email verification on signup

2. **Environment variables**
   - `NEXT_PUBLIC_SUPABASE_URL` – project URL  
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` – anon/public key (used for Supabase Auth + SSR)  
   - `SUPABASE_SERVICE_ROLE_KEY` – service role key (used for DB and admin)  
   - Set these in Netlify (and locally in `.env.local`).

## How it works

- **New users:** Register uses Supabase `signUp`; a row is created in `public.users` with `id = auth.users.id`. Login uses Supabase `signInWithPassword`; session is stored in cookies via `@supabase/ssr`.
- **Existing users:** Login tries Supabase first; if the email has no Supabase Auth user, it falls back to the legacy JWT cookie. No change needed for existing accounts.
- **Middleware** refreshes the Supabase session on each request so Server Components and API routes see the session.
- **Account / Seller routes:** `getCurrentUser()` reads the Supabase session first (from cookies), then falls back to the legacy JWT, so Account management, Account settings, and all account/seller pages work after login.

## If account/settings still redirect to login

- Confirm **Email** provider is enabled in Supabase.
- Confirm `NEXT_PUBLIC_SUPABASE_ANON_KEY` is set in Netlify (and that the build used it).
- Clear site cookies and log in again so new Supabase session cookies are set.
