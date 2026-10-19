# Studio Control — Caption Admin

A separate Next.js admin console for the AI caption studio. It reads profiles,
creates/reads/updates/deletes generated media, and reads upvotes/downvotes. The
console requires a Google-authenticated Supabase session and a
`profiles.is_superadmin = true` row. Server actions check that role again, and
Supabase row-level security policies enforce the same authorization at the
database boundary.

## 1. Apply the database policies

Run [`supabase/admin.sql`](./supabase/admin.sql) in the Supabase Dashboard's
SQL Editor after the media app's schema in `assignment-4.sql` has been applied.
It adds the role field and admin-only policies. Do not add a Supabase
`service_role` key to this app: it bypasses RLS and is not needed.

## 2. Bootstrap the first superadmin

This is intentionally done outside the admin app. The Supabase project owner
can run SQL Editor queries without being an app superadmin, so the authorization
check does not lock the owner out. First sign in once to the media app with the
Google account that should administer the project; that creates its `profiles`
row. In SQL Editor, verify the exact account:

```sql
select id, email
from auth.users
where email = 'your-google-email@example.com';
```

Then promote only that account, replacing the email with the same Google login:

```sql
update public.profiles
set is_superadmin = true
where id = (
  select id
  from auth.users
  where email = 'your-google-email@example.com'
);
```

The query should update one profile. If it updates zero rows, sign in to the
media app with that Google account first, then retry. To remove access later,
set that profile's `is_superadmin` back to `false` in the SQL Editor.

## 3. Configure Google OAuth and the app

Enable Google under Supabase Authentication > Providers. In Authentication >
URL Configuration, add the admin app's callback URLs to the allowed Redirect
URLs:

- `http://localhost:3100/auth/callback` when the media app is using port 3000.
- The admin app's Vercel URL followed by `/auth/callback`.

Only add `http://localhost:3000/auth/callback` if the admin app itself is
running at port 3000. Keep the Site URL set to the existing media app's
canonical URL if that app already uses this Supabase project. The admin sign-in
button requests a callback on the current app's origin; if that exact callback
is not in Supabase's allowlist, Supabase may fall back to the Site URL and send
you back to the media app instead of this admin dashboard.

The Google OAuth client must allow the Supabase callback URL shown by the
provider setup. This is a separate URL from the app's `/auth/callback`.

Copy `.env.example` to `.env.local` for local development. Set the public
Supabase URL and publishable key locally and in the Vercel project's
Environment Variables. Never use a service-role key or put secrets in
`NEXT_PUBLIC_` variables.

```bash
npm install
npm run dev -- --port 3100
```

Open `http://localhost:3100/login` to sign into the admin app. The media and
admin apps are separate deployments and each has its own login callback and
home page; signing into the media app takes you to caption creation, while
signing into this app takes an authorized superadmin to the admin dashboard.

## 4. Create the GitHub repository and Vercel project

Create a GitHub repository named `design-gen-ai-admin`, add this project as
its contents, then push the `main` branch. In Vercel, import that repository as
a new project with the project root set to this repository root. Add the two
Supabase environment variables and deploy.

After the app is working, turn off Vercel Deployment Protection so the
deployment URL can load in an Incognito window. This does not replace or disable
the app's Google login and superadmin checks; those remain required on the
application routes and in the database.

## Assignment submission

Submit the commit-specific deployment URLs for both the media app and this
admin app in the course's “Submissions” section. Use the Vercel deployment URL
for the latest commit, rather than only a branch alias or project homepage.
