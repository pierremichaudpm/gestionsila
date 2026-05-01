# WORKING_LOG — Gestion SILA

## Session 2026-05-01 — Phase 3.6 : batch 12 modifs Virginie (4 sections + 2 fixes)

### Objectif
Livrer le batch de 12 modifications demandées par Virginie en 4 commits structurés (un par section, pour permettre un revert chirurgical si besoin) : refonte du Calendrier avec archivage et inversion Gantt/timeline, palette par pays sur le Gantt, regroupement Livrables par pays + slide-over bailleur, recherche cross-folders sur Documents.

### Ce qui a été fait

#### Section 1 — Calendrier : archivage + inversion Gantt/timeline (commit `994d9f7`)
- **Migration 025** : `milestones.archived` (bool NOT NULL default false) + `archived_at` (timestamptz nullable) + `archived_by` (FK users nullable, ON DELETE SET NULL) + index `(project_id, archived)`. Trigger BEFORE INSERT/UPDATE `protect_milestone_archive_columns` qui force timestamps autoritatifs côté serveur (cohérent avec pattern 019). Si flip true→ archived_at=now() + archived_by=auth.uid() ; si flip false → reset des deux à NULL ; si pas de transition → fige aux valeurs OLD.
- **Inversion ordre Calendrier** : Vue Gantt déplacée en haut (entrée principale), Timeline mensuelle en bas. Toggles « Masquer/Afficher » indépendants sur les deux. Décision : maintenir activeItems > 0 comme condition de rendu du Gantt (sinon il s'affiche vide à l'arrivée sur la page).
- **Mois rétractables** : header de mois cliquable avec chevron ▾/▸. État local `useState(Set)`, **non persisté** en base — perdu au reload (volontaire, pas un bug).
- **Section Archive** : carte gris clair en bas de la timeline, repliée par défaut, listing identique en opacity réduite + badge « Archivé ». Filtres pays/type/lot s'appliquent aussi à l'archive (cohérence — un user FR ne voit que ses jalons archivés FR).
- **ArchiveCheckbox** : composant réutilisable avec `e.stopPropagation()` pour ne pas déclencher le clic parent (qui ouvre la modal détail). Câblé sur les 2 surfaces : timeline (chaque entrée milestone) et colonne label du Gantt (`ItemRow`).
- **TimelineItem** extrait du composant `MonthSection` pour réutiliser le rendu dans `ArchiveSection` avec un mode `dimmed`. Évite la duplication.
- Les deliverables n'ont pas de case (cohérent avec décision Virginie : leur statut « validé » fait office d'archive côté Livrables).

#### Section 2 — Vue Gantt : palette par pays + réordre swimlanes (commit `8ee186e`)
- **Palette interne par pays** dans `ganttColors.js` : `getInternalColor(country)` retourne `#7a1726` pour CA (bordeaux foncé, distinct du SODEC `#a8243a`), `#002654` pour FR (bleu marine France), `#00a4d6` pour LU (bleu Luxembourg plus clair). Le taupe générique `#5a5248` reste en fallback pour les jalons internes sans country. `internalLabel(country)` produit « Production interne — CA / FR / LU ».
- **Split swimlane interne** : la lane unique `__internal__` est splittée en autant de swimlanes que de pays internes (`__internal__:CA` / `:FR` / `:LU`).
- **Réordre** : swimlanes internes en haut (CA → FR → LU déterministe), bailleurs A→Z en dessous. Avant : bailleurs en haut, interne tout en bas.
- **Légende** : refl ète les nouveaux libellés. Drapeau retiré pour les chips internes (le suffixe « — CA » porte déjà l'info, évite la redondance) ; conservé pour les chips bailleurs. Chip « Tous les bailleurs » renommé en « Tout » (plus juste depuis qu'il y a aussi des lanes internes).

