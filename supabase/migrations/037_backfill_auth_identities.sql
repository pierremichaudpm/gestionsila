-- 037_backfill_auth_identities.sql
--
-- Répare l'authentification de TOUS les comptes seedés par SQL (pas seulement
-- Cylia, déjà corrigée en 033).
--
-- CONTEXTE :
--   Le seed historique (supabase/seed.sql) et les migrations 012 / 030 / 032
--   créent les comptes par INSERT direct dans auth.users SANS créer l'entrée
--   correspondante dans auth.identities. Sous gotrue v2.188.1, l'identité 'email'
--   est requise pour la RÉCUPÉRATION de mot de passe (et le login par email).
--
-- SYMPTÔME (rapporté par Virginie, 2026-06-02) :
--   « J'envoie des invitations et personne ne les reçoit, comme si c'était brisé. »
--   Le bouton « Envoyer l'invitation » appelle resetPasswordForEmail(). Sans
--   identité 'email', gotrue ne résout pas l'utilisateur et N'ENVOIE AUCUN
--   courriel — sans renvoyer d'erreur (anti-énumération). Idem pour
--   « Mot de passe oublié ».
--
-- DIAGNOSTIC (live, 2026-06-02) : 13 comptes, 1 seul avec identité (Cylia/033),
--   12 cassés.
--
-- CE QUE FAIT CETTE MIGRATION (idempotente, non destructive) :
--   Pour chaque ligne public.users dont le compte auth.users existe mais sans
--   identité 'email' :
--     1. auth.identities : crée l'identité 'email' manquante.
--     2. auth.users : aligne les colonnes token sur '' si NULL (gotrue les lit
--        comme des chaînes ; un NULL provoque des erreurs de scan au recovery)
--        et confirme l'email si pas déjà fait.
--   Les mots de passe existants sont PRÉSERVÉS — aucun n'est touché ni posé.
--
-- À LANCER : Supabase → SQL Editor (comme 032 / 033).

do $$
declare
  r record;
begin
  for r in
    select pu.id, pu.email
    from public.users pu
    join auth.users au on au.id = pu.id
    where not exists (
      select 1 from auth.identities ai
      where ai.user_id = pu.id and ai.provider = 'email'
    )
  loop
    -- 1. Identité 'email' indispensable à gotrue (login + recovery).
    insert into auth.identities (
      provider_id, user_id, identity_data, provider,
      last_sign_in_at, created_at, updated_at
    ) values (
      r.id::text, r.id,
      jsonb_build_object(
        'sub',            r.id::text,
        'email',          r.email,
        'email_verified', true,
        'phone_verified', false
      ),
      'email', now(), now(), now()
    );

    -- 2. Hygiène auth.users : tokens non-NULL, email confirmé, provider email.
    --    coalesce ⇒ ne change que ce qui est NULL ; ne touche pas au mot de passe.
    update auth.users set
      email_confirmed_at         = coalesce(email_confirmed_at, now()),
      confirmation_token         = coalesce(confirmation_token, ''),
      recovery_token             = coalesce(recovery_token, ''),
      email_change               = coalesce(email_change, ''),
      email_change_token_new     = coalesce(email_change_token_new, ''),
      email_change_token_current = coalesce(email_change_token_current, ''),
      raw_app_meta_data          = '{"provider":"email","providers":["email"]}'::jsonb,
      updated_at                 = now()
    where id = r.id;

    raise notice 'Identité auth créée pour % (id %).', r.email, r.id;
  end loop;
end $$;

-- VÉRIFICATION post-migration (doit renvoyer 0 ligne) :
--
--   select pu.email
--   from public.users pu
--   left join auth.identities ai on ai.user_id = pu.id and ai.provider = 'email'
--   where ai.id is null;
--
-- Ensuite : page Équipe → « Envoyer l'invitation » fonctionne pour tout le
-- monde (ATTENTION au rate-limit SMTP Supabase ~2-4 courriels/h : envoyer par
-- petits lots), ou chaque personne peut utiliser « Mot de passe oublié ».
