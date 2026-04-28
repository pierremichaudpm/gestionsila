import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { accessLevelLabel, relativeTime, toneClass } from '../../lib/format'

export default function ProducerAccessSection({ projectId, currentUserId }) {
  const [members, setMembers] = useState([])
  const [logEntries, setLogEntries] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [busyUserId, setBusyUserId] = useState(null)
  const [actionError, setActionError] = useState(null)

  useEffect(() => {
    if (!projectId) return
    let alive = true
    load(alive)
    return () => { alive = false }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId])

  async function load(alive = true) {
    setLoading(true)
    setError(null)

    const [membersRes, logRes] = await Promise.all([
      supabase
        .from('project_members')
        .select('id, user_id, access_level, has_producer_access, organization:organizations(name), user:users(id, full_name, email, country)')
        .eq('project_id', projectId)
        .order('access_level', { ascending: true }),
      supabase
        .from('producer_access_log')
        .select('id, action, created_at, target_user_id, granted_by_user_id, target:users!producer_access_log_target_user_id_fkey(full_name), grantor:users!producer_access_log_granted_by_user_id_fkey(full_name)')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false })
        .limit(20),
    ])

    if (!alive) return

    if (membersRes.error || logRes.error) {
      setError(membersRes.error ?? logRes.error)
      setLoading(false)
      return
    }
    setMembers(membersRes.data ?? [])
    setLogEntries(logRes.data ?? [])
    setLoading(false)
  }

  async function toggleAccess(member) {
    if (!currentUserId) return
    const next = !member.has_producer_access
    setBusyUserId(member.user_id)
    setActionError(null)

    // 1. UPDATE project_members
    const { error: updateError } = await supabase
      .from('project_members')
      .update({ has_producer_access: next })
      .eq('id', member.id)

    if (updateError) {
      setActionError(updateError.message)
      setBusyUserId(null)
      return
    }

    // 2. INSERT log entry (audit trail)
    const { error: logError } = await supabase
      .from('producer_access_log')
      .insert({
        project_id: projectId,
        target_user_id: member.user_id,
        granted_by_user_id: currentUserId,
        action: next ? 'granted' : 'revoked',
      })

    if (logError) {
      // L'UPDATE a réussi mais le log a échoué — on remonte l'erreur sans
      // rollback (le journal manque, mais l'accès est déjà appliqué). Le
      // recharge le révèle s'il y a divergence.
      setActionError(`Accès modifié mais journal non écrit : ${logError.message}`)
    }

    setBusyUserId(null)
    await load()
  }

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
      <header className="mb-4 flex items-center gap-2">
        <h2 className="text-lg font-semibold text-brand-navy">Accès Espace Producteurs</h2>
        <span className="text-xs text-slate-500">Gestion confidentielle — Budget, Assurances, Légal</span>
      </header>

      {actionError ? (
        <div className="mb-3 rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {actionError}
        </div>
      ) : null}

      {loading ? (
        <div className="space-y-2">
          <div className="h-12 animate-pulse rounded bg-slate-100" />
          <div className="h-12 animate-pulse rounded bg-slate-100" />
        </div>
      ) : error ? (
        <p className="rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error.message}
        </p>
      ) : (
        <>
          <div className="overflow-x-auto rounded border border-slate-200">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-3 py-2">Personne</th>
                  <th className="px-3 py-2">Organisation</th>
                  <th className="px-3 py-2">Rôle</th>
                  <th className="px-3 py-2 text-center">Accès</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {members.map(m => {
                  const role = accessLevelLabel(m.access_level)
                  const busy = busyUserId === m.user_id
                  return (
                    <tr key={m.id} className="hover:bg-slate-50">
                      <td className="px-3 py-2">
                        <div className="font-medium text-slate-900">{m.user?.full_name ?? '—'}</div>
                        <div className="text-xs text-slate-500">{m.user?.email}</div>
                      </td>
                      <td className="px-3 py-2 text-slate-600">{m.organization?.name ?? '—'}</td>
                      <td className="px-3 py-2">
                        <span className={`inline-flex rounded px-2 py-0.5 text-[11px] font-medium ${toneClass(role.tone)}`}>
                          {role.label}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-center">
                        <label className="inline-flex cursor-pointer items-center gap-2">
                          <input
                            type="checkbox"
                            checked={!!m.has_producer_access}
                            disabled={busy}
                            onChange={() => toggleAccess(m)}
                            className="h-4 w-4 rounded border-slate-300 text-brand-blue focus:ring-brand-blue"
                          />
                          <span className="text-xs text-slate-500">
                            {m.has_producer_access ? 'Activé' : 'Désactivé'}
                          </span>
                        </label>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          <div className="mt-6">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
              Journal des modifications
            </h3>
            {logEntries.length === 0 ? (
              <p className="mt-2 text-sm italic text-slate-400">Aucune modification enregistrée.</p>
            ) : (
              <ul className="mt-2 divide-y divide-slate-100 rounded border border-slate-200 bg-slate-50">
                {logEntries.map(entry => (
                  <li key={entry.id} className="flex items-baseline gap-2 px-3 py-2 text-sm">
                    <span
                      className={`inline-flex rounded px-2 py-0.5 text-[11px] font-medium ${
                        entry.action === 'granted'
                          ? 'bg-emerald-50 text-emerald-700'
                          : 'bg-red-50 text-red-700'
                      }`}
                    >
                      {entry.action === 'granted' ? 'Activé' : 'Révoqué'}
                    </span>
                    <span className="font-medium text-slate-700">
                      {entry.target?.full_name ?? '—'}
                    </span>
                    <span className="text-slate-500">
                      par {entry.grantor?.full_name ?? 'utilisateur supprimé'}
                    </span>
                    <span className="ml-auto text-xs text-slate-400">{relativeTime(entry.created_at)}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </>
      )}
    </section>
  )
}