#### Section 3 — Livrables : hiérarchie pays + slide-over + archivage FFL Dév (commit `5d30428`)
- **Migration 026** : `funders.archived` (bool NOT NULL default false) + `funders.notes` (text nullable) + index `(project_id, archived)`. Pas de timestamp/FK auteur sur l'archive funder (acte rare, admin-only en pratique). DELETE du livrable « FilmFund Dév. — note d'intention » (id 0003, statut `submitted` au moment de la décision) + UPDATE FFL Dév archived=true. Décision Virginie option C.
- **SlideOver** : wrapper réutilisable (panneau droit, backdrop, ESC, click outside, scroll body verrouillé). Largeurs paramétrables (md/lg/xl). Sera repris en Section 4 pour la recherche Documents.
- **FunderDetailPanel** : 3 zones — édition complète admin (name, country, amount, currency, status, beneficiary_org_id, notes), bouton Archiver/Désarchiver, liste livrables avec threads commentaires (badges via `useCommentCounts` + expansion inline). Lecture seule pour les non-admin. Le panneau s'ouvre aussi pour les bailleurs archivés (depuis la section Archive).
- **Hiérarchie par pays** dans `Livrables.jsx` : 3 sections de niveau 1 (Canada → France → Luxembourg, ordre déterministe via `countryRank`) avec compteurs « X bailleurs · Y livrables ». Bouton « Détails » discret à droite du nom du bailleur (`border-l` qui sépare visuellement de la zone d'expansion accordéon).
- **Section Archive** en bas de la page Livrables (cohérente avec le pattern timeline). Bailleurs archivés affichés en `opacity-70` avec badge « Archivé ».
- **format.js** : exposition de `FUNDER_STATUS_OPTIONS` (manquait — utilisé pour le select d'édition).

#### Section 4 — Documents : bouton Recherche + slide-over cross-folders (commit `bd0b6ff`)
- **DocumentSearchPanel** : panneau coulissant via `SlideOver`. Champ texte `autoFocus` debounced 300ms. Recherche sur `title.ilike` (cross-folders) + `version.eq` quand la query ressemble à un numéro (regex `^v?(\d+)$` — typiquement « v2 » ou « 10 »). Le `version` étant `int`, l'`ilike` n'est pas possible dessus.
- **5 filtres** : Sous-dossier, Tableau, Catégorie, Statut, Pays. Tous optionnels, combinables avec la query. Si aucune query ET aucun filtre → empty state (pas de liste-tout par défaut).
- **NE recherche PAS dans Espace Producteurs** : la table `producer_documents` est isolée des `documents` publics (RLS gated par `has_producer_access`). Le panel n'y touche pas — les producteurs.rices passent par leur section dédiée.
- **Bouton « 🔍 Rechercher »** placé à gauche de « + Nouveau document » sur les vues niveau 1 (grille de sous-dossiers) et niveau 2 (liste filtrée). Disabled pendant `!projectId` mais pas conditionné à `profile` (recherche read-only).
- **Clic sur résultat** : ferme le panneau et ouvre `EditDocumentModal` sur le document. La modal gère elle-même les permissions (édition si l'utilisateur a les droits, lecture sinon).

#### Fix swimlanes vides (commit `f7e3e9a`)
- Bug retour Virginie : « Production interne — LU » disparaissait quand aucun jalon LU n'existait. Probable cas en prod : 0 jalon LU à ce moment.
- **Fix** : pré-amorçage des 3 lanes internes (CA, FR, LU) dans tous les cas, même vides. Une lane vide affiche « Aucun jalon » en italique gris dans la zone label, la zone temporelle reste vide. L'ordre CA → FR → LU est garanti, indépendant des données.
- **Comportement bailleurs préservé** : ils n'apparaissent que s'ils ont au moins un item (sinon le Gantt serait pollué par 7+ lanes vides à chaque chargement).

#### Fix Dashboard archivage (commit `f621c0f`)
- Bug logique remonté par Virginie : un jalon coché archivé continuait d'apparaître dans « Attention requise » et « Prochaines échéances » du Dashboard.
- **AttentionBlock** : `+ .eq('archived', false)` sur la requête milestones. Deliverables : déjà filtré sur `status IN (to_produce, in_progress)` — validated/submitted naturellement absents.
- **UpcomingDeliverablesBlock** : idem `.eq('archived', false)` sur les milestones. Filtre deliverables existant inchangé.
- **LotsBlock** : `.eq('milestones.archived', false)` sur la requête principale (PostgREST filtre la ressource embarquée sans inner-join — les tableaux sans jalon actif apparaissent toujours avec count=0). `.eq('archived', false)` sur le count transversal des jalons sans tableau. Compteurs documents inchangés (pas de notion d'archive sur documents — c'est `validation_status` qui joue ce rôle).
- **RecentActivityBlock** : non touché. Les entrées d'activité ne sont pas cliquables (juste du texte) — pas de risque de lien mort vers une entité archivée. L'historique reste visible (souhaité, confirmé par Virginie).

### Décisions techniques

- **Triggers autoritatifs sur archived** (025) : pattern 019 réappliqué — le client ne peut pas spoofer `archived_at` ou `archived_by`. Si le client envoie `{archived: true, archived_at: '2020-01-01'}`, le trigger force `archived_at = now()`. Si flip false→true on enregistre, si flip true→false on reset à NULL, si pas de transition on fige aux valeurs `OLD.*`.
- **Pas d'archived dans les watched_fields de track_imported_changes** : l'archivage est opérationnel, pas éditorial. L'inscrire dans `imported_value` polluerait l'audit du picto ✎ — un jalon archivé puis désarchivé verrait son champ `archived` figé en `imported_value[archived]=true`, ce qui n'a aucun sens.
- **funders.archived plus simple que milestones.archived** : pas de timestamp ni FK auteur. Justification : un funder est archivé une fois pour toutes (rare), c'est un acte admin, on n'a pas besoin du même niveau d'audit.
- **funders.notes ajouté en 026** plutôt que dans une migration séparée : il était demandé pour le slide-over d'édition, dans la même section logique. Pas de raison de fragmenter.
- **DELETE par id exact dans 026** plutôt que par `funder_id` : si Virginie ajoute d'autres livrables FFL Dév en prod entre l'écriture de la migration et son application, on ne les efface pas par accident. Le seed connu n'a qu'un seul livrable lié, c'est l'identifié-nommé qu'on supprime.
- **SlideOver mutualisé** : 2 utilisations (FunderDetailPanel + DocumentSearchPanel). Investissement justifié — sera également candidate pour les futurs panneaux (édition d'un lot, vue détail livrable, etc.). Différencié de Modal sur 3 points : pleine hauteur, alignement droit, scroll body verrouillé.
- **Recherche Documents : title + version conditionnelle** : `documents.version` est un `int`, donc `.ilike` impossible. Solution : `.or(title.ilike.X, version.eq.N)` quand la query matche `^v?(\d+)$`, sinon juste `.ilike('title', X)`. La regex couvre « v2 », « v10 », « 10 », « V3 » sans gérer la combinatoire « v2 SODEC » qui serait rare en saisie réelle.
- **3 lanes internes pré-amorcées dans le Gantt même vides** (fix `f7e3e9a`) : décision UX claire de Virginie. Bénéfice : la structure des 3 pays internes est visible en permanence ; Virginie peut prévoir où vont aller ses futurs jalons LU même quand il n'y en a pas encore. Coût : 2 lanes vides en moyenne (sur SILA, jalons internes principalement CA pour le Tableau IV).
- **Filtre `archived=false` côté requête sur le Dashboard** plutôt que client-side : moins de données réseau, traitement Postgres optimisé via l'index `(project_id, archived)` créé en 025. Cohérent avec le pattern Calendrier où le split actif/archivé est aussi côté requête.
- **Commits séparés par section** comme demandé : permet un revert chirurgical si une section pose problème, sans toucher aux autres. La S1 (Calendrier) ne dépend pas de la S2 (Gantt) ni inversement.

### Problèmes rencontrés

- **Pas d'accès psql sans password DB** : le pooler-url ne contient pas le password, pas de `~/.pgpass`, pas de `PGPASSWORD` en env, anon key bloqué par RLS sans session auth. Conséquence : impossible de faire des checks ad-hoc en prod (ex: « combien de jalons LU avant le fix `f7e3e9a` »). Workaround : lire le seed (état initial) et faire le fix UI sans verification de comptes — correct dans tous les cas pour la lane vide. À demander à Virginie/Pierre une seule fois, à mettre dans un .pgpass local pour les futures sessions.
- **Décision Virginie après écriture 025** : elle a confirmé l'archivage FFL Dév + suppression livrable APRÈS que j'aie écrit la migration 025. D'où la séparation : archivage milestones (025) puis archivage funders + DELETE livrable (026). Si elle avait confirmé en amont, j'aurais pu tout mettre dans 025 — mais la séparation est plus propre fonctionnellement (deux changements de schéma, deux objets archivables, deux migrations).
- **ESLint a flaggé plusieurs unused vars** au fur et à mesure : `useExchangeRates`, `DELIVERABLE_STATUS_OPTIONS`, `profile`, `useMemo`, `isInternalKey`. Tous corrigés. Note : le code n'est pas exposé à un CI strict (le build Vite passe quand même), mais je tenais à garder les fichiers propres.
- **Bug logique trouvé en prod après déploiement Section 1** : un jalon archivé restait visible dans « Attention requise ». Pas couvert par la spec initiale Virginie — elle a uniquement décrit le comportement Calendrier (Archive en bas, désarchive en haut). Le Dashboard est une autre surface qui consommait les milestones sans connaissance du nouveau flag. Fix `f621c0f` en passe séparée. À retenir : à chaque ajout de flag de filtrage (archived, deleted, hidden, draft), faire un **grep cross-app** sur toutes les requêtes qui consomment l'entité concernée pour valider qu'elles sont conscientes du flag.
- **Le Cache navigateur** : Virginie a dû hard-refresh après les premiers déploiements pour voir les changements. Pas un nouveau problème (déjà documenté en avril), mais à rappeler systématiquement dans les retours.

### Prochaines étapes

1. **Tester en bloc avec Virginie / William / Anne-Lise** — les 4 sections + 2 fixes touchent à des surfaces très visibles (Calendrier, Gantt, Livrables, Documents, Dashboard). Voir si la nouvelle hiérarchie par pays sur Livrables est intuitive, si la case d'archivage est trouvable, si la recherche Documents est utilisée.
2. **Mettre à jour le guide client** — `Guide_Outil_Sila_v3.docx` est encore à jour côté Phase 3.5. Les 4 sections de Phase 3.6 changent le flux d'arrivée sur le Calendrier (Gantt en haut, plus la timeline) et l'organisation Livrables (par pays). Une section « Archiver un jalon ou un bailleur » sera nécessaire si Virginie veut transmettre à l'équipe.
3. **Bundle vite à 675 KB** — était 651 KB avant ce batch. Le code splitting `React.lazy()` sur Budget et Calendrier devient plus pressant. Phase 4 candidate prioritaire.
4. **Activity log d'archivage (optionnel)** — si Virginie veut suivre les archivages dans le journal (« Pierre a archivé un jalon : X »), étendre le filtre du trigger `milestones_log_activity` pour fire aussi sur changement de `archived`. Non fait pour ne pas polluer le journal s'il n'y a pas de demande explicite.
5. **Slide-over pour autres entités** — le wrapper `SlideOver` est prêt. Candidates : édition d'un Tableau (lot), vue détail livrable, panneau participant Équipe. Si la convention « clic Détails → slide-over » plaît à Virginie, on pourra l'étendre.
6. **Récupérer le password DB** — pour les futurs checks ad-hoc en prod. Soit `.pgpass`, soit prompt interactif au moment du check.
7. **Recherche dans Espace Producteurs** — actuellement pas couvert. Si Virginie veut chercher dans les contrats / assurances / devis initiaux, créer un `ProducerDocumentSearchPanel` dérivé (gating `has_producer_access` côté composant et RLS côté serveur). Pas demandé pour l'instant.

## Session 2026-04-28 (suite) — Imports SILA, sous-dossiers, Espace Producteurs, devises duales, édition universelle, traçabilité

### Objectif
Aller bien au-delà du strict module commentaires : importer toutes les données réelles SILA (échéancier, devis SODEC, structure financière), créer une couche de confidentialité (Espace Producteurs) pour le budget et les pièces sensibles, et rendre toute donnée éditable manuellement avec traçabilité des modifications post-import. Plus une refonte du guide utilisateur.

### Ce qui a été fait

#### Échéancier SILA → milestones (migrations 006-007)
- **006** : `milestones.date` → `start_date` + `end_date` nullable. Trigger `log_activity` adapté. Index `start_date_idx` + `end_date_idx`. CHECK `end_date >= start_date`.
- **007** : suppression des 6 jalons démo, import de **16 jalons réels** depuis `docs/SILA_Échéancier_Gantt_Avril2026.xlsx` (15 sur Tableau IV, 1 transversal — Itération 3). 3 jalons ponctuels (`end_date NULL`) : Prototype validé (30 mai), Lancement Venise (24 août festival), Première publique (1ᵉʳ oct.). Les 13 autres en plages mois-de-début → mois-de-fin. Statut « En cours / Complété / À venir » conservé en notes, préfixé par « Indication échéancier : ».
- UI Calendrier adapté : `formatDateRange()` qui gère ponctuel, plage même année (« 01 mai – 30 juin 2026 »), plage cross-year. NewMilestoneModal et MilestoneDetailModal mis à jour pour deux dates. Filtres conservés.

#### Renommage Lot → Tableau (UI seulement)
- 14 fichiers, 29 strings remplacés. Côté DB / routes / noms de fichiers et composants : conservés tels quels (`lots`, `lot_id`, `/lots`, `Lots.jsx`, `LotDetail.jsx`, `ByLotView.jsx`).
- `GUIDE_VIRGINIE.docx` (16 pages, palette navy) updated via python-docx en respectant le formatage Word — 19 paragraphes touchés, 0 faux positif. Phrase ambiguë « ventile par tableau » réécrite en « regroupe les lignes par tableau » (option c choisie par l'utilisateur).

#### Documents avec sous-dossiers (migration 008)
- Colonne `documents.folder` (text NOT NULL default `'divers'`) avec CHECK sur 4 valeurs : techno / creation / texte / divers.
- Index `(project_id, folder)`.
- Mapping `category → folder` documenté en SQL (technical_deliverable→techno, artistic_dossier+scenario→creation, contract+report→texte, invoice→divers).
- UI Documents refactorée en **vue à 2 niveaux** : `/documents` = grille de 4 cards avec compteurs et icônes (⚙️🎨📄📁), `/documents/:folder` = liste filtrée avec breadcrumb cliquable. Filtres conservés (Tableau, Statut, Pays) — la catégorie devient implicite par le sous-dossier.
- Modal de création étendue : champ Sous-dossier obligatoire (pré-rempli si on est entré via un sous-dossier, sinon dérivé de la catégorie via `folderForCategory()`).

#### Espace Producteurs confidentiel (migration 009)
- **Modèle** : drapeau `project_members.has_producer_access` (boolean default false). Toute lecture/écriture sur `budget_lines`, `producer_documents`, et toute entrée d'`activity_log` ou `comments` référençant ces entités passe par une barrière `has_producer_access(project_id)` AVANT les règles fines existantes.
- **Tables nouvelles** : `producer_access_log` (audit append-only, admin-only) et `producer_documents` (sous-dossiers `assurances` / `legal`, isolée des documents publics).
- **RLS hardening** sur `budget_lines` : barrière `has_producer_access` ajoutée en plus des règles existantes (admin écrit tout, coproducer écrit son org, production_manager lit son org seulement).
- **Activity log** : entrées sur `budget_line` et `producer_document` filtrées pour les non-autorisés via la même barrière. Ne fuite pas par effet de bord.
- **Comments** : entity_type `producer_document` ajouté (CHECK constraint résolue dynamiquement via `do block` car nom auto-généré). Filtre RLS étendu.
- **5 personnes initialisées** : Virginie, Marie, William, Hélène, Anne-Lise. Pierre Michaud (dev outils) et autres restent à false.
- **UI** : sidebar split — Budget retiré du nav principal, section « Espace Producteurs » conditionnée à `hasProducerAccess` (avec icône 🔒). Routes `/espace-producteurs/{assurances,legal,budget}` + `ProducerGate` côté UI en plus du RLS serveur. Ancienne `/budget` redirige selon accès. Page `ProducerDocuments` + `NewProducerDocumentModal`. Hook `useCurrentProject` étendu avec `hasProducerAccess`. Page Paramètres : section `ProducerAccessSection` (toggle par membre + journal des 20 dernières modifs).

#### Articulation budget Canada + Structure financière (migrations 010-011)
- **010** : `budget_lines.code` (text) + `budget_lines.cost_origin` (text CHECK interne|apparente|externe). `project_settings.exchange_rate_date`. **19 lignes JAXA** importées depuis `docs/budget_canada_postes.csv` (devis SODEC, total 120 327 CAD). Postes 03 et 04 split en 2 lignes chacun (option a — split) pour conserver une cost_origin non ambiguë. Démos JAXA supprimées, démos DE et PB conservées en attendant les vrais devis France/Luxembourg.
- Table `funding_sources` (id, country, source_name, **amount_eur ET amount_cad** séparés, status, notes, sort_order) avec RLS gated par `has_producer_access`. **22 sources** importées depuis `docs/structure_financiere.csv` (CA: 2, FR: 16, LU: 4 — total 997 886,36 CAD).
- **011** : taux corrigé de 1.6232 → **1.6135** (cohérent avec les `amount_cad` contractuels du CSV). Élimine les écarts artificiels FR/LU dans la vue Structure financière.
- **UI** : `BudgetLineRow` étend les colonnes Code (avant Catégorie) + Origine (après Devise), édition inline. `ByCoproducerView` : badge SODEC (✓ « Cohérent avec devis SODEC » si total = 120 327 ± 1 CAD, ⚠ orange « Écart : X CAD » sinon). **Nouveau 4ᵉ onglet Structure financière** : 3 sections accordéon par pays, chaque section avec total CAD/EUR + badge cohérence vs budget org correspondante (CA→JAXA, FR→Dark Euphoria, LU→Poulpe Bleu). Édition inline des sources, bouton « + Source » par pays selon perms. Footer grand total consolidé.

#### Ajout 3 utilisateurs + correction emails (migration 012)
- **2 nouvelles orgs CA/CAD/contractor** : Neek Studio (prestataires Tab. IV) et Indépendante (artistes individuels — distinguée du Freelance français pour Antoine).
- **3 nouveaux comptes** : Aude Guivarc'h (Indépendante), Jérémy Roy + Louis TB (Neek Studio). Tous `contractor`, `has_producer_access=false`. Mots de passe initiaux uniques (12 chars random) hachés via `extensions.crypt(...) + extensions.gen_salt('bf')` (le prefix `extensions.` est nécessaire en contexte migration, contrairement au seed).
- **4 emails corrigés** sur les utilisateurs existants : Mathieu (mathieu@→mrozieres@), William (william@→wboard@), Hélène (helene@poulpebleu→helenewalland@gmail), Anne-Lise (anne-lise@poulpebleu→millerannelise@gmail). Marie et Raphaël inchangés. Mots de passe préservés (UPDATE auth.users.email seulement).
- **Identifiants initiaux** dans `docs/credentials_initiales_2026-04.md` (gitignored). À transmettre à Virginie. Le `.gitignore` étendu avec `docs/credentials_initiales_*.md` et `GUIDE_VIRGINIE*.docx`.
- CSVs et xlsx de `docs/` ajoutés au repo (sources référencées par les migrations).

#### Édition universelle + double affichage CAD/EUR — 3 commits structurés (migrations 013-018)

##### Commit 1/3 — fondations devises (migration 013)
- `project_settings.exchange_rate_cad_to_eur` (= 0.6198 pour SILA). **Indépendant** d'`eur_to_cad` — pas calculé l'un de l'autre, conformément au devis (1/1.6135 = 0.61977… qui s'arrondit à 0.6198 ; les deux valeurs coexistent).
- Table `exchange_rate_history` + trigger `log_exchange_rate_change` AFTER UPDATE qui audit chaque modif de taux.
- `src/lib/currency.js` : `convertAmount`, `formatOne`, `formatDual`, `formatDualString`. Conversion **directionnelle** (eurToCad pour EUR→CAD, cadToEur pour CAD→EUR), respect des deux taux indépendants.
- Hook `useExchangeRates(projectId)` réutilisable.
- **Application UI** : `BudgetLineRow.AmountCell` (montant native gras + dérivé gris empilé) sur les 4 vues Budget. `Funder card` Livrables passe en double affichage. Section Paramètres → Taux de change : édition combinée des 2 taux + date d'effet + historique des 20 derniers changements. `EditRatesModal` réutilisable, ouvert depuis Budget header (admin) en plus de Paramètres.

##### Commit 2/3 — édition manuelle universelle (migration 014)
- Policy `users_update_admin` : admin de projet peut modifier tout profil utilisateur (s'ajoute à `users_update_self`).
- **5 modals d'édition** : `EditMilestoneModal`, `EditDocumentModal`, `EditProducerDocumentModal` (séparé du précédent — pas de catégorie, folders distincts assurances/legal), `EditDeliverableModal`, `EditMemberModal`.
- **Extensions inline** : `BudgetLineRow` accepte maintenant `currency` (select CAD/EUR) et `org_id` (admin only — réaffectation à une autre org). `StructureFinanciereView.SourceRow` accepte `country` (admin only — réaffectation pays).
- **Page Équipe** refondée : bouton « Modifier » sur chaque card. `EditMemberModal` 2 modes — self (full_name + role) ou admin (full_name + role + email + country + org_id + access_level avec garde-fou « pas son propre access_level »). L'email modifié ici est `public.users.email` (affichage) ; l'email de connexion `auth.users.email` reste géré séparément (note dans le modal).

##### Retours Virginie commit 2 — corrections (migrations 015-017)
- **015** : fix RLS `deliverables`. Avant : INSERT/UPDATE/DELETE exigeaient `funder_country = current_user_country` pour TOUS les rôles, sans escape admin. Conséquence : Virginie (CA) ne pouvait modifier que les livrables SODEC, pas les FR/LU — UPDATE renvoyait 0 row affected sans erreur (silencieux). Refactor : admin échappe au filtre country, coproducer/production_manager filtrés par funder.country.
- **016** : ajout catégorie `'reference'` dans `documents.category` CHECK (résolution dynamique du nom auto-généré via do-block). Label « Référence », badge cyan, mapping `category → folder = 'techno'` par défaut.
- **017** : audit holistique des RLS d'écriture sur 7 tables. Deux bugs systémiques corrigés : (1) admin sans escape sur `lots`, `tasks`, `documents`, `producer_documents` ; (2) `production_manager` exclu des rôles écrivants sur `funders`, `milestones`, `deliverables`. Règle uniforme : admin écrit partout, coproducer + production_manager écrivent sur leur pays. `budget_lines` et `funding_sources` non touchés (production_manager y reste read-only par design — Espace Producteurs).
- UI `MilestoneDetailModal.canEdit` étendu pour inclure `production_manager` (cohérent avec RLS 017).
- Bonus UX : bouton « Réinitialiser les filtres » sur la page Documents quand un filtre est actif.

##### Commit 3/3 — traçabilité (migration 018)
- **4 colonnes audit** sur 5 tables (milestones, budget_lines, funding_sources, documents, producer_documents) : `imported` (bool default false), `imported_value` (jsonb), `last_modified_by` (FK users), `last_modified_at` (timestamptz).
- **Fonction trigger générique** `track_imported_changes()` BEFORE UPDATE :
  - Si `OLD.imported = true` : capture `OLD.field` dans `imported_value` au PREMIER changement de chaque champ surveillé. Ne réécrase pas les modifs ultérieures (préserve la valeur d'origine de l'import, pas une valeur intermédiaire).
  - Si `OLD.imported = false` : track juste `last_modified_by/at` sur changement de champ surveillé.
  - **Toujours autoritatif côté serveur** : ignore toute valeur que le client tenterait de mettre dans `imported_value` ou `last_modified_*` directement.
  - Champs surveillés définis par `TG_TABLE_NAME` dans un CASE.
- **Backfill `imported = true`** sur les enregistrements issus des migrations : 16 milestones (007), 19 budget_lines JAXA (010), 22 funding_sources (010). Matching par préfixe d'UUID — les UUIDs UI-créés (gen_random_uuid) ne matchent pas.
- **UI** : composant `ModifiedBadge` (petit picto crayon ambre) avec tooltip HTML title= : « Modifié [date relative] par [user]. Valeurs d'origine : champ → valeur ». Skip explicite des UUIDs (lot_id, org_id) qui s'affichent comme « (modifié) » plutôt que la valeur brute. Map de libellés humains dans `src/lib/auditLabels.js`. Câblé sur les 5 listes (Calendrier, Budget, Structure financière, Documents, ProducerDocuments) à côté du libellé principal de chaque ligne.

#### Refonte du guide → `Guide_Outil_Sila_v2.docx`
- Refonte complète via python-docx, ~22 pages estimées, 286 paragraphes, 13 tableaux. Couverture restylée : « Guide » + « Outil Sila » + « v2 » (multi-tenant assumed — l'outil est désormais positionné comme produit, pas comme guide d'une production spécifique). Mention « Héroïnes Arctiques » retirée de la couverture, conservée dans le contenu où pertinent.
- Sections nouvelles vs ancien guide : Documents avec sous-dossiers, Espace Producteurs (Assurances + Légal + Budget), Articulation budget Canada SODEC, Structure financière, Double affichage CAD/EUR, Édition manuelle universelle, Traçabilité (picto ✎), Section Taux de change dans Paramètres.
- 7 scénarios concrets avec workflows pas-à-pas. Annexe « Repères rapides » : URL, statuts, symboles.
- Backups conservés : `GUIDE_VIRGINIE.backup-20260428-151645.docx` (avant Lot→Tableau) et `GUIDE_VIRGINIE.backup-before-rewrite-20260428-181633.docx` (juste avant la refonte).
- `.gitignore` étendu avec `Guide_Outil_Sila*.docx`.

### Décisions techniques

- **Périodes vs dates ponctuelles pour milestones** : nullabilité de `end_date` choisie après itération avec Virginie. NULL = jalon ponctuel (livraison Venise un jour précis), non-NULL = plage. UI : `formatDateRange()` retourne juste la date si `end` est null. Plus propre que l'option (b) initiale (`end = start` pour les ponctuels) qui aurait perdu la distinction.
- **Espace Producteurs comme couche d'invisibilité, pas juste lecture interdite** : la sidebar conditionne le rendu sur `hasProducerAccess`. Une personne sans accès ne voit même pas que la section existe. Côté serveur, RLS bloque même les SELECT sur `budget_lines` / `producer_documents` / `funding_sources`. Les commentaires sur ces entités et les entrées d'`activity_log` correspondantes sont aussi filtrés. Aucune fuite par effet de bord.
- **Deux taux EUR↔CAD indépendants** plutôt qu'un seul + inverse calculé. Demande Virginie. Le devis SODEC fixe les conversions contractuelles à un taux légèrement différent du taux courant ; l'inverse mathématique strict introduirait des micro-écarts. Les deux taux sont stockés indépendamment et utilisés directionnellement.
- **`amount_eur` ET `amount_cad` séparés sur funding_sources** : montants contractuels figés. Si on calculait à la volée avec le taux courant, modifier le taux changerait rétroactivement les montants des sources passées — pas voulu. Quand un seul est saisi, l'autre est calculé pour comblement (via le taux courant) mais pas écrit en base.
- **Split de l'édition universelle en 3 commits** plutôt que tout d'un coup. Recommandé par moi-même au début de la demande pour permettre un test intermédiaire après les fondations devises (visible immédiatement par Virginie) avant l'édition (fonctionnelle) puis la traçabilité (raffinement). Virginie a confirmé chaque étape avant le suivant.
- **Trigger BEFORE UPDATE générique** pour la traçabilité (TG_TABLE_NAME → array of watched fields) plutôt qu'un trigger par table. Une fonction unique, 5 triggers (un par table) pointant dessus. Évite la duplication mais reste lisible (le CASE est explicite).
- **Préservation de la valeur d'origine** dans `imported_value` : si un champ est modifié plusieurs fois, `imported_value[field]` garde la valeur du PREMIER changement (= valeur de l'import), pas la valeur intermédiaire la plus récente. Le but est de toujours retrouver d'où on est parti.
- **`production_manager` retiré du write sur deliverables en 015 puis réintégré en 017** — j'ai mal interprété la spec « production_manager : lecture seule » au moment d'écrire 015. Virginie a confirmé que la règle générale prime : « tout le monde lit, l'écriture est filtrée par pays sauf admin ». Le production_manager appartient au périmètre des rôles écrivants sur leur pays. Migration 017 a fait l'audit complet et réintégré.
- **`mrozieres@dark-euphoria.com`, `wboard@dark-euphoria.com`, `helenewalland@gmail.com`, `millerannelise@gmail.com`** — vrais emails fournis par Virginie. Marie et Raphaël déjà corrects dans le seed initial. Hélène et Anne-Lise sont passées de `@poulpebleu.com` à `@gmail.com` (probablement Poulpe Bleu n'a pas le domaine au quotidien — préfère gmail).
- **`extensions.crypt(...)` qualifié** dans la migration 012 : sans le prefix, `gen_salt('unknown')` échoue parce que pgcrypto n'est pas dans le `search_path` au moment où Supabase exécute les migrations (contrairement au seed.sql qui hérite du search_path interactif).

### Problèmes rencontrés

- **RLS UPDATE silencieux** : le bug 015 sur deliverables a été non détecté en interactif parce que Postgres ne renvoie pas d'erreur quand RLS filtre les lignes — l'UPDATE rapporte juste « 0 row affected ». Côté Supabase JS, `{ error: null, data: null }` ressemble à un succès. Virginie a observé « rien ne se passe quand je clique Enregistrer ». Diagnostic via le pattern : pour les lignes que je peux voir mais que je ne peux pas modifier, l'UPDATE est silencieux. À retenir comme cas tordu côté UX.
- **Bug systémique « admin sans escape »** sur 4 tables (lots, tasks, documents, producer_documents) découvert seulement par l'audit déclenché par le retour Virginie sur deliverables. Toutes ces tables avaient été écrites avec le pattern `('admin','coproducer','production_manager') AND country = current_user_country` qui s'applique à tous les rôles, admin compris. Si Virginie n'avait pas testé sur des livrables FR, on n'aurait pas remarqué. Migration 017 fait l'audit complet en une passe.
- **`crypt()` indisponible en migration** : la fonction live dans `extensions.crypt`, et les migrations sont exécutées avec un search_path qui n'inclut pas `extensions`. Le seed (qui passe par `psql` interactif) n'a pas ce souci. Documenter pour les futures migrations qui touchent à auth.users.
- **CHECK constraints auto-nommés** par Postgres : pour les modifier (ajout d'enum value), il faut résoudre le nom dynamiquement via `pg_constraint`. Pattern utilisé dans 009 (comments.entity_type) et 016 (documents.category) — `do block` qui SELECT puis EXECUTE format(...).
- **Filename matching sur les UUIDs** pour le backfill `imported = true` : utilisé `LIKE '77...0001%'` pour matcher les milestones de 007. Convient parce que les imports utilisent des UUIDs déterministes structurés et les UI-créés utilisent `gen_random_uuid()` qui ne matchent pas les patterns. Si on ouvrait à des imports plus tardifs, mieux vaudrait un flag explicite passé par les inserts (`imported=true` directement dans l'INSERT) plutôt qu'un backfill par regex.
- **Cache navigateur côté Virginie** : après le commit 1/3 (devises), elle voyait toujours « 115 000 $CA » au lieu de « 115 000 CAD / 71 277 EUR ». Diagnostic : cache navigateur non invalidé (Netlify avait bien déployé). Dans les retours futurs, mentionner systématiquement « hard reload Ctrl+F5 / Cmd+Shift+R » avant de chercher un bug de fond.
- **Questions techniques pour Virginie** : retour clair de Pierre — utiliser un langage non technique. Pas de slashes URL (`/budget`), pas de jargon (`badge SODEC`, `cellules planned/actual`, `redirige`). Saved en mémoire pour les futures sessions.

### Prochaines étapes

1. **Tester en prod avec William et Anne-Lise** — la migration 017 leur réintègre les droits d'écriture sur leur pays. Voir si tout fonctionne (modifier un jalon FR pour William, un livrable FilmFund LU pour Anne-Lise) sans régression.
2. **Hide form pour contractors** sur les entity_types qu'ils ne peuvent pas commenter (toujours non fait depuis Phase 2.5). Aujourd'hui le formulaire s'affiche et l'erreur RLS arrive après le submit.
3. **Édition d'un funder** (le bailleur lui-même, pas ses livrables) — actuellement read-only dans la card de l'accordéon Livrables. Si Virginie veut modifier le montant SODEC ou le statut Pictanovo (Acquis ↔ Pressenti), elle ne peut pas. À ajouter si demandé.
4. **Notifications email Resend** (Phase 3) — rappels échéances, validations en attente, nouveaux commentaires, changements de taux de change.
5. **Page de gestion d'équipe pour admin** — créer un nouvel utilisateur depuis l'UI plutôt que par migration SQL. Aujourd'hui l'ajout passe par moi via une migration. Pas critique tant que les ajouts sont rares.
6. **Transmettre `Guide_Outil_Sila_v2.docx` et `docs/credentials_initiales_2026-04.md`** à Virginie par courriel. Le guide est complet, les credentials sont à transmettre aux 3 nouveaux contributeurs avec consigne de changer de mot de passe.
7. **Bundle JS à 622 KB** — au-delà du seuil de 500 KB de Vite. Considérer `React.lazy()` sur Budget (avec ses 4 vues) et Calendrier (avec ses modals) pour code splitting.
8. **Vérification post-prod** : en théorie les 22 sources de financement et 19 lignes de budget Canada sont les vrais montants contractuels. Si Virginie corrige des chiffres (ce qui arrivera), le picto ✎ ambre rendra ces corrections visibles. Voir si le comportement est intuitif après quelques semaines d'usage.

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

## Session 2026-04-28 — Module commentaires contextuels (Phase 2.5) + auto-deploy

### Objectif
Ajouter une couche de discussion par entité métier dans l'app, sans dupliquer Discord ni les commentaires natifs de Drive. Activer l'auto-deploy Netlify.

### Ce qui a été fait

#### Module commentaires
- [supabase/migrations/005_comments.sql](supabase/migrations/005_comments.sql) — table `comments` (id, project_id, entity_type, entity_id, user_id, content, created_at, updated_at), index composite `(project_id, entity_type, entity_id, created_at)`, RLS, trigger
- `entity_type` ∈ `{document, deliverable, milestone, lot, budget_line}` — check constraint
- RLS : SELECT pour tout membre du projet ; INSERT pour membres non-contractor (les contractors peuvent commenter uniquement sur les `documents` qu'ils ont uploadés — cohérent avec `documents_select`) ; UPDATE/DELETE limités à l'auteur (`user_id = auth.uid()`)
- Trigger `comments_log_activity` : sur INSERT, résout le titre du parent (CASE sur entity_type, lookup dans documents/deliverables/milestones/lots/budget_lines), insère dans `activity_log` avec action `commented` et `metadata={title, excerpt}`

#### Composants partagés
- [src/components/comments/CommentThread.jsx](src/components/comments/CommentThread.jsx) — liste + form, avatar circulaire navy avec initiales, nom + organisation + timestamp relatif, bouton Supprimer si auteur, compteur en haut, callback `onCountChange` pour propager au parent
- [src/components/comments/CommentBadge.jsx](src/components/comments/CommentBadge.jsx) — petite icône bulle + nombre, gris si 0
- [src/components/comments/useCommentCounts.js](src/components/comments/useCommentCounts.js) — hook bulk qui fetch les counts pour une liste d'IDs en une seule requête, ré-exécute quand `bumpKey` change (parent l'incrémente après add/delete)
- [src/components/calendrier/MilestoneDetailModal.jsx](src/components/calendrier/MilestoneDetailModal.jsx) — modal détail jalon (en-tête type/date/pays/lot/notes + thread)
- `Modal` étendu avec prop `size="md"|"lg"` + `max-h-[90vh] overflow-y-auto` pour ne pas déborder du viewport

#### Wiring sur les 5 pages
- **Documents** : nouvelle colonne avec badge cliquable, expansion inline d'un fragment `<tr><td colSpan=9>` sous la ligne, état d'expansion `expandedId` dans Documents.jsx
- **Livrables** : badge dans `DeliverableRow` (à droite du select de statut), expansion `<div>` sous la rangée flexbox, bypass de la vue calendrier (les deliverables apparaissent là sans badge — évite le doublon)
- **Calendrier** : carte de jalon devient un `<button>`, clic ouvre `MilestoneDetailModal` (vs un thread inline). Les cartes de livrables ne sont PAS cliquables — déjà commentables dans Livrables, on évite le doublon visuel/fonctionnel
- **LotDetail** : section commentaires en `<section>` après les onglets Documents/Livrables
- **Budget** (3 vues) : badge cliquable + expansion partagée entre vues. État géré dans Budget.jsx, propagé aux 3 vues — un fil ouvert dans "Par coproducteur" reste ouvert si on bascule en "Consolidée". Pour `ByCoproducerView`, j'ai utilisé l'existante prop `extraCells` de `BudgetLineRow` pour injecter le `<td>` du badge sans dupliquer le composant ; `ConsolidatedView` et `ByLotView` ont leur row inline donc le badge est ajouté directement.

#### RecentActivityBlock
- Ajout du verbe `commented: 'a commenté'` dans `ACTION_LABELS` → "Pierre a commenté un document : Rapport SODEC Q1"

#### Auto-deploy Netlify
- Découvert via `netlify api getSite` que `build_settings` était vide et `repo_url: null` — le site était déployé manuellement via CLI à chaque session, pas auto-lié au repo GitHub. Ce qu'on prenait pour de l'auto-deploy, c'était moi qui re-pushait via `netlify deploy --prod` après chaque `git push`.
- Repo lié dans le dashboard Netlify (`pierremichaudpm/gestionsila`, branche `main`)
- Vérifié avec un push de test (commit `08183d14`) : Netlify a buildé en 12s, l'auto-deploy fonctionne maintenant à chaque push

### Décisions techniques

- **Pas de chat global, juste des commentaires contextuels** — Discord couvre déjà la conversation. Un chat dans l'app dupliquerait l'outil sans le remplacer (pas de notifs mobiles, pas de fils, pas de vocal). Les commentaires attachés à une entité, eux, ont une vraie raison d'exister : ils restent avec la chose dont on parle.
- **Pas de commentaires sur les fichiers Google Drive** — Drive a déjà ce feature nativement (avec mentions, résolution, threading). Les commentaires de notre app sont uniquement sur les **fiches métadonnées** (la fiche `documents` côté Supabase, pas le fichier sur Drive).
- **Trigger SQL plutôt que insert client dans `activity_log`** — cohérent avec la stratégie déjà appliquée pour documents/deliverables/milestones/budget_lines (migration 004). Le trigger résout le titre du parent en SQL via un CASE sur entity_type → un seul aller-retour réseau côté client.
- **`action='commented'` avec `entity_type` du parent** (vs `entity_type='comment'`) — permet à `RecentActivityBlock` de réutiliser sa logique existante (`a commenté` + `un document`/`un livrable`/etc.) sans handling spécial pour les commentaires.
- **Contractor RLS strict** : les prestataires ne peuvent commenter QUE sur les documents qu'ils ont uploadés (pas sur d'autres entités). C'est cohérent avec leur SELECT sur documents (`uploaded_by = auth.uid()`). Pour Phase 2.5, l'UI ne masque pas le formulaire — un contractor qui essaierait de commenter sur un milestone se prendrait juste l'erreur RLS. Acceptable car les contractors ne voient même pas le Calendrier/Budget en pratique.
- **État d'expansion partagé entre les 3 vues du Budget** — un seul `expandedLineId` au niveau Budget.jsx, passé en prop aux 3 vues. Avantage : si tu ouvres un fil en "Par coproducteur" et bascules en "Consolidée", il reste ouvert. La même ligne apparaît dans toutes les vues (juste organisée différemment).
- **`useCommentCounts` avec `idsKey` joiné/trié** : le hook se ré-exécute quand l'ensemble des IDs change. Construire la dépendance comme `[...ids].sort().join(',')` permet à React de comparer en `===` strict — sinon le tableau créé à chaque render relancerait la requête en boucle.
- **Modal avec `size` prop** : avant, tous les modals étaient `max-w-md` (28rem). Pour `MilestoneDetailModal` qui contient un thread, j'ai ajouté `size="lg"` (`max-w-xl`). J'ai aussi ajouté `max-h-[90vh] overflow-y-auto` à tous les modals — bénéfice gratuit, évite que les modaux longs débordent du viewport.

### Problèmes rencontrés

- **L'auto-deploy Netlify n'était pas branché malgré l'illusion qu'il l'était.** Symptôme : après `git push`, le bundle live n'avait pas les nouveaux commentaires. Diagnostic via l'API Netlify (`netlify api getSite`) : `build_settings: {}`, `repo_url: null`, `deploy_source: api` sur tous les deploys passés. Solution : Virginie/Pierre a re-lié le repo dans le dashboard Netlify pendant la session. Première étape du diagnostic à retenir : vérifier `deploy_source: github` vs `api` quand on doute qu'une push a déclenché un build.
- **Import accidentel en bas de fichier** dans ConsolidatedView.jsx — j'ai mis `import { Fragment } from 'react'` sous l'export par habitude (l'import était nécessaire à cause de l'ajout de `<Fragment key={line.id}>` pour wrapper la row + sa row d'expansion). ESLint/Vite n'aurait pas pardonné. Corrigé immédiatement, à surveiller dans le futur.
- **Migration 005 conflit potentiel avec ma promesse de "005 éventuelle pour lots↔milestones"** dans le précédent CLAUDE.md. La migration de jointure passe en 006 si on la fait — j'ai mis à jour CLAUDE.md.

### Prochaines étapes

1. **Tester avec Virginie** — première vraie utilisation du module. Voir si le comportement "thread expand inline" est intuitif sur la page Documents (table dense) ou si un modal détail serait plus lisible.
2. **Hide form pour contractors** sur les entity_types qu'ils ne peuvent pas commenter (milestones, deliverables, lots, budget_lines). Aujourd'hui le formulaire s'affiche et l'erreur RLS arrive après le submit. Détection client : `accessLevel === 'contractor' && entityType !== 'document'` → hide.
3. **Notifications email** sur nouveau commentaire (Phase 3, Resend). Cas d'usage prioritaire pour la coproduction internationale.
4. **Vrais emails équipe** — toujours en placeholders sauf Virginie et Pierre. À corriger côté seed et DB live quand Virginie fournit la liste finale.
5. **Migration 006** (si jamais) : jointure `lots ↔ milestones` exposée correctement, et `deliverable_documents` pour la fonctionnalité "documents liés" du spec Livrables (toujours non câblée).
