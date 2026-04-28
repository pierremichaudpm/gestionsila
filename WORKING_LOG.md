# WORKING_LOG — Gestion SILA

## Session 2026-04-22 — Init projet, schéma Supabase, page Production

### Objectif
Poser le squelette technique complet de la plateforme et livrer la première page
fonctionnelle (tableau de contrôle). Config Supabase effective remise au lendemain.

### Ce qui a été fait

#### Init projet
- `git init` dans le dossier (le repo `/home/edgar` englobant aurait avalé les
  fichiers — repo indépendant créé à la racine du projet, branche `main`)
- Stack installée : React 19, Vite 6, Tailwind CSS v4 (via `@tailwindcss/vite`),
  React Router 7, Supabase client, ESLint 9 flat config + plugin React
- Structure : `src/{pages, components/layout, components/production, lib}`
- Layout avec sidebar navy (#1B3A5C), 5 sections + Paramètres
- 6 routes câblées, redirect `/` → `/production`, 404 → `/production`
- `netlify.toml` : build command, publish dir `dist`, SPA redirect
- `.env.example`, `.gitignore`, `README.md`
- Tokens de design dans `@theme` CSS (palette navy/accent/statuts, Inter 14px)
- Poussé sur github.com/pierremichaudpm/gestionsila (public, main)

#### Schéma Supabase
- [supabase/migrations/001_schema.sql](supabase/migrations/001_schema.sql) — 11 tables conformes au spec
- `public.users.id` référence `auth.users(id)` ON DELETE CASCADE (pattern Supabase standard)
- CHECK constraints inline pour les enums (status, access_level, category, phase…)
- Index sur tous les FK clés + `activity_log.created_at DESC`
- Trigger `updated_at` sur `documents`
- 9 helpers `SECURITY DEFINER` pour casser la récursion RLS :
  `is_project_member`, `project_access_level`, `current_user_country`,
  `current_user_org_id`, `shares_project_with`, `lot_project_id`, `lot_country`,
  `funder_project_id`, `funder_country`
- RLS activée sur les 11 tables, policies SELECT/INSERT/UPDATE/DELETE explicites
- Principe implémenté : lecture globale par projet, écriture filtrée par
  `country` ; budget admin-all / coproducer+prod_manager-own-org / contractor-rien ;
  contractor voit seulement tâches assignées et documents qu'il a uploadés
- `activity_log` append-only (SELECT + INSERT uniquement, pas d'UPDATE/DELETE)

#### Seed SILA
- [supabase/seed.sql](supabase/seed.sql) — seed dev local
- 1 project, 6 organizations, 9 users, 9 project_members, 5 lots, 7 funders
- `auth.users` inline avec mot de passe bcrypt partagé `SilaDev2026!` (dev-only)
- UUIDs conventionnels et lisibles (`11...` projet, `22...` orgs, `33...` users,
  `44...` lots, `55...` funders) pour debug facile
- Noms, pays, montants réels du CLAUDE.md (SODEC 115k CAD, FilmFund LU 167196
  EUR, etc.)
- Org "Freelance" ajoutée pour Antoine Boucherikha (pas dans la liste spec)

#### Page Production
- 4 blocs fidèles au CLAUDE.md, fetch Supabase réel, aucun mock
- **Bloc 1 Attention requise** : deliverables `(to_produce|in_progress)` ∧
  `due_date ≤ now+14j` (inclut les retards) + documents `pending` non uploadés
  par moi ; tri retard → à venir → à valider ; empty state texte exact
  « Rien à signaler. Toutes les échéances sont sous contrôle. »
- **Bloc 2 Lots** : 5 cartes avec drapeau Unicode, nom, réalisatrice, statut
  coloré, count de documents (relation Supabase embed `documents(count)`), clic
  vers `/lots`
- **Bloc 3 Prochains dépôts** : 10 prochaines échéances
  `status ∈ (to_produce, in_progress)` ∧ `due_date ≥ today`, tri ASC
- **Bloc 4 Activité récente** : 10 dernières entrées `activity_log` avec join
  `users(full_name)`, descriptions synthétisées client-side (ACTION_LABELS ×
  ENTITY_LABELS)
- Hook `useCurrentProject` qui résout le projet actif via `project_members` pour
  l'utilisateur connecté (pas d'UUID hardcodé, prêt pour multi-projet Phase 2)
- Utilitaires [src/lib/format.js](src/lib/format.js) : drapeaux, labels/tons de statuts,
  `relativeTime`, `formatDate`, `daysUntil`
- Skeletons `animate-pulse` (pas de spinners, conforme au spec), empty states
  contextuels par bloc, gestion d'erreur isolée (un bloc en échec n'affecte pas
  les autres)

