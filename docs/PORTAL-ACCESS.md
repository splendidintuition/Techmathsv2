# First administrator bootstrap

Public signup is disabled on the hosted Supabase project. Do not re-enable it to create portal users.

The four confirmed Auth accounts have been mapped to their intended roles directly in `public.profiles`:

- `admin@techmaths-dc.com` → `admin`
- `staff@techmaths-dc.com` → `staff`
- `client@techmaths-dc.com` → `client`
- `freelancer@techmaths-dc.com` → `freelancer`

All four profile records are active and their email addresses are confirmed. No sign-ins have occurred yet. The client account still needs membership in a real client organization before it can see organization-scoped records.

For future users, create/invite them from Supabase Dashboard → Authentication → Users, then assign role and organization membership through trusted admin tooling / SQL. Do not grant roles from signup metadata, client-side code, or a public RPC.

The profile role column is intentionally not writable from the browser. Mandatory MFA enforcement and self-service TOTP UI remain follow-up security work before production operational use.
