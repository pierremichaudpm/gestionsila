# SILA — Plateforme de gestion de coproduction

## Projet
Outil de gestion de production pour coproductions internationales. Première instance : SILA — Héroïnes Arctiques (VR 25 min, coproduction QC/FR/LU). Architecture multi-tenant — chaque production est un projet, réutilisable pour les futures productions JAXA.

**Ref :** SM-2026-SILA
**Client :** JAXA Production inc. (Virginie Jaffredo)
**Budget Phase 1 :** 3 500 $ CAD
**Deadline :** Opérationnel mi-mai 2026

## État d'avancement (2026-04-28)

**Phase 1 ✓ — déployée en prod : [https://gestion-sila.netlify.app](https://gestion-sila.netlify.app)**
- Auth flow complet : AuthProvider context, ProtectedRoute, page Login, profil + logout dans la sidebar
- Connexion Supabase live (project ref `qqyrqiqnvsvzxqqukcjv`, East US Ohio), migration + seed appliqués
- 5 pages CRUD : Lots (liste + détail onglets), Documents (table triable + 4 filtres + modal + workflow validation), Livrables (accordéon par bailleur + vue calendrier), Équipe (annuaire par org), Production (dashboard 4 blocs)
- Discord link dans la sidebar (placeholder `href="#"`), à brancher dans Paramètres en Phase 3
- 3 logos coproducteurs (JAXA / Dark Euphoria / Poulpe Bleu) en cercles dans la sidebar
- Composant Modal partagé (Esc + click outside)

**Phase 2 ✓ — déployée**
- **M2 Calendrier** : timeline verticale unifiée (jalons + livrables fusionnés), regroupée par mois, badges colorés par type, filtres pays/type/lot, modal "+ Jalon" (admin libre, coproducer figé sur son pays)
- **M4 Budget** : 3 vues (par coproducteur avec édition inline, consolidée admin avec conversion CAD/EUR, par lot), taux EUR→CAD fixe modifiable par admin, conversion calculée client-side
- **M6 Dashboard** : 4 blocs aggrégent les nouvelles données (milestones dans Attention et Lots count, fusion deliverables+milestones dans Échéances), `activity_log` alimenté automatiquement par triggers PostgreSQL

**Phase 2.5 ✓ — module commentaires contextuels (déployée)**
- Fils de discussion attachés aux entités métier (document, deliverable, milestone, lot, budget_line). Pas de chat global — Discord reste l'outil de conversation, Drive garde ses commentaires sur les fichiers.
- Composant réutilisable `<CommentThread>` + badge cliquable `<CommentBadge>` + hook bulk `useCommentCounts`
- Câblé sur 5 pages : Documents (expansion inline), Livrables (expansion inline), Calendrier (modal détail jalon), Lots (section bas de page), Budget sur ses 3 vues (Par coproducteur / Consolidée / Par lot — état d'expansion partagé)
- Trigger PostgreSQL `log_comment_activity` qui résout le titre du parent et insère dans `activity_log` avec action `commented` → s'affiche dans "Activité récente" du dashboard
- Pas de mentions @user, pas d'édition (suppression seulement par l'auteur), pas de threads imbriqués, pas de notifications email — repoussés en Phase 3

**Migrations**
- 001 — schéma initial (11 tables, RLS, helpers SECURITY DEFINER)
- 002 — `project_settings` (taux change) + RLS budget_lines élargie pour coproducer
- 003 — table `milestones` (timeline calendrier)
- 004 — triggers `activity_log` (anti-noise : INSERT toujours, UPDATE filtré sur champs significatifs)
- 005 — table `comments` + RLS (lecture membres, insert sauf contractor sauf sur ses propres docs, update/delete auteur) + trigger activity_log

**Hosting**
- Auto-deploy GitHub → Netlify activé depuis 2026-04-28 (lien repo dans Netlify dashboard, branche `main`, ~12s de build par push)

**Design appliqué**
- Sidebar 320px navy avec 3 logos circulaires 88px (Poulpe Bleu en `object-cover`, autres en `object-contain` padding 10px), titre "SILA / Héroïnes Arctiques" sur 2 lignes en `text-2xl bold`
- Fond crème vintage `#f1e2bc` avec grain SVG (`feTurbulence baseFrequency=0.7`, brun à 28% d'alpha)
- Footer "Propulsé par Studio Micho · Jaxa" sur toutes les pages protégées
- Sidebar nav : `Production` renommé `Dashboard`

**Données**
- Emails réels : `virginiejaffredo@jaxa.ca` (Virginie, admin) et `pierre.michaud@jaxa.ca` (Pierre Michaud — Dev outils, remplace Axelle dans le seed)
- 7 autres utilisateurs encore en placeholders (Mathieu, Marie, William, Hélène, Anne-Lise, Raphaël, Antoine) — à corriger avant la mise en prod réelle

**Phase 3 — non planifiée, non chiffrée**
- Notifications email Resend (rappels échéances, validations en attente, nouveaux commentaires)
- Exports PDF (état d'avancement par bailleur, mise en page propre pour SODEC/CNC)
- Génération assistée de rapports avec IA
- Page Paramètres (config Discord URL, gestion équipe depuis l'UI, catégories documents personnalisables)
- Module commentaires : mentions @user, édition de commentaire, threads imbriqués
- Migration 006 éventuelle pour lier lots ↔ milestones et deliverables ↔ documents (jonctions actuellement absentes)

**Documentation client**
- `GUIDE_VIRGINIE.docx` (16 pages, palette navy/accent) — guide d'accompagnement non committé, à transmettre par courriel

**Journal complet :** voir [WORKING_LOG.md](WORKING_LOG.md).

## Stack
- **Frontend :** React 19 + Vite + Tailwind CSS
- **Hosting :** Netlify
- **Backend :** Supabase (PostgreSQL, Auth, RLS, Realtime)
- **Storage :** Google Drive (existant, pas de migration) — l'outil indexe les métadonnées, les fichiers restent sur Drive
- **Email :** Resend (notifications)
- **Repo :** GitHub (SSH)

## Décisions d'architecture

### Multi-tenant
- Table `projects` au sommet. Tout est rattaché à un `project_id`.
- Les "tableaux" SILA → "lots" génériques. Les "fonds" → "bailleurs".
- Créer une production = créer un projet. Mêmes modules disponibles.

### Permissions (RLS) — Principe Virginie
**Tout le monde lit tout. Personne ne modifie les documents d'un autre pays.**

- **Lecture :** accès au projet = lecture de tout (documents, lots, livrables, équipes)
- **Écriture :** filtrée par `country` (champ sur users, lots, documents)
- **Budget :** lecture filtrée par org pour coproducteur/chargé, lecture totale pour admin
- **Prestataire :** accès uniquement aux tâches/documents assignés

Quatre niveaux d'accès (access_level dans project_members) :
1. `admin` — Virginie. Lecture tout, écriture son pays, budget tous.
2. `coproducer` — Mathieu (DE), Hélène (PB). Lecture tout, écriture son pays, budget son org.
3. `production_manager` — William, Anne-Lise. Lecture tout, écriture son pays, budget son org (lecture seule).
4. `contractor` — Voulez-Vous, Antoine. Uniquement tâches/docs assignés.

### Documents — Google Drive comme source
- Les fichiers restent sur Drive. L'outil stocke : URL Drive, titre, catégorie, lot, version, country, validation_status.
- Workflow de validation : draft → pending → approved → archived.
- Pas de stockage de fichiers dans Supabase Storage (sauf exports générés par l'outil).

### Communication
- Discord reste l'outil de communication. Pas de module chat dans l'outil.
- M7 (Communication) retiré de la feuille de route ou réduit à un journal d'activité.

## Modèle de données — 10 tables

### projects
id (uuid PK), name, description, status, created_at

### organizations
id (uuid PK), name, country, currency (CAD|EUR), role (producer|coproducer|contractor|distributor|funder)

### users
id (uuid PK), org_id (FK), email, full_name, role, country

### project_members
id (uuid PK), project_id (FK), org_id (FK), user_id (FK), access_level (admin|coproducer|production_manager|contractor)

### lots
id (uuid PK), project_id (FK), org_id (FK), name, director, country, status (prototype|in_production|post_production|delivered), sort_order

### tasks
id (uuid PK), lot_id (FK), assigned_to (FK user), title, phase (dev|shooting|post|integration|delivery), start_date, end_date, status, depends_on (FK task, nullable)

### documents
id (uuid PK), project_id (FK), lot_id (FK, nullable), uploaded_by (FK user), title, category (contract|scenario|artistic_dossier|report|technical_deliverable|invoice), country, version (int), validation_status (draft|pending|approved|archived), drive_url, drive_file_id, created_at, updated_at

### budget_lines
id (uuid PK), project_id (FK), lot_id (FK, nullable), org_id (FK), funder_id (FK, nullable), category, planned (decimal), actual (decimal), currency, exchange_rate (decimal, nullable)

### funders
id (uuid PK), project_id (FK), name, country, amount (decimal), currency, status (acquired|expected|to_confirm)

### deliverables
id (uuid PK), funder_id (FK), title, due_date, status (to_produce|in_progress|submitted|validated), notes

### activity_log
id (uuid PK), project_id (FK), user_id (FK), action, entity_type, entity_id, metadata (jsonb), created_at

## Phase 1 — Périmètre (3 500 $, deadline mi-mai)
1. **Socle** — Auth, multi-tenant, RLS, infrastructure
2. **M1 — Équipes** — CRUD orgs, users, project_members, annuaire
3. **M3 — Documents** — Fiches documentaires liées à Drive, versioning métadonnées, workflow validation
4. **M5 — Livrables/Bailleurs** — CRUD funders, deliverables, calendrier dépôts, statuts

## Phases futures (non chiffrées)
- **Phase 2 :** M2 (Gantt), M4 (Budget), M6 (Dashboards)
- **Phase 3 :** Journal d'activité avancé, génération rapports IA, intégration calendrier festivals

## Données SILA — Configuration initiale

### Organisations
| Nom | Pays | Devise | Rôle |
|-----|------|--------|------|
| JAXA Production inc. | CA | CAD | producer |
| Dark Euphoria | FR | EUR | coproducer |
| Poulpe Bleu Production | LU | EUR | coproducer |
| Voulez-Vous Studio | FR | EUR | contractor |
| Diversion Cinema | FR | EUR | distributor |

### Lots (Tableaux SILA)
| # | Nom | Réalisatrice | Pays | Org | Statut |
|---|-----|-------------|------|-----|--------|
| I | Le Naufrage — Mary Shelley | Agnès de Cayeux | FR | Dark Euphoria | prototype |
| II | La Presqu'île aux tombeaux — Léonie d'Aunet | Mélanie Courtinat | FR | Dark Euphoria | prototype |
| III | La Titanide de glace — George Sand | Laura Mannelli | LU | Poulpe Bleu | prototype |
| IV | Les Phénomènes — Eunice Newton Foote | Aude Guivarc'h | CA | JAXA | in_production |
| V | Le Data Center — Ellen H. Rasmussen | Agnès de Cayeux | FR | Dark Euphoria | prototype |

### Bailleurs
| Nom | Pays | Montant | Devise | Statut | Bénéficiaire |
|-----|------|---------|--------|--------|-------------|
| SODEC — Volet 2 | CA | 115 000 | CAD | acquired | JAXA |
| CNC — Création Immersive | FR | 90 000 | EUR | acquired | Dark Euphoria |
| FilmFund Luxembourg — Dév. | LU | 45 000 | EUR | acquired | Poulpe Bleu |
| FilmFund Luxembourg — Prod. | LU | 167 196 | EUR | expected | Poulpe Bleu |
| Pictanovo | FR | 12 000 | EUR | expected | Dark Euphoria |
| Région SUD PACA | FR | 33 000 | EUR | acquired | Dark Euphoria |
| Métropole Montpellier | FR | 15 000 | EUR | acquired | Dark Euphoria |

### Équipes clés
- Virginie Jaffredo — JAXA — Productrice (admin)
- Axelle Michaud — JAXA — Coordinatrice
- Mathieu Rozières — Dark Euphoria — Producteur délégué (coproducer)
- Marie Point — Dark Euphoria — Productrice
- William Board — Dark Euphoria — Chargé de production (production_manager)
- Hélène Walland — Poulpe Bleu — Gérante/Productrice (coproducer)
- Anne-Lise Miller — Poulpe Bleu — Chargée de production (production_manager)
- Raphaël Chênais — Voulez-Vous Studio — Direction technologique (contractor)
- Antoine Boucherikha — Freelance — Conception sonore (contractor)

## UX — Architecture de l'interface

### Qui utilise l'outil et pourquoi
Productrices et chargés de production en coproduction internationale. Pas des gens techniques. Souvent en déplacement, entre deux réunions avec un fonds ou un tournage. Ils ouvrent l'outil pour répondre à UNE question : **"Est-ce qu'on est en retard quelque part?"**

L'interface doit donner la réponse en 3 secondes. Pas de graphiques, pas de widgets décoratifs. Des listes, des statuts, des dates, des actions.

### Principe fondamental : une seule interface, filtrée par rôle
Virginie (admin) voit tout. Mathieu (Dark Euphoria) voit les mêmes pages, mais filtrées automatiquement sur son organisation par le RLS. Pas de "dashboard producteur" vs "dashboard coproducteur" — c'est la même app, les données changent. Chaque coproducteur a l'impression d'avoir SON outil.

### Navigation
Sidebar gauche, 5 sections + paramètres :

1. **Production** — le tableau de contrôle (landing page)
2. **Lots** — les tableaux de la production (5 pour SILA)
3. **Documents** — fiches documentaires centralisées (fichiers sur Drive)
4. **Livrables** — suivi par bailleur
5. **Équipe** — annuaire des partenaires

En bas de sidebar : **Paramètres** (admin seulement)
En haut : nom du projet actif (SILA — Héroïnes Arctiques). Sélecteur de projet quand il y en aura plusieurs.

### 1. Production — Tableau de contrôle (landing page)

C'est la page la plus importante. Elle répond aux 6 enjeux identifiés par Virginie dans son document de besoins. Elle se lit de haut en bas, du plus urgent au plus contextuel.

**Bloc 1 — Attention requise**
Liste des items qui demandent une action immédiate :
- Livrables dont la date d'échéance est dans les 14 prochains jours (badge bailleur + date + statut)
- Documents en attente de validation (soumis par une autre équipe)
- Livrables en retard (date dépassée, statut pas "soumis" ni "validé")
Chaque item est cliquable → amène directement à la fiche concernée.
Si la liste est vide : "Rien à signaler. Toutes les échéances sont sous contrôle." (Ce message est important — l'absence d'alerte est une information.)

**Bloc 2 — Lots**
Les 5 tableaux SILA en ligne horizontale. Pour chaque lot :
- Nom court + réalisatrice
- Pastille de statut (couleur + texte : prototype, en production, post-prod, livré)
- Pays (drapeau)
- Nombre de documents liés
Clic → page détail du lot.

**Bloc 3 — Prochains dépôts aux bailleurs**
Liste chronologique des 10 prochaines échéances de livrables, tous bailleurs confondus :
- Date — Bailleur — Titre du livrable — Statut
C'est le calendrier minimal de Phase 1. Remplace le Gantt en attendant Phase 2.

**Bloc 4 — Activité récente**
Les 10 dernières actions dans le projet (journal d'activité) :
- "Virginie a ajouté un document : Rapport SODEC Q1" — il y a 2h
- "William a soumis pour validation : Budget DE Tableau V" — hier
Pas de commentaires, pas de chat. Juste la trace de qui fait quoi.

### 2. Lots

Page liste : cards ou lignes avec nom, réalisatrice, pays, org, statut.

Page détail d'un lot :
- En-tête : nom complet, réalisatrice, pays, org responsable, statut (modifiable par les users du bon pays)
- Onglet Documents : documents liés à ce lot (filtre automatique de la table Documents)
- Onglet Livrables : livrables liés à ce lot (si applicable)
- (Phase 2 : onglets Tâches, Budget)

### 3. Documents

La réponse au problème #1 de Virginie : "Documents éparpillés dans plusieurs Drive."

**Ce qu'on stocke :** les métadonnées et le lien Drive. Pas le fichier.

Table principale triable/filtrable avec colonnes :
- Titre
- Catégorie (badge couleur : contrat, scénario, dossier artistique, rapport, livrable technique, facture)
- Lot (ou "Projet" si transversal)
- Pays
- Version (v1, v2... version finale)
- Statut de validation (brouillon → en attente → approuvé → archivé)
- Dernière modification
- Lien "Ouvrir dans Drive" (icône externe)

**Filtres au-dessus de la table** : par lot, par catégorie, par statut, par pays. Les filtres se combinent.

**Bouton "+ Nouveau document"** → modal :
- Titre (texte)
- URL Google Drive (texte, obligatoire)
- Catégorie (select)
- Lot (select, ou "Transversal")
- Version (auto-incrémenté si le titre existe déjà)
- Le pays est auto-rempli selon le country de l'utilisateur connecté

**Workflow de validation** — directement dans la ligne :
- Si statut = "brouillon" et c'est mon pays → bouton "Soumettre"
- Si statut = "en attente" et c'est mon pays ET je suis admin ou coproducer → bouton "Approuver"
- Si statut = "approuvé" → bouton "Archiver" (admin seulement)
- Les gens d'un autre pays voient le statut mais pas les boutons d'action

### 4. Livrables

La réponse au problème #6 de Virginie : "Livrables non centralisés — aucun tableau de bord pour suivre l'avancement par livrable et par fonds."

**Vue par bailleur** (accordéon) :
Chaque bailleur a une section dépliable :
- En-tête : nom du bailleur, pays, montant, devise, statut financement (badge : acquis / pressenti / à confirmer), org bénéficiaire
- Contenu : table des livrables contractuels
  - Titre, date d'échéance, statut (à produire / en cours / soumis / validé), documents liés (liens cliquables)
  - Bouton "+ Livrable" pour ajouter
  - Actions : modifier statut, lier un document existant

**Vue calendrier** (toggle en haut) :
Bascule entre "Par bailleur" et "Calendrier". La vue calendrier est une liste chronologique plate de tous les livrables, tous bailleurs confondus, triés par date d'échéance. Même données, autre organisation. C'est cette vue qui alimente le Bloc 3 du tableau de contrôle.

**Export** (Phase 2) : PDF de la vue par bailleur, pour envoyer un état d'avancement à un interlocuteur de la SODEC ou du CNC.

### 5. Équipe

Annuaire de tous les partenaires du projet.

**Groupement par organisation** :
- JAXA Production — Virginie, Axelle, Louis TB, Jérémy Roy
- Dark Euphoria — Mathieu, Marie, William
- Poulpe Bleu — Hélène, Anne-Lise
- Voulez-Vous Studio — Raphaël
- Freelance — Antoine

Chaque personne : card avec nom, rôle, email, pays, niveau d'accès (badge).
Admin peut ajouter/modifier/supprimer des membres.

### 6. Paramètres (admin)
- Gestion des organisations
- Gestion des utilisateurs et niveaux d'accès
- Configuration du projet (nom, description)
- Catégories de documents (personnalisables)
- (Phase 2 : taux de change, postes budgétaires)

### Design system
- **Tailwind CSS**, palette sobre et professionnelle
- Primaire : bleu navy `#1B3A5C`
- Accent : bleu moyen `#2E75B6`
- Fond : `#FFFFFF` principal, `#F8F9FA` surfaces secondaires
- Texte : `#333333` principal, `#6B7280` secondaire
- **Statuts production** : vert `#059669` (livré/validé/acquis), orange `#D97706` (en attente/pressenti/en cours), rouge `#DC2626` (en retard), gris `#6B7280` (brouillon/à confirmer/prototype)
- **Catégories documents** : chaque catégorie a une couleur de badge distincte (contrat=bleu, scénario=violet, rapport=teal, facture=gris, etc.)
- Typo : `Inter` ou `system-ui`, 14px base
- Coins : `rounded-lg` (8px) pour cards/boutons, `rounded` (4px) pour badges/inputs
- Ombres : `shadow-sm` uniquement, jamais lourdes
- Responsive : sidebar collapse en hamburger sur mobile, tables scroll horizontal
- Langue : FR. Labels dans un objet `i18n` pour ajout EN futur.

### Patterns d'interaction
- **Tables** : clic header = tri. Filtres en ligne au-dessus. Pagination si > 25 lignes.
- **Formulaires** : modals légers, jamais de page séparée. Validation inline (bordure rouge + message sous le champ).
- **Actions contextuelles** : les boutons d'action (valider, soumettre, archiver) apparaissent dans la ligne, conditionnés par le rôle et le pays. Pas de menu d'actions séparé.
- **Liens Drive** : icône "lien externe" reconnaissable, ouvre dans un nouvel onglet.
- **Feedback** : toast en bas à droite pour confirmer les actions. Disparaît après 3s.
- **Empty states** : message contextuel + bouton d'action ("Aucun document pour ce lot — Ajouter le premier").
- **Loading** : skeleton screens (rectangles gris animés), pas de spinners.
- **Destructive actions** : confirmation modale avant suppression. Texte explicite ("Supprimer le document X ? Cette action est irréversible.").

### Ce qu'on ne fait PAS en Phase 1
- Gantt / timeline visuelle (Phase 2)
- Suivi budgétaire / dépenses (Phase 2)
- Graphiques / charts (Phase 2)
- Export PDF (Phase 2)
- Chat / messaging (Discord existe)
- Notifications email (Phase 2-3, Resend)
- Sync automatique avec Google Drive API (on colle des URLs, pas de crawl)
- Dark mode
- PWA / offline
- Drag and drop

## Conventions
- Langue de l'interface : FR par défaut, EN disponible
- Dates : format ISO en base, affichage localisé
- Montants : toujours stockés avec devise, jamais de conversion implicite
- UUIDs partout, pas d'auto-increment
- Nommage tables : snake_case, pluriel anglais
- Nommage colonnes : snake_case anglais
- Composants React : PascalCase
- Fichiers : kebab-case
