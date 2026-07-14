# Fixing the "Getting Logged Out" Problem — Summary of Changes

This document describes everything that was done to address the issue where users were repeatedly logged out or redirected to the login page when visiting **Account Management**, **Account settings**, **Seller Dashboard**, and other protected account/seller routes — especially after deployment on **Netlify**.

---

## 1. Original Problem

- **Symptom**: Navigating to `/account`, `/account/settings`, `/seller/dashboard`, etc. would redirect to `/auth/login` even when the user was logged in.
- **Environment**: Most visible on Netlify (serverless); sometimes worked locally.
- **Auth model**: Custom JWT stored in an `auth-token` cookie; server reads it via `cookies()` from `next/headers` in `getCurrentUser()`.

---

## 2. Root Causes Identified

1. **Server not receiving the cookie on Netlify**  
   On serverless (e.g. Netlify), the first request or RSC (React Server Components) request often did not include the `auth-token` cookie when the server ran `getCurrentUser()`, so the server thought the user was not logged in.

2. **Protected page running before client could recover**  
   When the layout had no user, it rendered `<SessionGate>{children}</SessionGate>`. The `children` (e.g. account page) are server components that run on the server and call `getCurrentUser()` again, get `null`, and call `redirect('/auth/login')` — so the redirect happened before the client-side SessionGate could verify the session.

3. **Redirects sending users to the wrong host**  
   On Netlify, `request.url` in Route Handlers and middleware could be the internal host (e.g. `main--zalora-fashion.netlify.app`) instead of the public host (`zalora-fashion.netlify.app`). Redirects (e.g. after logout) then sent the user to a different origin, causing CORS and failed requests.

4. **RSC / `router.refresh()` not sending cookies**  
   HAR analysis showed that when the client confirmed the session via `/api/auth/me` and then called `router.refresh()`, the RSC fetch triggered by the refresh did not send cookies on Netlify, so the server still had no user and kept showing the “checking session” state or redirecting to login.

---

## 3. Changes Made (in order)

### 3.1 AuthSync: Don’t clear user on failed /api/auth/me

- **File**: `src/components/auth-sync.tsx`
- **Change**: Only clear the client-side user when the user is on `/auth/login` or `/auth/logout`. Do **not** clear the user when `/api/auth/me` returns 401 or `user: null`.
- **Reason**: On Netlify the server sometimes fails to read the cookie; we should not wipe the client state and show “Log in” just because one `/api/auth/me` call failed.

---

### 3.2 SessionGate component

- **File**: `src/components/session-gate.tsx` (new)
- **Behavior**: When the server had no user, the layout rendered `<SessionGate>{children}</SessionGate>`. SessionGate (client component) fetches `/api/auth/me` with `credentials: 'include'`. If the response has a user, it renders `children`; otherwise it redirects to login.
- **Limitation**: The `children` (e.g. account page) are server components that still run on the server and call `redirect('/auth/login')` when `getCurrentUser()` is null, so the redirect happened before SessionGate could take effect. SessionGate was later replaced in account/seller layouts by SessionCheckAndRefresh (see below).

---

### 3.3 Supabase Auth (email provider) + @supabase/ssr

- **Goal**: Use Supabase’s built-in auth and session cookies so that session handling is reliable on serverless (Netlify).
- **Packages**: Added `@supabase/ssr`.
- **New/updated files**:
  - **`src/lib/supabase-server.ts`**
    - `createSupabaseServerClient()` — for Server Components / server code; uses `cookies()` from `next/headers`.
    - `createSupabaseRouteHandlerClient(request)` — for Route Handlers; reads cookies from the request and buffers cookie updates.
    - `applyCookiesToResponse(response, cookiesToSet)` — applies Supabase session cookies to the `NextResponse`.
  - **`src/lib/auth.ts`**
    - `getCurrentUser()` now tries **Supabase Auth session first** (via `createSupabaseServerClient()` and `supabase.auth.getUser()`), then falls back to the **legacy JWT** cookie.
    - Extracted `getAppUserById()` to load the app user from `public.users` for both Supabase and legacy sessions.
  - **`src/app/api/auth/login/route.ts`**  
    Tries Supabase `signInWithPassword` first; if that fails (e.g. “Invalid login”), falls back to legacy JWT login.
  - **`src/app/api/auth/register/route.ts`**  
    Uses Supabase `signUp` and creates a row in `public.users` with `id = auth.user.id`; legacy register kept as fallback.
  - **`src/app/auth/logout/route.ts`**  
    Calls Supabase `signOut()` and applies cookie updates; also clears the legacy `auth-token` cookie.
  - **`src/middleware.ts`**  
    Refreshes the Supabase session on each request (`supabase.auth.getUser()`) and applies updated cookies to the response so Server Components and API routes can see the session.
- **Docs**: `AUTH_SETUP.md` — enable Email provider in Supabase and set `NEXT_PUBLIC_SUPABASE_ANON_KEY` (and other env vars).