### Décisions techniques

- **Helpers `SECURITY DEFINER` pour la RLS** — nécessaire car plusieurs policies
  interrogent `project_members` qui a lui-même de la RLS. Sans SECURITY DEFINER,
  récursion infinie au premier SELECT.
- **`public.users.id` FK à `auth.users(id)`** — pattern Supabase canonique.
  Coût : le seed doit créer `auth.users` inline pour satisfaire la FK.
- **`auth.users` seedés dans le seed avec bcrypt partagé** — permet un seed
  cohérent utilisable immédiatement. Marqué dev-only dans le fichier.
- **CHECK constraints plutôt qu'ENUM types** — plus faciles à modifier en
  migration incrémentale (drop/add) qu'un `ALTER TYPE … ADD VALUE`.
- **`funders.beneficiary_org_id` ajouté** — hors spec strict mais l'UX Livrables
  « Vue par bailleur » affiche l'org bénéficiaire, et le seed a cette info
  (colonne Bénéficiaire).
- **`react-query` écarté en Phase 1** — `useEffect` + `useState` suffisent pour
  4 queries isolées. Ajout possible si Phase 2 a besoin de cache/invalidation.
- **Un bloc = un composant** — isolation des failures, skeletons dédiés,
  lisibilité. Coût minime (4 fichiers) comparé au monolithe.
- **`projectId` via hook plutôt qu'hardcodé** — pas de référence au UUID SILA
  dans le frontend, facile à tester et extensible.
- **Drapeaux Unicode** — le spec dit explicitement « Pays (drapeau) ». Fallback
  en lettres sur Windows acceptable.
- **`react/no-unescaped-entities` désactivé** — apostrophes françaises partout
  dans les strings JSX, règle trop agressive pour un contenu francophone.

### Problèmes rencontrés

