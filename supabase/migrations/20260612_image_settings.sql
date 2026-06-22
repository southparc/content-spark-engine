-- Beeld-instellingen voor de Marketing Machine: globaal instelbaar + per-klant override.
-- Vervangt de hardcoded waarden (gpt-image-1-mini / medium / vaste prompt / 1024x1024)
-- in de beeldgeneratie. Toegepast door de edge function `generate-image`.

-- Globale defaults (singleton-rij 'global')
create table if not exists public.mm_image_settings (
  id text primary key default 'global',
  provider text not null default 'openai',
  model text not null default 'gpt-image-1',
  quality text not null default 'high',
  style_prompt text not null default 'clean en professioneel, conceptuele fotografie of minimalistische illustratie, rustig kleurpalet met een subtiel accent, kalme zakelijke sfeer',
  negative_prompt text not null default 'geen tekst, geen logo, geen herkenbare gezichten, geen cliche-robots of gloeiende hersenen',
  updated_at timestamptz not null default now()
);
alter table public.mm_image_settings enable row level security;
create policy "Authenticated full access on mm_image_settings"
  on public.mm_image_settings for all to authenticated using (true) with check (true);

-- Per-kanaal formaat (platform -> pixels)
create table if not exists public.mm_channel_formats (
  id uuid primary key default gen_random_uuid(),
  platform text unique not null,
  width int not null,
  height int not null
);
alter table public.mm_channel_formats enable row level security;
create policy "Authenticated full access on mm_channel_formats"
  on public.mm_channel_formats for all to authenticated using (true) with check (true);

-- Per-klant overrides (allemaal nullable: leeg = globale default)
alter table public.mm_clients
  add column if not exists img_provider text,
  add column if not exists img_model text,
  add column if not exists img_quality text,
  add column if not exists img_style_prompt text,
  add column if not exists img_negative_prompt text,
  add column if not exists brand_colors jsonb,      -- ["#477a92", ...]
  add column if not exists img_seed int,
  -- Gereserveerd voor de latere design/compositie-laag (logo + tekst over beeld)
  add column if not exists brand_kit jsonb;

-- Seeds
insert into public.mm_image_settings (id) values ('global') on conflict (id) do nothing;
insert into public.mm_channel_formats (platform, width, height) values
  ('linkedin', 1200, 1200),
  ('x', 1200, 1200),
  ('instagram', 1080, 1350),
  ('instagram_story', 1080, 1920),
  ('reel', 1080, 1920),
  ('facebook', 1200, 1200),
  ('default', 1080, 1080)
on conflict (platform) do nothing;
