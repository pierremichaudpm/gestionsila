import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/AuthProvider.jsx'
import { useCurrentProject } from '../lib/useCurrentProject'
import {
  accessLevelLabel,
  countryFlag,
  countryName,
  toneClass,
} from '../lib/format'
import EditMemberModal from '../components/equipe/EditMemberModal.jsx'

export default function Equipe() {
  const { projectId, accessLevel, loading: projectLoading } = useCurrentProject()
  const { profile } = useAuth()
  const [members, setMembers] = useState([])
  const [orgs, setOrgs] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [editingMember, setEditingMember] = useState(null)
  const [reloadKey, setReloadKey] = useState(0)

  const isAdmin = accessLevel === 'admin'
  const currentUserId = profile?.id ?? null

  useEffect(() => {
    if (!projectId) return
    let alive = true

    async function load() {
      setLoading(true)
      setError(null)
      const [membersRes, orgsRes] = await Promise.all([
        supabase
          .from('project_members')
          .select(`
            id,
            access_level,
            user:users(id, full_name, email, country, role),
            org:organizations(id, name, country, role)
          `)
          .eq('project_id', projectId),
        supabase
          .from('organizations')
          .select('id, name, country, role')
          .order('name', { ascending: true }),
      ])

      if (!alive) return
      if (membersRes.error || orgsRes.error) {
        setError(membersRes.error ?? orgsRes.error)
        setLoading(false)
        return
      }
      setMembers(membersRes.data ?? [])
      setOrgs(orgsRes.data ?? [])
      setLoading(false)
    }

    load()
    return () => { alive = false }
  }, [projectId, reloadKey])

  const groups = useMemo(() => {
    const byOrg = new Map()
    for (const m of members) {
      const orgId = m.org?.id ?? 'unknown'
      if (!byOrg.has(orgId)) {
        byOrg.set(orgId, { org: m.org, members: [] })
      }
      byOrg.get(orgId).members.push(m)
    }
    return Array.from(byOrg.values())
      .sort((a, b) => (a.org?.name ?? '').localeCompare(b.org?.name ?? ''))
  }, [members])

  function canEdit(member) {
    if (isAdmin) return true
    if (member.user?.id === currentUserId) return true
    return false
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold text-brand-navy">Équipe</h1>
        <p className="mt-1 text-sm text-slate-500">
          Annuaire des partenaires regroupés par organisation.
        </p>
      </header>

      {projectLoading || loading ? (
        <div className="space-y-3">
          <div className="h-32 animate-pulse rounded-lg border border-slate-200 bg-white" />
          <div className="h-32 animate-pulse rounded-lg border border-slate-200 bg-white" />
        </div>
      ) : error ? (
        <ErrorState error={error} />
      ) : members.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="space-y-6">
          {groups.map(group => (
            <OrgSection
              key={group.org?.id ?? 'unknown'}
              org={group.org}
              members={group.members}
              canEdit={canEdit}
              isAdmin={isAdmin}
              onEdit={(m) => setEditingMember(m)}
            />
          ))}
        </div>
      )}

      <EditMemberModal
        open={!!editingMember}
        member={editingMember}
        currentUserId={currentUserId}
        isAdmin={isAdmin}
        orgs={orgs}
        onClose={() => setEditingMember(null)}
        onSaved={() => { setEditingMember(null); setReloadKey(k => k + 1) }}
      />
    </div>
  )
}

function OrgSection({ org, members, canEdit, isAdmin, onEdit }) {
  return (
    <section>
      <div className="mb-3 flex items-baseline gap-2">
        <h2 className="text-sm font-semibold text-slate-900">
          {countryFlag(org?.country)} {org?.name ?? 'Organisation inconnue'}
        </h2>
        <span className="text-xs text-slate-400">
          {members.length} {members.length > 1 ? 'membres' : 'membre'}
        </span>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {members.map(m => (
          <MemberCard
            key={m.id}
            member={m}
            editable={canEdit(m)}
            isAdmin={isAdmin}
            onEdit={() => onEdit(m)}
          />
        ))}
      </div>
    </section>
  )
}

function MemberCard({ member, editable, isAdmin, onEdit }) {
  const access = accessLevelLabel(member.access_level)
  const user = member.user
  const [inviteState, setInviteState] = useState('idle') // idle | sending | sent | error
  const [inviteError, setInviteError] = useState(null)

  async function handleInvite() {
    if (!user?.email) return
    if (!window.confirm(`Envoyer une invitation à ${user.full_name} (${user.email}) ?\n\nLa personne recevra un courriel avec un lien pour choisir son mot de passe.`)) return
    setInviteState('sending')
    setInviteError(null)
    const { error } = await supabase.auth.resetPasswordForEmail(user.email, {
      redirectTo: `${window.location.origin}/reset-password`,
    })
    if (error) {
      setInviteState('error')
      setInviteError(error.message)
      return
    }
    setInviteState('sent')
    setTimeout(() => setInviteState('idle'), 8000)
  }

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1">
          <div className="text-sm font-semibold text-slate-900">
            {user?.full_name ?? '—'}
          </div>
          {user?.role ? (
            <div className="mt-0.5 text-xs text-slate-500">{user.role}</div>
          ) : null}
        </div>
        <span
          className={`inline-flex shrink-0 rounded px-2 py-0.5 text-[11px] font-medium ${toneClass(access.tone)}`}
        >
          {access.label}
        </span>
      </div>
      {user?.email ? (
        <a
          href={`mailto:${user.email}`}
          className="mt-3 block truncate text-xs text-brand-blue hover:underline"
        >
          {user.email}
        </a>
      ) : null}
      {user?.country ? (
        <div className="mt-1 text-xs text-slate-500">
          {countryFlag(user.country)} {countryName(user.country)}
        </div>
      ) : null}
      {editable ? (
        <button
          type="button"
          onClick={onEdit}
          className="mt-3 w-full rounded border border-slate-300 px-2 py-1 text-xs font-medium text-slate-700 hover:border-brand-blue hover:text-brand-blue"
        >
          Modifier
        </button>
      ) : null}
      {isAdmin && user?.email ? (
        <>
          <button
            type="button"
            onClick={handleInvite}
            disabled={inviteState === 'sending' || inviteState === 'sent'}
            className="mt-2 w-full rounded border border-slate-300 px-2 py-1 text-xs font-medium text-slate-700 hover:border-brand-blue hover:text-brand-blue disabled:cursor-not-allowed disabled:opacity-60"
          >
            {inviteState === 'sending' ? 'Envoi…'
              : inviteState === 'sent' ? '✓ Invitation envoyée'
              : inviteState === 'error' ? '⚠ Échec — réessayer'
              : 'Envoyer l\'invitation'}
          </button>
          {inviteError ? (
            <p className="mt-1 text-[11px] text-red-600">{inviteError}</p>
          ) : null}
        </>
      ) : null}
    </div>
  )
}

function EmptyState() {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-6 text-sm text-slate-600 shadow-sm">
      <p className="font-medium text-slate-900">Aucun membre dans ce projet.</p>
      <p className="mt-1">Les membres apparaîtront ici une fois ajoutés.</p>
    </div>
  )
}

function ErrorState({ error }) {
  return (
    <div className="rounded-lg border border-red-200 bg-red-50 p-5 text-sm text-red-700">
      <p className="font-medium">Impossible de charger l'équipe.</p>
      <p className="mt-1 text-red-600">{error.message}</p>
    </div>
  )
}
