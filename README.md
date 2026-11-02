HotelHQ — JR Hospitality staff portal

The site is [https://jrhospitality.github.io/hotelhq/](https://jrhospitality.github.io/hotelhq/).

GitHub Pages writes `config.js` on deploy from the `SUPABASE_PUBLISHABLE_KEY` repository secret and sets `mode` to `live`. If that secret is missing or is not a publishable key, the workflow fails and does not publish demo mode at the root. The key is not stored in git. See `config.js` and `supabase/seed/corporate_account.sql`.

The same build stays available at [https://jrhospitality.github.io/hotelhq/demo/](https://jrhospitality.github.io/hotelhq/demo/) with `mode` `demo`, an empty key, and no network calls. That page uses example names and example PINs and cannot see real staff or hotel data.

Live sign-in uses Supabase Auth. The name list for a hotel includes that hotel's staff plus JR Corporate. The PIN is the password. When `pin_reset_required` is true, the next sign-in has to set a new PIN before the app opens.

PINs that were shipped in the public website are in git history. Do not reuse them.

Sales-lead mail is sent by the `sales-lead-email` Edge Function over Gmail SMTP (`smtp.gmail.com`, port 465, TLS). Recipients come from `public.sales_lead_routes.emails` for that lead's hotel. Set these Edge Function secrets in Supabase and do not commit them:

- `HOTELHQ_GMAIL_USER` — mailbox login, and the From address
- `HOTELHQ_GMAIL_APP_PASSWORD` — Google app password for that mailbox

Supabase also injects `SUPABASE_URL` and the service-role key. Those stay out of git too.