- Le git status initial a révélé que le repo englobant est rooté à `/home/edgar`
  avec des centaines de fichiers personnels non-trackés. `git init` dans le
  dossier projet crée un repo indépendant (Git s'arrête au premier `.git`).
- ESLint recommended flaggait tous les imports de composants React JSX comme
  unused (ne reconnaît pas l'usage en JSX) → ajout `eslint-plugin-react` avec
  `jsx-uses-vars`.
- Pas de Postgres local (ni `psql` ni `supabase` CLI ni Docker) → impossible de
  valider la syntaxe SQL. À tester via `supabase db reset` demain.
- Pas de browser CLI pour tester visuellement la page Production → build + lint
  + dev server OK, mais rendu et fetch réels non vérifiés. Reporté à demain
  avec Supabase configuré.
- Spec « Documents en attente de validation (soumis par une autre équipe) »
  ambigu. Retenu : « autre personne » (`uploaded_by ≠ auth.uid()`), cohérent
  avec la règle « approbation dans le pays du document ».
- Tailwind v4 `@theme` génère bien les utilitaires `bg-brand-navy`, `text-brand-navy`
  etc. (vérifié via build : le CSS final fait 15,6 kB avec les tokens personnalisés).

### Prochaines étapes

1. **2026-04-23 — Config Supabase** : créer projet cloud, appliquer
   `001_schema.sql` puis `seed.sql`, copier URL + anon key dans `.env.local`
2. Tester la page Production end-to-end : login Virginie (voit tout) vs William
   (ne peut écrire qu'en FR), vérifier le bloc Attention avec deliverables
   seedés (il faudra ajouter quelques deliverables au seed pour qu'il ait du
   contenu à afficher)
3. **Auth flow** : page `/login`, `ProtectedRoute` qui redirige si pas de session,
   user info + logout dans la sidebar
4. **Pages manquantes** :
   - Lots (liste cards + détail avec onglets Documents/Livrables)
   - Documents (table triable/filtrable + modal "+ Nouveau document" + workflow
     Soumettre/Approuver/Archiver conditionné par rôle et pays)
   - Livrables (accordéon par bailleur + toggle Vue calendrier)
   - Équipe (annuaire groupé par org)
   - Paramètres (admin only)
5. **Activity log** : triggers Postgres ou écriture explicite côté frontend à
   chaque mutation (document créé, statut changé, etc.)
6. **Déploiement Netlify** : connecter le repo, env vars Supabase, DNS
7. **Phase 2** : Gantt (M2), Budget (M4), Dashboards (M6), exports PDF


## Session 2026-04-27 — Phase 1 + Phase 2 livrées, déployées en prod

### Objectif
Reprendre depuis le scaffold du 2026-04-22, configurer Supabase live, livrer
toute la Phase 1 (auth + 5 pages CRUD), enchaîner avec Phase 2 (Calendrier,
Budget, Dashboard agrégé), déployer sur Netlify avec connexion réelle aux
données. Polish design (logos, fond vintage, sidebar) + livrer un guide
utilisateur Word pour Virginie.

### Ce qui a été fait

#### Configuration Supabase live
- Install CLI 2.95.4, `supabase login`, `supabase link --project-ref qqyrqiqnvsvzxqqukcjv`
- `supabase db push` → migration 001 appliquée
- Seed appliqué via `psql` direct sur le pooler (`.temp/pooler-url`) — `db seed` ne marche pas pour les projets cloud
- Récupération anon key + URL via `supabase projects api-keys`, `.env.local` créé et gitignored

#### Auth flow (Phase 1)
- `AuthProvider` context + `useAuth` hook (session via `onAuthStateChange`, profile via `public.users`)
- `ProtectedRoute` avec redirect `/login` + `state.from`
- Page Login avec gestion d'erreur inline et redirect post-login
- Sidebar : profil + bouton logout en bas

#### Phase 1 — pages CRUD livrées
- **Lots** : grid de cards + page détail `/lots/:id` avec status modifiable selon le pays + onglets Documents (réel) / Livrables (placeholder, schéma manque le lien lot↔livrable)
- **Documents** : table sortable, 4 filtres combinables, pagination 25, modal "+ Nouveau document" avec auto-incrément version, workflow Soumettre/Approuver/Archiver conditionné par rôle + pays
- **Livrables** : accordéon par bailleur, dropdowns statut, modal "+ Livrable", toggle vue Calendrier
- **Équipe** : annuaire groupé par organisation
- Composant `Modal` partagé (Esc + click outside), Discord link sidebar (placeholder)

#### GitHub + Netlify
- Push initial Phase 1 — `feat: pages...` (24 fichiers, +3425/-47)
- `netlify sites:create --account-slug pmicho` (le `--name` seul ne suffit pas)
- Env vars `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` posées via CLI
- `netlify deploy --prod --build` → https://gestion-sila.netlify.app
- Auto-deploy GitHub : pas configuré (étape UI à faire séparément)

#### Phase 2 — M4 Budget
- Migration 002 : table `project_settings` (taux EUR→CAD fixe par projet), drop+create de `budget_lines_select` pour que coproducer voie tous les budgets
- Page Budget avec 3 vues : par coproducteur (édition inline), consolidée (admin only, conversion CAD/EUR avec totaux 4 cellules), par lot
- `BudgetLineRow` : inputs save-on-blur, optimistic updates avec rollback si Supabase rejette
- 11 lignes seed (JAXA 4 lignes CAD, DE 4 EUR, PB 3 EUR), taux 1 EUR = 1.50 CAD

#### Phase 2 — M2 Calendrier
- Migration 003 : table `milestones` (id, project_id, lot_id, title, date, type, country, notes, created_by) avec RLS admin (any country) / coproducer (own country)
- Page Calendrier : timeline verticale groupée par mois, rail navy avec puces, badges colorés par type
- Source fusionnée : `milestones` + `deliverables.due_date` (livrables typés `depot_fonds`)
- 3 filtres pays/type/lot, modal "+ Jalon" (admin libre, coproducer figé sur son pays)
- `formatDateOnly` + `formatMonth` ajoutés à `format.js` (TZ-safe pour colonnes PG `date`)
- Seed : 6 milestones + 5 deliverables datés

#### Phase 2 — M6 Dashboard agrégé
- Migration 004 : function `log_activity()` + 4 triggers AFTER INSERT/UPDATE
- Anti-noise : INSERT toujours loggué ; UPDATE filtré (documents seulement quand `validation_status` change ; deliverables sur `status` ; milestones sur `title`/`date` ; budget_lines pas du tout)
- 4 blocs Production refaits : Attention ajoute milestones ≤14j ; Lots affiche `docs+jalons` count ; Upcoming fusionne deliverables+milestones top 10 avec badges type ; Activity ajoute `milestone` aux ENTITY_LABELS

#### Email + équipe
- Virginie Jaffredo : email réel `virginiejaffredo@jaxa.ca` (était `virginie@jaxaproduction.com` placeholder)
- Pierre Michaud (Dev outils JAXA) remplace Axelle Michaud dans le seed (DB live + seed.sql)
- Mémoire projet créée : `project_seed_emails.md` (les 7 autres utilisateurs restent en placeholders)

#### Design polish (multiples itérations)
- Sidebar : 240→280→320px ; logos 48→72→88px ; padding 6→8→10px ; gap 10→10→12px
- Logos : Poulpe Bleu en `object-cover` (le JPG a des coins blancs qu'il faut clipper au cercle), JAXA + Dark Euphoria en `object-contain` avec padding (PNGs transparents)
- Sidebar : "Production" → "Dashboard" en label, titre `text-2xl bold` sur 2 lignes ("SILA" / "Héroïnes Arctiques"), logos déplacés au-dessus du titre
- Nav : `px-3 py-2 text-sm` → `px-4 py-2.5 text-[15px]` (plus aérée pour la nouvelle largeur)
- Bloc utilisateur : tailles de texte bumpées (`text-base` pour le nom, `text-sm` pour pays/bouton)
- Fond : crème vintage `#f1e2bc` + SVG noise `feTurbulence baseFrequency=0.7` à 28% d'alpha tinté brun, Layout/Login passés en transparent pour laisser le grain transparaître
- Footer "Propulsé par Studio Micho · Jaxa" sur toutes les pages protégées
- Entêtes section H2 : `text-xs` → `text-sm` (+17%)

#### Documentation client
- `GUIDE_VIRGINIE.docx` (16 pages) généré via python-docx — couverture, vue d'ensemble, page dédiée par module, permissions, premiers pas, Discord, contact, mention Phase 3
- Palette navy/accent, polices Arial, callouts crème, tableau permissions
- Non committé (livrable client à transmettre par courriel/Drive)

### Décisions techniques

- **`psql` vs `supabase db seed`** : `db seed` ne marche pas pour les projets cloud (que pour Docker local). Utilisation directe du pooler URL (`.temp/pooler-url`) avec `psql -v ON_ERROR_STOP=1` pour les inserts.
- **Triggers activity_log avec filtres anti-noise** : sur UPDATE, on ne logge que les transitions de champs « significatifs ». Sinon l'édition inline du Budget polluerait le journal. Documents → transitions `validation_status`. Deliverables → changements `status`. Milestones → `title` ou `date`. Budget_lines → INSERT seulement.
- **Inline editing du Budget** : drafts en state local par row, save-on-blur, optimistic update au niveau parent avec rollback si Supabase rejette. Modal seulement pour la création (et même la création est un INSERT direct avec valeurs par défaut, l'utilisateur édite ensuite inline).
- **JPG vs PNG dans cercle clippé** : Poulpe Bleu (JPG avec coins blancs) → `object-cover` sans padding pour que les coins blancs sortent du cercle (clippés par `overflow-hidden + rounded-full`). JAXA + Dark Euphoria (PNG transparents) → `object-contain` avec padding 10px pour respecter leur marge naturelle.
- **Fond vintage SVG inline** : `feTurbulence` data-URI (`baseFrequency=0.7` pour gros grain, `numOctaves=2`, alpha 28%, tint brun via `feColorMatrix`). Layout et Login passés en transparent pour que le body grain transparaisse.
- **`formatDateOnly`** : les colonnes PG `date` (sans heure) parsées avec `new Date('2026-06-15')` donnent UTC midnight, ce qui s'affiche comme la veille en zone CA. Helper dédié qui force `Date.UTC(y, m-1, d)` + `timeZone='UTC'` pour le `toLocaleDateString`.
- **Sidebar 320px** : 88×3 + 12×2 = 288 + padding (px-4 = 32) = 320 → fit exact. Le bloc titre passe en `px-4` alors que la nav reste à `px-3` pour préserver le rythme visuel.
- **Permissions UI vs RLS** : on cache les boutons côté UI selon le rôle/pays, mais la RLS rejette aussi côté serveur. Les deux couches doivent rester cohérentes — toute modif d'autorisation doit toucher les deux.
- **Convention de nommage migrations** : `001_schema.sql` → non standard Supabase (`YYYYMMDDHHmmss_name.sql`), mais accepté par le CLI comme version « 001 ». Toutes les migrations suivantes (002, 003, 004) ont gardé cette convention pour cohérence — tri lexicographique reste correct.

### Problèmes rencontrés

- `supabase sites:create --name <x>` réclame le team slug en interactif → ajouter `--account-slug pmicho` pour automatiser.
- Vite a affiché une erreur HMR transitoire pendant l'écriture séquentielle de `Livrables.jsx` + `NewDeliverableModal.jsx` (race entre les writes). Auto-résolu au prochain HMR. Leçon : écrire les fichiers importés avant les fichiers qui les importent, ou batcher en parallèle.
- `python-docx` 1.2 : `add_break(6)` lève `KeyError` car l'enum n'accepte pas les ints littéraux. Importer `WD_BREAK` depuis `docx.enum.text` et passer `WD_BREAK.PAGE`.
- Bundle Vite > 500 ko (warning code-splitting). Ignoré pour l'instant — chargement initial reste rapide via gzip (~145 ko). Optimisation possible avec `React.lazy()` si besoin futur.
- Schéma manquant : pas de table de jointure entre `lots` et `milestones` (l'onglet Livrables d'un lot affiche un placeholder), ni entre `deliverables` et `documents` (la fonctionnalité "documents liés" du spec Livrables est repoussée).
- Logos déposés dans `logos/` se restagent à chaque `git add -A` — j'ai utilisé `git reset HEAD logos/` à plusieurs reprises pour ne pas les committer (les vrais maîtres servis par l'app sont dans `public/logos/`).

### Prochaines étapes

1. **Auto-deploy GitHub via Netlify UI** : connecter le repo dans Netlify Settings → Continuous Deployment pour que `git push` redéploie automatiquement.
2. **Vrais emails équipe** : Mathieu, Marie, William, Hélène, Anne-Lise, Raphaël, Antoine sont en placeholders. À corriger seed + DB live quand Virginie fournit la liste.
3. **Page Paramètres** : actuellement placeholder vide. À construire pour configurer le lien Discord, gérer l'équipe (admin invite/édit/supprime), choisir des catégories de documents personnalisées.
4. **Migration 005 éventuelle** : ajouter table de jointure `lot_milestones` (ou colonne `milestones.lot_id` déjà là, donc juste exposer correctement) + table `deliverable_documents` pour la fonctionnalité "documents liés" du spec Livrables.
5. **Phase 3 (à chiffrer si Virginie valide)** :
   - Notifications email Resend (rappels échéances, validation en attente)
   - Exports PDF (état d'avancement par bailleur, mise en page propre pour SODEC/CNC)
   - Génération assistée de rapports avec IA
6. **Code splitting éventuel** : `React.lazy()` sur Budget et Calendrier (les pages les plus gourmandes).
7. **Transmettre `GUIDE_VIRGINIE.docx`** à Virginie par courriel ou Drive.
