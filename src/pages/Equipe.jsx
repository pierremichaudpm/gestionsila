import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useCurrentProject } from '../lib/useCurrentProject'
import {
  accessLevelLabel,
  countryFlag,
  countryName,
  toneClass,
} from '../lib/format'

export default function Equipe() {
  const { projectId, loading: projectLoading } = useCurrentProject()
  const [members, setMembers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!projectId) return
    let alive = true

    async function load() {
      setLoading(true)
      setError(null)
      const { data, error } = await supabase
        .from('project_members')
        .select(`
          id,
          access_level,
          user:users(id, full_name, email, country, role),
          org:organizations(id, name, country, role)
        `)
        .eq('project_id', projectId)

      if (!alive) return
      if (error) {
        setError(error)
        setLoading(false)
        return
      }
      setMembers(data ?? [])
      setLoading(false)
    }

    load()
    return () => { alive = false }
  }, [projectId])

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
            <OrgSection key={group.org?.id ?? 'unknown'} org={group.org} members={group.members} />
          ))}
        </div>
      )}
    </div>
  )
}

function OrgSection({ org, members }) {
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
        {members.map(m => <MemberCard key={m.id} member={m} />)}
      </div>
    </section>
  )
}

function MemberCard({ member }) {
  const access = accessLevelLabel(member.access_level)
  const user = member.user
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <div>
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
