# Templates emails Supabase Auth — SILA

Templates HTML français à coller dans
[supabase.com/dashboard/project/qqyrqiqnvsvzxqqukcjv/auth/templates](https://supabase.com/dashboard/project/qqyrqiqnvsvzxqqukcjv/auth/templates).

Style : navy/blanc, sobre, pas trop décoré. Compatible Gmail / Outlook /
Apple Mail / Thunderbolt. Layout tables (les clients mail tolèrent mal
flex/grid). Variables Supabase : `{{ .ConfirmationURL }}` (URL complète
avec token + redirect, format prêt à cliquer), `{{ .SiteURL }}`,
`{{ .Email }}`.

---

## 1. Reset Password — utilisé pour les invitations et les oublis

**C'est celui qu'on utilise quand tu cliques « Envoyer l'invitation »
sur une card Équipe, ou quand quelqu'un fait « Mot de passe oublié »
sur la page Login.** Priorité absolue.

### Sujet

```
Bienvenue sur SILA — Choisis ton mot de passe
```

### Corps HTML

```html
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#F8F9FA;font-family:Arial,Helvetica,sans-serif;margin:0;padding:0;">
  <tr><td align="center" style="padding:40px 16px;">
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="560" style="max-width:560px;background:#FFFFFF;border-radius:8px;border:1px solid #E5E7EB;">
      <tr><td style="background:#1B3A5C;padding:24px 32px;border-radius:8px 8px 0 0;">
        <div style="color:#FFFFFF;font-size:11px;text-transform:uppercase;letter-spacing:1px;opacity:0.85;">Gestion SILA</div>
        <div style="color:#FFFFFF;font-size:20px;font-weight:bold;margin-top:4px;">Héroïnes Arctiques</div>
      </td></tr>
      <tr><td style="padding:32px;color:#333333;font-size:14px;line-height:1.55;">
        <p style="margin:0 0 16px 0;">Bonjour,</p>
        <p style="margin:0 0 16px 0;">Tu as accès à <strong>SILA</strong>, l'outil de gestion de coproduction internationale pour <em>Héroïnes Arctiques</em>.</p>
        <p style="margin:0 0 24px 0;">Clique sur le bouton ci-dessous pour <strong>choisir ton mot de passe</strong> et te connecter à l'outil.</p>
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center" style="margin:0 auto;"><tr><td align="center">
          <a href="{{ .ConfirmationURL }}" style="display:inline-block;background:#1B3A5C;color:#FFFFFF;text-decoration:none;padding:12px 28px;border-radius:8px;font-weight:600;font-size:14px;">Choisir mon mot de passe</a>
        </td></tr></table>
        <p style="margin:28px 0 0 0;color:#6B7280;font-size:12px;">Le lien est valide pendant <strong>24 heures</strong>. Si tu n'attendais pas ce courriel, tu peux l'ignorer en toute sécurité.</p>
        <p style="margin:24px 0 0 0;color:#6B7280;font-size:11px;border-top:1px solid #E5E7EB;padding-top:16px;">Si le bouton ne fonctionne pas, copie-colle ce lien dans ton navigateur :<br/><span style="word-break:break-all;color:#2E75B6;">{{ .ConfirmationURL }}</span></p>
      </td></tr>
      <tr><td style="padding:16px 32px;background:#F8F9FA;border-top:1px solid #E5E7EB;border-radius:0 0 8px 8px;color:#6B7280;font-size:11px;line-height:1.4;">
        <strong style="color:#1B3A5C;">L'équipe SILA</strong> · JAXA Production<br/>
        Cette adresse n'accepte pas les réponses. Pour toute question, contacte ton administrateur·rice de projet.
      </td></tr>
    </table>
  </td></tr>
</table>
```

### Plain text fallback (champ optionnel selon Supabase)

```
Bonjour,

Tu as accès à SILA, l'outil de gestion de coproduction internationale
pour Héroïnes Arctiques.

Pour choisir ton mot de passe et te connecter, ouvre ce lien :

{{ .ConfirmationURL }}

Le lien est valide pendant 24 heures. Si tu n'attendais pas ce
courriel, ignore-le.

—
L'équipe SILA · JAXA Production
```

---

## 2. Magic Link — au cas où tu actives la connexion sans mot de passe

Pas utilisé aujourd'hui (on garde l'auth email + mot de passe), mais le
template par défaut peut quand même partir si quelqu'un appelle
`signInWithOtp`. Autant le franciser au cas où.

### Sujet

```
SILA — Lien de connexion
```

### Corps HTML

