// Creates every table the app needs and turns on row-level security.
// Safe to run again: each step only creates what is missing.
// Runs automatically before every Vercel build (see "build" in package.json).
import pg from "pg"

// Next.js reads .env.local on its own, but plain node scripts do not.
try {
  process.loadEnvFile?.(".env.local")
} catch {}

const url = process.env.DATABASE_URL
if (!url) {
  console.error(
    "\nDATABASE_URL is not set.\n" +
      "On Vercel: add the Neon integration to this project, then redeploy.\n" +
      "On your laptop: copy .env.example to .env.local and fill it in.\n",
  )
  process.exit(1)
}

const sql = `
-- 1. Sign-in tables (Better Auth). Passwords are hashed by Better Auth, never stored plain.
create table if not exists "user" (
  "id" text primary key,
  "name" text not null,
  "email" text not null unique,
  "emailVerified" boolean not null default false,
  "image" text,
  "createdAt" timestamptz not null default now(),
  "updatedAt" timestamptz not null default now()
);

create table if not exists "session" (
  "id" text primary key,
  "expiresAt" timestamptz not null,
  "token" text not null unique,
  "createdAt" timestamptz not null default now(),
  "updatedAt" timestamptz not null default now(),
  "ipAddress" text,
  "userAgent" text,
  "userId" text not null references "user"("id") on delete cascade
);

create table if not exists "account" (
  "id" text primary key,
  "accountId" text not null,
  "providerId" text not null,
  "userId" text not null references "user"("id") on delete cascade,
  "accessToken" text,
  "refreshToken" text,
  "idToken" text,
  "accessTokenExpiresAt" timestamptz,
  "refreshTokenExpiresAt" timestamptz,
  "scope" text,
  "password" text,
  "createdAt" timestamptz not null default now(),
  "updatedAt" timestamptz not null default now()
);

create table if not exists "verification" (
  "id" text primary key,
  "identifier" text not null,
  "value" text not null,
  "expiresAt" timestamptz not null,
  "createdAt" timestamptz not null default now(),
  "updatedAt" timestamptz not null default now()
);

-- 2. Your app's data. Change this table to fit what you are building.
create table if not exists suggestions (
  id uuid primary key default gen_random_uuid(),
  user_id text not null default current_setting('app.user_id', true)
    references "user"("id") on delete cascade,
  goal text not null,
  answer text not null,
  guardrail jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists suggestions_user_id_idx on suggestions (user_id);

-- Turkey Pardon Court: one row per case. The ruling is written by the server, never the browser.
create table if not exists cases (
  id uuid primary key default gen_random_uuid(),
  user_id text not null default current_setting('app.user_id', true)
    references "user"("id") on delete cascade,
  turkey text not null,
  alleged_crime text not null,
  plea text not null,
  argument text not null,
  ruling text check (ruling in ('pardoned', 'dinner')),
  reasoning text,
  guardrail jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
alter table cases add column if not exists guardrail jsonb not null default '{}'::jsonb;
create index if not exists cases_user_id_idx on cases (user_id);

-- 3. A low-power role the app switches to for every data query.
--    Table owners skip row rules, so the app must NOT query as the owner.
do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'app_user') then
    create role app_user nologin;
  end if;
end
$$;
grant app_user to current_user;
grant usage on schema public to app_user;
grant select, insert, update, delete on suggestions to app_user;

-- 4. The row rule: you only ever see and change your own rows.
alter table suggestions enable row level security;
drop policy if exists "own rows only" on suggestions;
create policy "own rows only"
  on suggestions for all
  to app_user
  using (user_id = current_setting('app.user_id', true))
  with check (user_id = current_setting('app.user_id', true));

-- 5. Same row rule for cases. No "update" grant on purpose: a ruling can never be changed,
--    not even by the turkey's own lawyer. You can file a case or throw it out, that's it.
grant select, insert, delete on cases to app_user;
revoke update on cases from app_user;
alter table cases enable row level security;
drop policy if exists "own rows only" on cases;
create policy "own rows only"
  on cases for all
  to app_user
  using (user_id = current_setting('app.user_id', true))
  with check (user_id = current_setting('app.user_id', true));
`

const client = new pg.Client({ connectionString: url })
try {
  await client.connect()
  await client.query(sql)
  console.log("Database ready: sign-in tables, suggestions and cases tables, row-level security on.")
} catch (error) {
  console.error("Database setup failed:", error.message)
  process.exit(1)
} finally {
  await client.end()
}
