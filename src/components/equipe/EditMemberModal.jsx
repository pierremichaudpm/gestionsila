import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import {
  accessLevelLabel,
  countryFlag,
  countryName,
  COUNTRY_OPTIONS,
} from '../../lib/format'
import Modal from '../ui/Modal.jsx'

const ACCESS_LEVELS = ['admin', 'coproducer', 'production_manager', 'contractor']

// Édition d'un membre du projet. Trois modes :
//  - self  : l'utilisateur édite son propre profil. full_name + role uniquement.
//  - admin : un admin édite n'importe qui. Tous les champs.
//  - lecture : si ni self ni admin, la modal ne s'ouvre pas (le bouton n'est
//    pas affiché côté liste).
//
// L'email ici met à jour public.users.email (champ d'affichage). L'email de
// connexion vit dans auth.users et reste géré séparément (migration SQL).
export default function EditMemberModal({ open, onClose, member, currentUserId, isAdmin, orgs, onSaved }) {
  const targetUserId = member?.user?.id
  const isSelf = !!targetUserId && targetUserId === currentUserId

  const [form, setForm] = useState(buildForm(member))
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (open) {
      setForm(buildForm(member))
      setError(null)
    }
  }, [open, member])

  function update(key, value) {
    setForm(prev => ({ ...prev, [key]: value }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!member || !targetUserId) return
    setSubmitting(true)
    setError(null)

    // Patch users : full_name, role pour tout le monde ; email/country/org_id
    // si admin.
    const userPatch = {
      full_name: form.full_name,
      role:      form.role,
    }
    if (isAdmin) {
      userPatch.email   = form.email
      userPatch.country = form.country
      userPatch.org_id  = form.org_id
    }
    const { error: userError } = await supabase
      .from('users')
      .update(userPatch)
      .eq('id', targetUserId)
    if (userError) {
      setSubmitting(false)
      setError(userError.message)
      return
    }

    // Patch project_members : access_level + org_id (le rattachement projet
    // peut différer du users.org_id). Admin only.
    if (isAdmin) {
      const memberPatch = {
        access_level: form.access_level,
        org_id:       form.org_id,
      }
      const { error: memberError } = await supabase
        .from('project_members')
        .update(memberPatch)
        .eq('id', member.id)
      if (memberError) {
        setSubmitting(false)
        setError(memberError.message)
        return
      }
    }

    setSubmitting(false)
    onSaved()
  }

  return (
    <Modal open={open} onClose={onClose} title={isSelf && !isAdmin ? 'Modifier mon profil' : 'Modifier le profil'}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <Field label="Nom complet" required>
          <input
            type="text"
            required
            value={form.full_name}
            onChange={(e) => update('full_name', e.target.value)}
            className="block w-full rounded border border-slate-300 px-3 py-2 text-sm focus:border-brand-blue focus:outline-none focus:ring-1 focus:ring-brand-blue"
          />
        </Field>

        <Field label="Rôle / fonction">
          <input
            type="text"
            value={form.role}
            onChange={(e) => update('role', e.target.value)}
            placeholder="Ex. Productrice, Chargée de production…"
            className="block w-full rounded border border-slate-300 px-3 py-2 text-sm focus:border-brand-blue focus:outline-none focus:ring-1 focus:ring-brand-blue"
          />
        </Field>

        {isAdmin ? (
          <>
            <Field label="Email">
              <input
                type="email"
                value={form.email}
                onChange={(e) => update('email', e.target.value)}
                className="block w-full rounded border border-slate-300 px-3 py-2 text-sm focus:border-brand-blue focus:outline-none focus:ring-1 focus:ring-brand-blue"
              />
              <p className="mt-1 text-xs text-slate-500">
                Cet email est l'affichage interne. L'email de connexion (Supabase Auth) doit
                être modifié séparément si nécessaire.
              </p>
            </Field>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Field label="Pays">
                <select
                  value={form.country}
                  onChange={(e) => update('country', e.target.value)}
                  className="block w-full rounded border border-slate-300 px-3 py-2 text-sm focus:border-brand-blue focus:outline-none focus:ring-1 focus:ring-brand-blue"
                >
                  {COUNTRY_OPTIONS.map(c => (
                    <option key={c} value={c}>{countryFlag(c)} {countryName(c)}</option>
                  ))}
                </select>
              </Field>
              <Field label="Niveau d'accès">
                <select
                  value={form.access_level}
                  onChange={(e) => update('access_level', e.target.value)}
                  disabled={isSelf}
                  className="block w-full rounded border border-slate-300 px-3 py-2 text-sm focus:border-brand-blue focus:outline-none focus:ring-1 focus:ring-brand-blue disabled:bg-slate-50"
                >
                  {ACCESS_LEVELS.map(l => (
                    <option key={l} value={l}>{accessLevelLabel(l).label}</option>
                  ))}
                </select>
                {isSelf ? (
                  <p className="mt-1 text-xs text-slate-500">Vous ne pouvez pas changer votre propre niveau d'accès.</p>
                ) : null}
              </Field>
            </div>

            <Field label="Organisation">
              <select
                value={form.org_id}
                onChange={(e) => update('org_id', e.target.value)}
                className="block w-full rounded border border-slate-300 px-3 py-2 text-sm focus:border-brand-blue focus:outline-none focus:ring-1 focus:ring-brand-blue"
              >
                {orgs.map(o => (
                  <option key={o.id} value={o.id}>{o.name}</option>
                ))}
              </select>
            </Field>
          </>
        ) : (
          <p className="text-xs text-slate-500">
            Seuls le nom et le rôle sont modifiables sur votre propre profil.
            Les autres champs (email, pays, organisation, niveau d'accès) sont
            gérés par l'administrateur du projet.
          </p>
        )}

        {error ? (
          <div className="rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>
        ) : null}

        <div className="flex justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60"
          >
            Annuler
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="rounded-lg bg-[color:var(--color-brand-navy)] px-4 py-2 text-sm font-medium text-white transition hover:bg-[color:var(--color-brand-blue)] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting ? 'Enregistrement…' : 'Enregistrer'}
          </button>
        </div>
      </form>
    </Modal>
  )
}

function buildForm(member) {
  return {
    full_name:    member?.user?.full_name ?? '',
    role:         member?.user?.role ?? '',
    email:        member?.user?.email ?? '',
    country:      member?.user?.country ?? 'CA',
    access_level: member?.access_level ?? 'contractor',
    org_id:       member?.org?.id ?? '',
  }
}

function Field({ label, required, children }) {
  return (
    <div>
      <label className="block text-sm font-medium text-slate-700">
        {label}{required ? <span className="text-red-500"> *</span> : null}
      </label>
      <div className="mt-1">{children}</div>
    </div>
  )
}
