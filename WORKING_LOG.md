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