---

### 3.4 Redirect host fix (CORS / wrong host)

- **Problem**: Logout (and other redirects) used `request.url`, which on Netlify could be the internal host (e.g. `main--zalora-fashion.netlify.app`), so users were sent to a different origin and hit CORS.
- **New file**: `src/lib/redirect-base.ts`
  - `getRedirectBase(request)` — builds the redirect base URL from `x-forwarded-host` (or `host`) and `x-forwarded-proto` so redirects stay on the same host the user used.
- **Updated**:
  - `src/app/auth/logout/route.ts` — redirect uses `getRedirectBase(req)`.
  - `src/middleware.ts` — all redirects (login, home) use `getRedirectBase(request)`.

---

### 3.5 SessionCheckAndRefresh instead of rendering the protected page

- **Problem**: When the layout had no user, it still passed `children` (the account/seller page) to SessionGate. That page is a server component; it ran on the server, got `getCurrentUser() === null`, and called `redirect('/auth/login')` before the client could run SessionGate.
- **New file**: `src/components/session-check-and-refresh.tsx`
  - Client component that fetches `/api/auth/me` with `credentials: 'include'`.
  - If user is returned: set user in store and then **reload the page** (see next section).
  - If not: redirect to `/auth/login?redirect=...`.
- **Layout changes**:
  - **`src/app/(store)/account/layout.tsx`**  
    When `getCurrentUser()` is null, return `<SessionCheckAndRefresh />` instead of `<SessionGate>{children}</SessionGate>`. The account page is **not** rendered when the server has no user.
  - **`src/app/(store)/seller/layout.tsx`**  
    Same: when no user, return `<SessionCheckAndRefresh />` only.

So when the server doesn’t see a cookie, we never run the protected page (no server-side redirect); we only run the client-side session check.

---

### 3.6 Full page load instead of router.refresh()

- **Problem**: After SessionCheckAndRefresh got the user from `/api/auth/me`, it called `router.refresh()`. HAR analysis showed that the RSC fetch triggered by `router.refresh()` on Netlify **did not send cookies**, so the server still had no user and we stayed on “Checking session…” / “Loading…” or eventually hit login.
- **Change**: In `src/components/session-check-and-refresh.tsx`, when `/api/auth/me` returns a user we no longer call `router.refresh()`. We call:
  - `window.location.href = target`  
  where `target` is the current pathname (e.g. `/account` or `/seller/dashboard`).
- **Reason**: A full page load sends the `Cookie` header on the next request, so the server can read the session and render the real account/seller page.

---

## 4. Files Touched (summary)

| File | Change |
|------|--------|
| `src/components/auth-sync.tsx` | Only clear user on login/logout pages |
| `src/components/session-gate.tsx` | New; client session check (no longer used in account/seller layouts) |
| `src/components/session-check-and-refresh.tsx` | New; client check + full page load when session valid |
| `src/lib/supabase-server.ts` | New; Supabase server/route-handler clients and cookie helpers |
| `src/lib/redirect-base.ts` | New; redirect URL from request host/proto |
| `src/lib/auth.ts` | Supabase session first, then legacy JWT; `getAppUserById()` |
| `src/app/api/auth/login/route.ts` | Supabase signIn first, then legacy; set Supabase cookies on response |
| `src/app/api/auth/register/route.ts` | Supabase signUp + create `public.users`; legacy fallback |
| `src/app/auth/logout/route.ts` | Supabase signOut + redirect via `getRedirectBase()` |
| `src/app/(store)/account/layout.tsx` | When no user → `<SessionCheckAndRefresh />` |
| `src/app/(store)/seller/layout.tsx` | When no user → `<SessionCheckAndRefresh />` |
| `src/middleware.ts` | Refresh Supabase session; redirects use `getRedirectBase()` |
| `AUTH_SETUP.md` | Supabase Email provider and env setup |

---

## 5. What you need to donight

1. **Supabase**
   - Enable **Email** provider: Dashboard → Authentication → Providers → Email.
   - Set env vars (including `NEXT_PUBLIC_SUPABASE_ANON_KEY`) in Netlify and locally.

2. **Deploy**
   - Deploy the latest code so all of the above (Supabase Auth, redirect fix, SessionCheckAndRefresh, full page load) are active.

3. **Test**
   - Log in, then open Account Management, Account settings, Seller Dashboard. You should see “Checking session…” briefly, then a full reload and the real page, without being logged out.

---

## 6. If you’re still getting logged out

- Confirm **Email** is enabled in Supabase and `NEXT_PUBLIC_SUPABASE_ANON_KEY` is set in Netlify.
- Clear site cookies and log in again so new Supabase (and legacy) cookies are set.
- Check the browser Network tab: does the request to `/account` (or the RSC request) after “Loading…” send a `Cookie` header? If not, the full-page-load change may not be applied or something else is stripping cookies.
- Check Netlify function logs for errors in `getCurrentUser()` or Supabase client creation.
