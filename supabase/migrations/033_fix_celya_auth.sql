-- ============================================================================
-- 033_fix_celya_auth.sql
--
-- Répare le compte d'authentification de Cylia Rabhi (rbhcelya@gmail.com).
--
-- CONTEXTE — voir WORKING_LOG 2026-05-20 :
--   La migration 032 a été appliquée à la main via le SQL Editor avec une
--   cascade d'erreurs. Le INSERT auth.users (id …014) a réussi mais le INSERT
--   public.users a échoué (email déjà présent depuis un test antérieur). Le fix
--   appliqué a été : DELETE de l'entrée auth.users orpheline + UPDATE de la
--   ligne public.users pré-existante. Résultat : l'id …014 de 032 n'a jamais
--   abouti ; le compte effectif de Cylia est la ligne public.users du test
--   antérieur (id inconnu), et son côté auth est potentiellement incomplet
--   (email désynchronisé, email non confirmé, ou identité auth.identities
--   absente — le seed crée auth.users sans identité, gotrue v2.188.1).
--
-- SYMPTÔME : resetPasswordForEmail('rbhcelya@gmail.com') n'envoie aucun courriel
--   et ne renvoie aucune erreur (anti-énumération Supabase). Cylia "ne reçoit
--   rien". Ce N'EST PAS lié à la migration d'URL Netlify ni aux mots de passe
--   des autres comptes (backend Supabase inchangé).
--
-- CE QUE FAIT CETTE MIGRATION (idempotente, non destructive) :
--   1. Récupère l'id canonique depuis public.users via l'email (pas …014).
--   2. auth.users : crée la ligne si absente, sinon répare (email aligné, email
--      confirmé, tokens vides non-NULL, app_meta provider=email). Le mot de
--      passe existant est PRÉSERVÉ ; un mot de passe temporaire connu n'est posé
--      QUE s'il n'y en a aucun.
--   3. auth.identities : crée l'identité 'email' si absente (requise par gotrue
--      pour login + recovery).
--
-- FILET DE SECOURS : si après ça le courriel de réinitialisation n'arrive
--   toujours pas (rate-limit SMTP / spam), et SEULEMENT si aucun mot de passe
--   n'existait, Cylia peut se connecter directement avec le mot de passe
--   temporaire « Tmp!SILA2026#C » puis le changer dans Paramètres.
--
-- À LANCER : Supabase → SQL Editor (comme 031/032).
-- ============================================================================

do $$
declare
  v_email text := 'rbhcelya@gmail.com';
  v_uid   uuid;
  v_pw    text := extensions.crypt('Tmp!SILA2026#C', extensions.gen_salt('bf'));
begin
  -- 1. Id canonique : la ligne public.users qui fait foi (créée par un test
  --    antérieur puis mise à jour pendant le nettoyage de 032).
  select id into v_uid from public.users where email = v_email;

  if v_uid is null then
    raise exception
      'Aucune ligne public.users pour % — lancer d''abord le diagnostic, état inattendu.',
      v_email;
  end if;

  -- 2. auth.users : créer si absent, sinon réparer.
  if exists (select 1 from auth.users where id = v_uid) then
    update auth.users set
      email                      = v_email,
      -- préserve un mot de passe existant ; pose le temporaire seulement si vide/NULL
      encrypted_password         = coalesce(nullif(encrypted_password, ''), v_pw),
      email_confirmed_at         = coalesce(email_confirmed_at, now()),
      -- gotrue lit ces colonnes comme des chaînes : NULL provoque des erreurs de scan
      confirmation_token         = coalesce(confirmation_token, ''),
      recovery_token             = coalesce(recovery_token, ''),
      email_change               = coalesce(email_change, ''),
      email_change_token_new     = coalesce(email_change_token_new, ''),
      email_change_token_current = coalesce(email_change_token_current, ''),
      raw_app_meta_data          = '{"provider":"email","providers":["email"]}'::jsonb,
      updated_at                 = now()
    where id = v_uid;
  else
    -- Cas limite : public.users sans auth.users (possible si la FK a été
    -- contournée via session_replication_role pendant le nettoyage manuel).
    insert into auth.users (
      instance_id, id, aud, role, email, encrypted_password,
      email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
      created_at, updated_at,
      confirmation_token, email_change, email_change_token_new, recovery_token
    ) values (
      '00000000-0000-0000-0000-000000000000', v_uid, 'authenticated', 'authenticated',
      v_email, v_pw, now(),
      '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb,
      now(), now(), '', '', '', ''
    );
  end if;

  -- 3. auth.identities : indispensable à gotrue pour résoudre l'utilisateur par
  --    email (login ET récupération de mot de passe). Le seed historique ne la
  --    crée pas → cause probable du "ne reçoit rien".
  if not exists (
    select 1 from auth.identities where user_id = v_uid and provider = 'email'
  ) then
    insert into auth.identities (
      provider_id, user_id, identity_data, provider,
      last_sign_in_at, created_at, updated_at
    ) values (
      v_uid::text, v_uid,
      jsonb_build_object(
        'sub',            v_uid::text,
        'email',          v_email,
        'email_verified', true,
        'phone_verified', false
      ),
      'email', now(), now(), now()
    );
  end if;

  raise notice 'Compte auth de % réparé (id %).', v_email, v_uid;
end $$;

-- ----------------------------------------------------------------------------
-- VÉRIFICATION post-migration (à lancer juste après) :
--
--   select u.id, u.email, u.email_confirmed_at,
--          (u.encrypted_password is not null) as a_un_mdp,
--          i.provider, i.provider_id
--   from auth.users u
--   left join auth.identities i on i.user_id = u.id and i.provider = 'email'
--   where u.email = 'rbhcelya@gmail.com';
--
-- Attendu : 1 ligne, email_confirmed_at non NULL, a_un_mdp = true,
--           provider = 'email'. Ensuite : page Équipe → card Cylia →
--           « Envoyer l'invitation », ou Cylia utilise « Mot de passe oublié ».
-- ----------------------------------------------------------------------------
