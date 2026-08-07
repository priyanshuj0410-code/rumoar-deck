---
type: runbook
title: Email delivery for RUMOAR sign-in
description: Why magic links stop arriving after two per hour, and how to move Supabase Auth onto Resend SMTP.
plane_issues:
  - RUM-15 https://app.plane.so/claude-pri/projects/0f74bf02-2d16-4c07-a0f7-af537f8cb725/issues/
---

# Email delivery

## The problem

Supabase's built-in email sender is a shared service capped at **2 emails per hour, project
wide**. It is documented as not for production. The third person to ask for a magic link in
any given hour gets a `429` with code `over_email_send_rate_limit`, no matter who they are.
`app/supabase/config.toml` states the same number verbatim under `[auth.rate_limit]`.

No amount of client-side throttling fixes this. The only fix is custom SMTP.

## What the code now does about it

- [sign-in-form.tsx](../../app/src/app/sign-in/sign-in-form.tsx) maps `over_email_send_rate_limit`
  and any `429` to copy that points at Google rather than reporting a server quota.
- Google is the ink primary; email is a ghost button below the divider. Email is the fragile
  path and should not look like the main one.
- A 60-second cooldown after any send mirrors Supabase's own minimum interval, so a user
  cannot spend the quota by tapping twice.
- The Apple button was removed — it was calling a provider that is not configured. Restore it
  the moment Apple sign-in is enabled in the dashboard.

## Moving to Resend — steps for the account owner

Chosen over Postmark (no free tier), SES (needs a production-access request and its own
console), SendGrid (free plan discontinued) and Brevo (weaker deliverability). Resend is free
to 3,000/month and 100/day, and has a documented Supabase SMTP path.

**Do all of this yourself. The API key goes from Resend's dashboard straight into Supabase's
SMTP form and nowhere else — never into a chat, a commit, or an `.env` file.**

1. Sign up at <https://resend.com>. Free plan, no card.
2. **Domains → Add Domain**, using a real domain you own. A `*.vercel.app` host cannot be
   verified.
3. Add the three DNS records Resend shows, all on a `send.` subdomain:
   - `MX` on `send` → the host it gives you, priority 10
   - `TXT` on `send` → `v=spf1 include:amazonses.com ~all`
   - `TXT` on `resend._domainkey` → the DKIM key
   Do **not** put the SPF include on the apex domain — that is the usual way people break
   their existing mail.
4. Add DMARC yourself; Resend does not. `TXT` at `_dmarc.<domain>`:
   `v=DMARC1; p=none; rua=mailto:you@<domain>`
   Stay at `p=none` for two weeks, read the reports, then tighten. Going straight to
   `p=reject` will silently kill your own mail if anything is misaligned.
5. **API Keys → Create**, name `supabase-auth`, permission **Sending access** only,
   restricted to your domain. The key is shown once.
6. Supabase → Authentication → Emails → **SMTP Settings**, enable Custom SMTP:

   | Field | Value |
   |---|---|
   | Sender email | `login@<domain>` — must be on the verified domain |
   | Sender name | `RUMOAR` |
   | Host | `smtp.resend.com` |
   | Port | `465` (`587` if 465 is blocked) |
   | Username | `resend` — literally that word |
   | Password | the `re_...` key |

7. Authentication → **Rate Limits** → raise *emails per hour* from 2 to about 30 while on
   Resend's free daily cap of 100. Leave the per-user minimum interval at 60s — the client
   cooldown mirrors it, so change both together.
8. Authentication → **URL Configuration**: Site URL `https://rumoar-app-alpha.vercel.app`,
   and add `https://rumoar-app-alpha.vercel.app/auth/callback**` to the redirect allow-list.
   An `emailRedirectTo` that is not allow-listed silently lands on the Site URL instead,
   which looks exactly like a broken link.
9. Verify: sign in with a real Gmail address, then **⋮ → Show original**. SPF, DKIM and
   DMARC must all read `PASS`.

See also: [Design system](../design.md) · [Plane config](../plane.config.md)
