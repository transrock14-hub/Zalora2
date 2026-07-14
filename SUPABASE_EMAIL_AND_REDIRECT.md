# Supabase: Emails sending, branding, and redirect

## 1. Why signup emails don’t send / “Email not confirmed” at login

- **Confirm email** is **on** by default in Supabase. New users must click the link in the confirmation email before they can log in.
- If **no email is sent** (or it never arrives), they never get that link, so login says **“Email not confirmed”**.
- Supabase’s **built-in** email has strict limits and is often unreliable (spam, rate limits). For real signups you should use **Custom SMTP**.

---

## 2. “500: Error sending magic link email” / “Error sending … email”

If you see **500** or “Error sending magic link email” (or “Error sending confirmation email”, “Error sending recovery email”) in Supabase Auth logs, Supabase is **trying** to send the email but **delivery is failing**. The mailer templates (“mailer: reloaded template type: magic_link”, etc.) just mean the mailer loaded; the 500 is the actual send failing.

**Fix:** Supabase’s built-in sender is limited and often fails. You must set up **Custom SMTP** (Section 2 below) so **all** auth emails (confirmation, magic link, password reset) can be sent.

---

## 3. Enable sending of auth emails (Custom SMTP)

To have Supabase **actually send** confirmation, magic link, and password-reset emails:

1. **Pick an SMTP provider** (all have free tiers):
   - **Resend** – https://resend.com (simple, good for apps)
   - **SendGrid** – https://sendgrid.com  
   - **Mailgun** – https://mailgun.com  
   - **Postmark** – https://postmarkapp.com  

2. **Create an API key** in that provider and get:
   - SMTP host (e.g. `smtp.resend.com`)
   - Port (often `465` or `587`)
   - Username (often `resend` or your API key)
   - Password (often your API key)

3. **In Supabase Dashboard:**
   - Go to **Project Settings** (gear) → **Auth** → **SMTP Settings**.
   - Turn **Enable Custom SMTP** **on**.
   - Fill in **Host**, **Port**, **Username**, **Password** from the provider.
   - Set **Sender email** (e.g. `noreply@yourdomain.com` or the address the provider gives you).
   - Set **Sender name** (e.g. `ZALORA`).
   - Save.

4. **Resend example:**  
   - Sign up at resend.com, add and verify your domain (or use their test domain).  
   - Create an API key.  
   - In Supabase SMTP: Host `smtp.resend.com`, Port `465`, Username `resend`, Password = your API key, Sender = the verified address.

After this, **all** auth emails (confirmation, magic link, password reset) should send successfully and the 500 “Error sending … email” should stop.

---

## 3a. “450 API key is invalid” / “gomail: could not send email … 450 API key is invalid”

If you **have** Custom SMTP enabled but Supabase logs show **“500: Error sending confirmation email”** with **“gomail: could not send email 1: 450 API key is invalid”**, the SMTP **provider** is rejecting your credentials. The **API key (password)** you entered in Supabase is wrong, expired, or not allowed to send.

**What to do:**

1. **Check the API key in Supabase**  
   **Project Settings** → **Auth** → **SMTP Settings**. The **Password** field is usually your provider’s **API key**. Make sure there are no extra spaces or missing characters.

2. **Regenerate the API key in the provider**  
   In Resend / SendGrid / Mailgun / Postmark:
   - Create a **new** API key.
   - Copy it exactly (no spaces).
   - In Supabase SMTP, replace the **Password** with this new key and **Save**.

3. **Use the right type of key**  
   - **Resend:** Use an API key from the Resend dashboard (not a “domain” or “webhook” key).  
   - **SendGrid:** Use an API key with “Mail Send” permission.  
   - **Mailgun:** Use the SMTP password from **Sending** → **Domain settings** (or an API key if the provider uses it for SMTP).

4. **Resend-specific:**  
   - Username must be **`resend`** (literal).  
   - Password = your **API key** from Resend (starts with `re_`).  
   - Sender email must be a **verified** domain or `onboarding@resend.dev` for testing.

After fixing the key, trigger a new signup or “Send confirmation email” from **Authentication** → **Users**; the confirmation email should send without the 450 error.

---

## 4. Option: Let users log in without confirming email

If you **don’t** want to require email confirmation (e.g. for development or a closed beta):

1. In Supabase: **Authentication** → **Providers** → **Email**.
2. Turn **off** “Confirm email”.
3. Save.

New users can then log in right after signup; no confirmation email is sent or required.

**Existing user already in DB but “not verified”:**  
- Either send the confirmation email again from **Authentication** → **Users** → select user → **Send confirmation email**,  
- Or turn off “Confirm email” as above (they will then be able to log in).

---

## 5. Redirect to your site (not localhost)

After users confirm their email, Supabase sends them to the **Site URL**. If that is set to `http://localhost:3000`, the link in the email will point to localhost.

**In Supabase Dashboard:**

1. Go to **Authentication** → **URL Configuration**.
2. Set **Site URL** to your production callback so confirmations land on your app and are handled there:
   - **Production:** `https://zalora-fashion.netlify.app/auth/callback`
   - (For local testing you can temporarily use `http://localhost:3000/auth/callback`.)
3. Under **Redirect URLs**, add:
   - `https://zalora-fashion.netlify.app/**`
   - `http://localhost:3000/**` (optional, for local dev)

The app’s `/auth/callback` page reads the token from the URL, stores the session, and redirects to `/` with a clean URL.

---

## 6. Customize emails (ZALORA instead of Supabase)

**In Supabase Dashboard:**

1. Go to **Authentication** → **Email Templates**.
2. Edit each template you use (e.g. **Confirm signup**, **Magic Link**, **Reset password**):
   - **Subject:** e.g. `Confirm your ZALORA account` instead of default.
   - **Body:** Replace “Supabase” with “ZALORA” and use your app name, support link, etc.

You can use the same variables (e.g. `{{ .ConfirmationURL }}`, `{{ .Email }}`). The confirmation link will still go to the **Site URL** you set above (e.g. `.../auth/callback` with token).

---

## 7. Send from your own domain (optional)

By default, emails are sent from Supabase’s domain, so the “From” address looks like Supabase.

To send from your own domain (e.g. `noreply@yourdomain.com`):

1. In Supabase Dashboard go to **Project Settings** → **Auth** → **SMTP Settings**.
2. Enable **Custom SMTP** and enter your provider’s details (SendGrid, Mailgun, Resend, etc.).
3. Set the **Sender email** to something like `noreply@yourdomain.com` and the **Sender name** to `ZALORA`.

You must verify your domain with the SMTP provider and configure DNS (SPF/DKIM) as they require.
