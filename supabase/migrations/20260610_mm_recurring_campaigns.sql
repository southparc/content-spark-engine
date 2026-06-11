-- Terugkerende campagnes voor de Marketing Machine scheduler (2-3x/week per klant).
-- De n8n-workflow "MM Scheduler" (Qam6Fffg8xoc4jJY) leest deze tabel dagelijks om 09:00.
create table if not exists public.mm_recurring_campaigns (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.mm_clients(id) on delete cascade,
  -- Koppeling naar de mm_campaigns-rij waaronder gegenereerde topics in de app verschijnen
  campaign_id uuid references public.mm_campaigns(id) on delete set null,
  theme text not null,
  onderwerp text not null default '',
  keyword text not null default '',
  platforms text[] not null default array['linkedin','x','instagram'],
  frequency_per_week int not null default 3 check (frequency_per_week between 1 and 7),
  auto_publish boolean not null default false,
  active boolean not null default true,
  last_run_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.mm_recurring_campaigns enable row level security;

create policy "Authenticated users full access on mm_recurring_campaigns"
  on public.mm_recurring_campaigns
  for all
  to authenticated
  using (true)
  with check (true);
