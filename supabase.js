/* Kadirkhil High School — Supabase config
 *
 * SETUP:
 *   1. Create a Supabase project at https://supabase.com
 *   2. In SQL Editor run:
 *
 *      create table public.alumni (
 *        id          uuid primary key default gen_random_uuid(),
 *        full_name   text      not null,
 *        grad_year   int       not null,
 *        email       text,
 *        profession  text,
 *        location    text,
 *        message     text,
 *        created_at  timestamptz not null default now()
 *      );
 *      alter table public.alumni enable row level security;
 *      create policy "public read alumni"   on public.alumni for select using (true);
 *      create policy "public insert alumni" on public.alumni for insert with check (true);
 *
 *   3. Paste your project URL + anon key below.
 *   4. Set USE_SUPABASE = true.
 */

window.KHS_SUPABASE = {
  USE_SUPABASE: false,           // flip to true after you paste credentials
  URL: '',                       // e.g. 'https://xxxx.supabase.co'
  ANON_KEY: '',                  // the public anon key
  TABLE: 'alumni'
};