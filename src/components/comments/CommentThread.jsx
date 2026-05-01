import { useEffect, useRef, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../lib/AuthProvider.jsx'
import { relativeTime } from '../../lib/format'

function initials(name) {
  if (!name) return '?'
  const parts = name.trim().split(/\s+/)
  const first = parts[0]?.[0] ?? ''
  const last  = parts.length > 1 ? parts[parts.length - 1][0] : ''
  return (first + last).toUpperCase() || '?'
}

export default function CommentThread({ projectId, entityType, entityId, onCountChange }) {
  const { profile } = useAuth()
  const [comments, setComments] = useState([])
  const [members, setMembers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [draft, setDraft] = useState('')
  const [addressedTo, setAddressedTo] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [actionError, setActionError] = useState(null)

  // Ref pour éviter que la prop onCountChange (souvent recréée à chaque render
  // par les parents via () => setCommentBump(...)) ne fasse retourner l'effect
  // de chargement et clignoter la liste après un insert.
  const onCountChangeRef = useRef(onCountChange)
  useEffect(() => { onCountChangeRef.current = onCountChange }, [onCountChange])

  useEffect(() => {
    if (!projectId || !entityType || !entityId) return
    let alive = true

    async function load() {
      setLoading(true)
      setError(null)
      // Comments fetch — disambiguer les 2 FK vers users (auteur + adressé)
      // via les noms FK explicites.
      const [commentsRes, membersRes] = await Promise.all([
        supabase
          .from('comments')
          .select('id, content, created_at, user_id, addressed_to, author:users!comments_user_id_fkey(id, full_name, organization:organizations(name)), addressed:users!comments_addressed_to_fkey(id, full_name)')
          .eq('project_id', projectId)
          .eq('entity_type', entityType)
          .eq('entity_id', entityId)
          .order('created_at', { ascending: true }),
        supabase
          .from('project_members')
          .select('user:users(id, full_name)')
          .eq('project_id', projectId),
      ])

      if (!alive) return
      if (commentsRes.error) {
        setError(commentsRes.error)
        setLoading(false)
        return
      }
      setComments(commentsRes.data ?? [])
      // Trier les membres par prénom pour le dropdown
      const memberList = (membersRes.data ?? [])
        .map(m => m.user)
        .filter(Boolean)
        .sort((a, b) => (a.full_name ?? '').localeCompare(b.full_name ?? ''))
      setMembers(memberList)
      setLoading(false)
      onCountChangeRef.current?.((commentsRes.data ?? []).length)
    }

    load()
    return () => { alive = false }
  }, [projectId, entityType, entityId])

  async function handleSubmit(e) {
    e.preventDefault()
    const content = draft.trim()
    if (!content || !profile?.id) return
    setSubmitting(true)
    setActionError(null)
    const { data, error } = await supabase
      .from('comments')
      .insert({
        project_id: projectId,
        entity_type: entityType,
        entity_id: entityId,
        user_id: profile.id,
        addressed_to: addressedTo || null,
        content,
      })
      .select('id, content, created_at, user_id, addressed_to, author:users!comments_user_id_fkey(id, full_name, organization:organizations(name)), addressed:users!comments_addressed_to_fkey(id, full_name)')
      .single()

    setSubmitting(false)
    if (error) {
      setActionError(error.message)
      return
    }
    const next = [...comments, data]
    setComments(next)
    setDraft('')
    setAddressedTo('')
    onCountChangeRef.current?.(next.length)
  }

  async function handleDelete(id) {
    setActionError(null)
    const { error } = await supabase.from('comments').delete().eq('id', id)
    if (error) {
      setActionError(error.message)
      return
    }
    const next = comments.filter(c => c.id !== id)
    setComments(next)
    onCountChangeRef.current?.(next.length)
  }

  return (
    <div className="space-y-3">
      <div className="flex items-baseline justify-between">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          {comments.length === 0
            ? 'Commentaires'
            : `${comments.length} ${comments.length > 1 ? 'commentaires' : 'commentaire'}`}
        </h3>
      </div>

      {loading ? (
        <div className="h-10 animate-pulse rounded bg-slate-100" />
      ) : error ? (
        <p className="rounded border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
          {error.message}
        </p>
      ) : comments.length === 0 ? (
        <p className="text-xs italic text-slate-400">Aucun commentaire pour l'instant.</p>
      ) : (
        <ul className="space-y-2">
          {comments.map(c => (
            <CommentItem
              key={c.id}
              comment={c}
              isAuthor={profile?.id === c.user_id}
              onDelete={() => handleDelete(c.id)}
            />
          ))}
        </ul>
      )}

      {actionError ? (
        <p className="rounded border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
          {actionError}
        </p>
      ) : null}

      <form onSubmit={handleSubmit} className="space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <label className="flex items-center gap-1.5 text-xs text-slate-500">
            <span>Adresser à</span>
            <select
              value={addressedTo}
              onChange={(e) => setAddressedTo(e.target.value)}
              disabled={submitting || !profile}
              className="rounded border border-slate-300 bg-white px-2 py-1 text-xs focus:border-brand-blue focus:outline-none focus:ring-1 focus:ring-brand-blue disabled:opacity-60"
            >
              <option value="">— personne —</option>
              {members.map(m => (
                <option key={m.id} value={m.id}>{m.full_name}</option>
              ))}
            </select>
          </label>
        </div>
        <div className="flex gap-2">
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Écrire un commentaire…"
            rows={2}
            disabled={submitting || !profile}
            className="flex-1 resize-y rounded border border-slate-300 px-3 py-2 text-sm focus:border-brand-blue focus:outline-none focus:ring-1 focus:ring-brand-blue disabled:opacity-60"
          />
          <button
            type="submit"
            disabled={submitting || !draft.trim() || !profile}
            className="self-start rounded-lg bg-[color:var(--color-brand-navy)] px-3 py-2 text-xs font-medium text-white transition hover:bg-[color:var(--color-brand-blue)] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting ? '…' : 'Commenter'}
          </button>
        </div>
      </form>
    </div>
  )
}

function CommentItem({ comment, isAuthor, onDelete }) {
  const author = comment.author
  const orgName = author?.organization?.name
  const addressed = comment.addressed
  return (
    <li className="flex gap-3 rounded border border-slate-200 bg-white px-3 py-2 text-sm">
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[color:var(--color-brand-navy)] text-[11px] font-semibold text-white">
        {initials(author?.full_name)}
      </span>
      <div className="flex-1">
        <div className="flex flex-wrap items-baseline gap-2">
          <span className="text-sm font-medium text-slate-900">
            {author?.full_name ?? 'Utilisateur inconnu'}
          </span>
          {orgName ? (
            <span className="text-xs text-slate-500">{orgName}</span>
          ) : null}
          {addressed?.full_name ? (
            <span className="inline-flex items-center gap-1 rounded bg-brand-blue/10 px-2 py-0.5 text-[11px] font-medium text-brand-blue">
              → {addressed.full_name}
            </span>
          ) : null}
          <span className="text-xs text-slate-400">{relativeTime(comment.created_at)}</span>
          {isAuthor ? (
            <button
              type="button"
              onClick={onDelete}
              className="ml-auto text-xs text-slate-400 hover:text-red-600"
            >
              Supprimer
            </button>
          ) : null}
        </div>
        <p className="mt-1 whitespace-pre-wrap text-sm text-slate-700">{comment.content}</p>
      </div>
    </li>
  )
}
