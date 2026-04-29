# Suivi sécurité post-prod

Findings de l'audit du 2026-04-29 qui n'étaient pas bloquants pour la mise en
prod. À traiter en post-prod selon priorité.

---

## M1 — `comments` UPDATE/DELETE sans barrière `has_producer_access`

**Statut** : ouvert.

**Description** : les policies `comments_update` et `comments_delete`
(`supabase/migrations/005_comments.sql:58-64`) ne vérifient que
`user_id = auth.uid()`. Si Virginie révoque l'accès producteur d'un user
après qu'il ait commenté un `budget_line` ou un `producer_document`, il peut
toujours mettre à jour ou supprimer son commentaire.

**Risque** : tampering rétroactif sur du contenu confidentiel par un user
qui a perdu l'accès. Probabilité faible (rotation rare des accès), impact
faible (un commentaire, pas une donnée structurée).

**Fix proposé** :

```sql
drop policy comments_update on public.comments;
drop policy comments_delete on public.comments;

create policy comments_update on public.comments
  for update to authenticated
  using (
    user_id = auth.uid()
    and (
      entity_type not in ('budget_line', 'producer_document')
      or public.has_producer_access(project_id)
    )
  )
  with check (
    user_id = auth.uid()
    and (
      entity_type not in ('budget_line', 'producer_document')
      or public.has_producer_access(project_id)
    )
  );

create policy comments_delete on public.comments
  for delete to authenticated using (
    user_id = auth.uid()
    and (
      entity_type not in ('budget_line', 'producer_document')
      or public.has_producer_access(project_id)
    )
  );
```

**Quand traiter** : avant la prochaine production (multi-tenant) ou si
quelqu'un perd son accès producteur.

---

## M2 — `organizations` ouvert à tout admin cross-projet

**Statut** : ouvert.

**Description** : `supabase/migrations/001_schema.sql:272-293`. Les policies
INSERT/UPDATE/DELETE sur `organizations` autorisent tout user qui est admin
de **n'importe quel** projet à créer/modifier/supprimer des organisations.
Aucun lien n'est fait entre l'org et le projet où l'admin est actif.

**Risque** : latent. Aucun impact sur SILA (un seul projet, un seul admin).
Devient critique dès qu'un autre projet est créé : un admin du projet B
pourrait renommer "JAXA" ou "Dark Euphoria" alors qu'il n'est pas dans
SILA.

**Fix proposé** : restreindre à un admin attaché à un projet qui partage
cette org (jointure via `project_members.org_id`, `lots.org_id`, ou
`budget_lines.org_id`). Ou alternativement : créer un nouveau modèle
`organization_admins` qui lie explicitement.

**Quand traiter** : avant l'ajout d'un deuxième projet.

---

## M3 — `funding_sources.amount_eur/amount_cad` modifiables par coproducer

**Statut** : en discussion avec Virginie.

**Description** : `supabase/migrations/010_budget_extensions.sql`. Les
montants contractuels figés dans le CSV initial peuvent être modifiés par
un coproducer (sur son pays) ou un admin. Le trigger `track_imported_changes`
capture la valeur d'origine dans `imported_value` (donc traçable), mais
rien n'empêche un coproducer FR de PATCH `amount_eur=999999` sur une
source FR.

**Question pour Virginie** : ces colonnes doivent-elles être figées sauf
pour l'admin (qui aurait l'autorité contractuelle), ou le coproducer doit-il
pouvoir corriger un montant (typo, ré-évaluation contractuelle) ?

**Fix éventuel selon réponse** : si verrouillage admin-only :

```sql
create or replace function public.protect_funding_source_amounts()
returns trigger language plpgsql as $$
begin
  if exists (select 1 from public.project_members
              where user_id = auth.uid() and access_level = 'admin'
                and project_id = NEW.project_id) then
    return NEW;
  end if;
  NEW.amount_eur := OLD.amount_eur;
  NEW.amount_cad := OLD.amount_cad;
  return NEW;
end $$;

create trigger funding_sources_protect_amounts
  before update on public.funding_sources
  for each row execute function public.protect_funding_source_amounts();
```

**Quand traiter** : après réponse Virginie.

---

## M4 — `projects` INSERT ouvert à tout user authentifié

**Statut** : ouvert.

**Description** : `supabase/migrations/001_schema.sql:322-323`,
`projects_insert with check (true)`. N'importe quel user authentifié peut
créer un projet vide. Il devient orphelin (pas de project_member créé) et
n'apparaît pas dans son interface (puisque `useCurrentProject` filtre via
project_members), mais il pollue la base.

**Risque** : faible. Pollution DB par un user mal intentionné qui scripte
des INSERT répétés. Pas d'escalation, juste un déni de service léger.

**Fix proposé** : RPC SECURITY DEFINER `create_project_with_admin()` qui
crée le projet + le membership admin atomiquement, et retire l'INSERT
direct de la policy :

```sql
drop policy projects_insert on public.projects;

create or replace function public.create_project_with_admin(
  p_name text,
  p_description text default null
)
returns uuid
language plpgsql security definer
as $$
declare
  new_project_id uuid;
  current_user_org_id uuid;
begin
  if auth.uid() is null then
    raise exception 'authentication required';
  end if;
  -- … logique d'auto-rattachement à l'org du user comme admin du nouveau projet
end $$;
```

**Quand traiter** : avant l'ajout multi-tenant.

---

## L4 — `activity_log` insertable manuellement par tout membre

**Statut** : ouvert.

**Description** : `supabase/migrations/001_schema.sql:572-575`. La policy
`activity_log_insert` autorise un user à insérer une entrée arbitraire
avec `user_id = auth.uid()`. Permet de polluer le journal "Activité
récente" du dashboard avec du faux contenu type "Mathieu a soumis le
budget JAXA".

**Risque** : impersonation visuelle dans le journal. Le user_id reste
honnête (l'attaquant ne peut pas pretendre être quelqu'un d'autre), mais
l'action et l'entity_type sont libres.

**Fix proposé** : retirer la policy INSERT à `authenticated` ; les inserts
ne se font qu'à travers les triggers `SECURITY DEFINER` existants
(documents, deliverables, milestones, budget_lines, comments,
producer_documents).

```sql
drop policy activity_log_insert on public.activity_log;
-- Les triggers SECURITY DEFINER continuent d'insérer (ils outrepassent RLS).
```

**Quand traiter** : peut suivre le pattern global de durcissement RLS.

---

## Note sur L3 (lockout self-inflicted admin)

`src/components/equipe/EditMemberModal.jsx:143` : la garde `disabled={isSelf}`
sur le select access_level est purement client. Un admin déterminé peut
forcer son auto-rétrogradation et perdre l'accès admin (lockout
auto-infligé). Pas une vulnérabilité d'autrui, juste un piège UX. **Pas de
fix prévu** — accepté comme risque utilisateur.

---

## Historique

- 2026-04-29 — audit complet (sub-agent + revue manuelle), 18 migrations + frontend
- 2026-04-29 — fix CRITICAL et HIGH appliqué via migration 019_security_hardening
