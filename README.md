HotelHQ — JR Hospitality staff portal

The site is [https://jrhospitality.github.io/hotelhq/](https://jrhospitality.github.io/hotelhq/).

Demo mode is the default. It uses example names and example PINs, never calls Supabase, and cannot see real staff or hotel data.

Live sign-in uses Supabase Auth. The PIN is the password. The publishable key is not stored in git. See `config.js` and `supabase/seed/corporate_account.sql`.

PINs that were shipped in the public website are in git history. Do not reuse them.

Sales-lead mail is sent by the `sales-lead-email` Edge Function over Gmail SMTP (`smtp.gmail.com`, port 465, TLS). Recipients come from `public.sales_lead_routes.emails` for that lead's hotel. Set these Edge Function secrets in Supabase and do not commit them:

- `HOTELHQ_GMAIL_USER` — mailbox login, and the From address
- `HOTELHQ_GMAIL_APP_PASSWORD` — Google app password for that mailbox

Supabase also injects `SUPABASE_URL` and the service-role key. Those stay out of git too.
