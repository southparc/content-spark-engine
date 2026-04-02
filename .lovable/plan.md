
## Plan: Marketing Machine productie-klaar maken

### 1. Authenticatie (login/logout)
- Login pagina met email/wachtwoord (geen profielen)
- Beveiligde routes (alleen ingelogde gebruikers)
- Logout knop in sidebar

### 2. RLS Beveiliging
- RLS policies op alle `mm_` tabellen
- Alleen ingelogde gebruikers krijgen toegang

### 3. Content Generatie
- Na goedkeuring van topics → "Genereer content" knop
- Webhook naar n8n die per topic een post-tekst genereert
- Resultaat opslaan in `mm_posts` tabel
- Preview van gegenereerde content

### 4. Publicatie naar Socials
- "Publiceer" knop per post
- Webhook naar n8n die publiceert naar LinkedIn/X/Instagram
- Status tracking (concept → gepubliceerd)
- Publicatiedatum opslaan

### 5. Instellingen uitbreiden
- Webhook URL's voor content generatie en publicatie
- Overzicht van alle webhook configuraties