```html
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#F8F9FA;font-family:Arial,Helvetica,sans-serif;margin:0;padding:0;">
  <tr><td align="center" style="padding:40px 16px;">
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="560" style="max-width:560px;background:#FFFFFF;border-radius:8px;border:1px solid #E5E7EB;">
      <tr><td style="background:#1B3A5C;padding:24px 32px;border-radius:8px 8px 0 0;">
        <div style="color:#FFFFFF;font-size:11px;text-transform:uppercase;letter-spacing:1px;opacity:0.85;">Gestion SILA</div>
        <div style="color:#FFFFFF;font-size:20px;font-weight:bold;margin-top:4px;">Héroïnes Arctiques</div>
      </td></tr>
      <tr><td style="padding:32px;color:#333333;font-size:14px;line-height:1.55;">
        <p style="margin:0 0 16px 0;">Bonjour,</p>
        <p style="margin:0 0 24px 0;">Voici ton lien de connexion à <strong>SILA</strong>. Clique pour te connecter directement, sans mot de passe.</p>
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center" style="margin:0 auto;"><tr><td align="center">
          <a href="{{ .ConfirmationURL }}" style="display:inline-block;background:#1B3A5C;color:#FFFFFF;text-decoration:none;padding:12px 28px;border-radius:8px;font-weight:600;font-size:14px;">Me connecter</a>
        </td></tr></table>
        <p style="margin:28px 0 0 0;color:#6B7280;font-size:12px;">Le lien est valide pendant <strong>1 heure</strong>. Si tu n'attendais pas ce courriel, tu peux l'ignorer.</p>
        <p style="margin:24px 0 0 0;color:#6B7280;font-size:11px;border-top:1px solid #E5E7EB;padding-top:16px;">Si le bouton ne fonctionne pas, copie-colle ce lien dans ton navigateur :<br/><span style="word-break:break-all;color:#2E75B6;">{{ .ConfirmationURL }}</span></p>
      </td></tr>
      <tr><td style="padding:16px 32px;background:#F8F9FA;border-top:1px solid #E5E7EB;border-radius:0 0 8px 8px;color:#6B7280;font-size:11px;line-height:1.4;">
        <strong style="color:#1B3A5C;">L'équipe SILA</strong> · JAXA Production<br/>
        Cette adresse n'accepte pas les réponses.
      </td></tr>
    </table>
  </td></tr>
</table>
```

### Plain text

```
Bonjour,

Voici ton lien de connexion à SILA. Clique pour te connecter directement,
sans mot de passe :

{{ .ConfirmationURL }}

Le lien est valide pendant 1 heure. Si tu n'attendais pas ce courriel,
ignore-le.

—
L'équipe SILA · JAXA Production
```

---

## 3. Confirm Signup — au cas où le signup public est activé un jour

Pas utilisé aujourd'hui (les comptes sont créés via migrations), mais
Supabase peut envoyer ce template si on active les signups publics. Autant
qu'il soit en français.

### Sujet

```
SILA — Confirme ton adresse courriel
```

### Corps HTML

```html
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#F8F9FA;font-family:Arial,Helvetica,sans-serif;margin:0;padding:0;">
  <tr><td align="center" style="padding:40px 16px;">
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="560" style="max-width:560px;background:#FFFFFF;border-radius:8px;border:1px solid #E5E7EB;">
      <tr><td style="background:#1B3A5C;padding:24px 32px;border-radius:8px 8px 0 0;">
        <div style="color:#FFFFFF;font-size:11px;text-transform:uppercase;letter-spacing:1px;opacity:0.85;">Gestion SILA</div>
        <div style="color:#FFFFFF;font-size:20px;font-weight:bold;margin-top:4px;">Héroïnes Arctiques</div>
      </td></tr>
      <tr><td style="padding:32px;color:#333333;font-size:14px;line-height:1.55;">
        <p style="margin:0 0 16px 0;">Bonjour,</p>
        <p style="margin:0 0 24px 0;">Pour finaliser la création de ton compte sur <strong>SILA</strong>, confirme ton adresse courriel en cliquant sur le bouton ci-dessous.</p>
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center" style="margin:0 auto;"><tr><td align="center">
          <a href="{{ .ConfirmationURL }}" style="display:inline-block;background:#1B3A5C;color:#FFFFFF;text-decoration:none;padding:12px 28px;border-radius:8px;font-weight:600;font-size:14px;">Confirmer mon courriel</a>
        </td></tr></table>
        <p style="margin:28px 0 0 0;color:#6B7280;font-size:12px;">Si tu n'as pas créé de compte sur SILA, ignore ce courriel.</p>
        <p style="margin:24px 0 0 0;color:#6B7280;font-size:11px;border-top:1px solid #E5E7EB;padding-top:16px;">Si le bouton ne fonctionne pas, copie-colle ce lien dans ton navigateur :<br/><span style="word-break:break-all;color:#2E75B6;">{{ .ConfirmationURL }}</span></p>
      </td></tr>
      <tr><td style="padding:16px 32px;background:#F8F9FA;border-top:1px solid #E5E7EB;border-radius:0 0 8px 8px;color:#6B7280;font-size:11px;line-height:1.4;">
        <strong style="color:#1B3A5C;">L'équipe SILA</strong> · JAXA Production<br/>
        Cette adresse n'accepte pas les réponses.
      </td></tr>
    </table>
  </td></tr>
</table>
```

### Plain text

```
Bonjour,

Pour finaliser la création de ton compte sur SILA, confirme ton adresse
courriel en ouvrant ce lien :

{{ .ConfirmationURL }}

Si tu n'as pas créé de compte sur SILA, ignore ce courriel.

—
L'équipe SILA · JAXA Production
```

---

## 4. Change Email Address — quand un user change son courriel de connexion

Pas câblé dans l'UI actuellement (les changements de courriel passent par
toi en SQL), mais le template peut partir si quelqu'un appelle
`updateUser({ email })` un jour.

### Sujet

```
SILA — Confirme ta nouvelle adresse courriel
```

### Corps HTML

```html
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#F8F9FA;font-family:Arial,Helvetica,sans-serif;margin:0;padding:0;">
  <tr><td align="center" style="padding:40px 16px;">
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="560" style="max-width:560px;background:#FFFFFF;border-radius:8px;border:1px solid #E5E7EB;">
      <tr><td style="background:#1B3A5C;padding:24px 32px;border-radius:8px 8px 0 0;">
        <div style="color:#FFFFFF;font-size:11px;text-transform:uppercase;letter-spacing:1px;opacity:0.85;">Gestion SILA</div>
        <div style="color:#FFFFFF;font-size:20px;font-weight:bold;margin-top:4px;">Héroïnes Arctiques</div>
      </td></tr>
      <tr><td style="padding:32px;color:#333333;font-size:14px;line-height:1.55;">
        <p style="margin:0 0 16px 0;">Bonjour,</p>
        <p style="margin:0 0 24px 0;">Tu as demandé à changer l'adresse courriel de ton compte <strong>SILA</strong>. Confirme ta nouvelle adresse en cliquant sur le bouton ci-dessous.</p>
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center" style="margin:0 auto;"><tr><td align="center">
          <a href="{{ .ConfirmationURL }}" style="display:inline-block;background:#1B3A5C;color:#FFFFFF;text-decoration:none;padding:12px 28px;border-radius:8px;font-weight:600;font-size:14px;">Confirmer la nouvelle adresse</a>
        </td></tr></table>
        <p style="margin:28px 0 0 0;color:#6B7280;font-size:12px;">Si tu n'as pas demandé ce changement, ignore ce courriel — l'ancienne adresse reste active.</p>
        <p style="margin:24px 0 0 0;color:#6B7280;font-size:11px;border-top:1px solid #E5E7EB;padding-top:16px;">Si le bouton ne fonctionne pas, copie-colle ce lien dans ton navigateur :<br/><span style="word-break:break-all;color:#2E75B6;">{{ .ConfirmationURL }}</span></p>
      </td></tr>
      <tr><td style="padding:16px 32px;background:#F8F9FA;border-top:1px solid #E5E7EB;border-radius:0 0 8px 8px;color:#6B7280;font-size:11px;line-height:1.4;">
        <strong style="color:#1B3A5C;">L'équipe SILA</strong> · JAXA Production<br/>
        Cette adresse n'accepte pas les réponses.
      </td></tr>
    </table>
  </td></tr>
</table>
```

### Plain text

```
Bonjour,

Tu as demandé à changer l'adresse courriel de ton compte SILA. Confirme
ta nouvelle adresse en ouvrant ce lien :

{{ .ConfirmationURL }}

Si tu n'as pas demandé ce changement, ignore ce courriel — l'ancienne
adresse reste active.

—
L'équipe SILA · JAXA Production
```

---

## 5. Invite User — pour le jour où on utilisera `admin.inviteUserByEmail`

Aujourd'hui on utilise `resetPasswordForEmail` pour inviter (template 1
ci-dessus). Mais si on bascule un jour sur `admin.inviteUserByEmail` —
qui demande la `service_role` key et un compte n'existant pas encore
en base — Supabase utilise un template séparé. Voici sa version SILA.

### Sujet

```
Tu es invité·e sur SILA
```

### Corps HTML

```html
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#F8F9FA;font-family:Arial,Helvetica,sans-serif;margin:0;padding:0;">
  <tr><td align="center" style="padding:40px 16px;">
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="560" style="max-width:560px;background:#FFFFFF;border-radius:8px;border:1px solid #E5E7EB;">
      <tr><td style="background:#1B3A5C;padding:24px 32px;border-radius:8px 8px 0 0;">
        <div style="color:#FFFFFF;font-size:11px;text-transform:uppercase;letter-spacing:1px;opacity:0.85;">Gestion SILA</div>
        <div style="color:#FFFFFF;font-size:20px;font-weight:bold;margin-top:4px;">Héroïnes Arctiques</div>
      </td></tr>
      <tr><td style="padding:32px;color:#333333;font-size:14px;line-height:1.55;">
        <p style="margin:0 0 16px 0;">Bonjour,</p>
        <p style="margin:0 0 16px 0;">Tu as été invité·e à rejoindre <strong>SILA</strong>, l'outil de gestion de coproduction internationale pour <em>Héroïnes Arctiques</em>.</p>
        <p style="margin:0 0 24px 0;">Clique sur le bouton ci-dessous pour activer ton compte et choisir ton mot de passe.</p>
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center" style="margin:0 auto;"><tr><td align="center">
          <a href="{{ .ConfirmationURL }}" style="display:inline-block;background:#1B3A5C;color:#FFFFFF;text-decoration:none;padding:12px 28px;border-radius:8px;font-weight:600;font-size:14px;">Activer mon compte</a>
        </td></tr></table>
        <p style="margin:28px 0 0 0;color:#6B7280;font-size:12px;">Le lien est valide pendant <strong>24 heures</strong>.</p>
        <p style="margin:24px 0 0 0;color:#6B7280;font-size:11px;border-top:1px solid #E5E7EB;padding-top:16px;">Si le bouton ne fonctionne pas, copie-colle ce lien dans ton navigateur :<br/><span style="word-break:break-all;color:#2E75B6;">{{ .ConfirmationURL }}</span></p>
      </td></tr>
      <tr><td style="padding:16px 32px;background:#F8F9FA;border-top:1px solid #E5E7EB;border-radius:0 0 8px 8px;color:#6B7280;font-size:11px;line-height:1.4;">
        <strong style="color:#1B3A5C;">L'équipe SILA</strong> · JAXA Production<br/>
        Cette adresse n'accepte pas les réponses.
      </td></tr>
    </table>
  </td></tr>
</table>
```

### Plain text

```
Bonjour,

Tu as été invité·e à rejoindre SILA, l'outil de gestion de coproduction
internationale pour Héroïnes Arctiques.

Pour activer ton compte et choisir ton mot de passe, ouvre ce lien :

{{ .ConfirmationURL }}

Le lien est valide pendant 24 heures.

—
L'équipe SILA · JAXA Production
```

---

## Procédure pour Pierre

Pour chaque template à modifier :

1. Aller sur [supabase.com/dashboard/project/qqyrqiqnvsvzxqqukcjv/auth/templates](https://supabase.com/dashboard/project/qqyrqiqnvsvzxqqukcjv/auth/templates)
2. Sélectionner le template (Reset Password en priorité)
3. Champ **Subject** : copier-coller le sujet de la section correspondante
4. Champ **Message body** : effacer le HTML existant, coller le nouveau
5. (Optionnel) Champ **Plain text** s'il existe : coller le fallback
6. Cliquer **Save**

Tester ensuite en cliquant « Envoyer l'invitation » sur la card Jérémy
dans Équipe — il reçoit le mail avec le rendu SILA.

## Notes

- Les variables `{{ .ConfirmationURL }}`, `{{ .SiteURL }}`, etc. sont du
  Go template — Supabase les interpole avant l'envoi. Ne pas les
  modifier ou les échapper.
- Le rendu peut varier selon les clients mail. Gmail / Outlook / Apple
  Mail bien gérés. Outlook desktop ancien (2007/2010) peut casser
  certains border-radius — acceptable.
- Si tu veux tester localement le rendu HTML, copie le bloc dans un
  fichier `.html` et ouvre-le dans un navigateur. Les variables
  Supabase resteront littérales (`{{ .ConfirmationURL }}`) — c'est
  normal, elles seront interpolées seulement en envoi réel.
- Limite d'envoi par défaut : ~3-4 emails/heure pour le SMTP Supabase
  intégré. Pour lever : configurer un SMTP custom (Resend, SendGrid)
  dans Supabase → Auth → SMTP Settings.
