import { useEffect, useState } from 'react'
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
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [draft, setDraft] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [actionError, setActionError] = useState(null)

  useEffect(() => {
    if (!projectId || !entityType || !entityId) return
    let alive = true

    async function load() {
      setLoading(true)
      setError(null)
      const { data, error } = await supabase
        .from('comments')
        .select('id, content, created_at, user_id, author:users(id, full_name, organization:organizations(name))')
        .eq('project_id', projectId)
        .eq('entity_type', entityType)
        .eq('entity_id', entityId)
        .order('created_at', { ascending: true })

      if (!alive) return
      if (error) {
        setError(error)
        setLoading(false)
        return
      }
      setComments(data ?? [])
      setLoading(false)
      onCountChange?.((data ?? []).length)
    }

    load()
    return () => { alive = false }
  }, [projectId, entityType, entityId, onCountChange])

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
        content,
      })
      .select('id, content, created_at, user_id, author:users(id, full_name, organization:organizations(name))')
      .single()

    setSubmitting(false)
    if (error) {
      setActionError(error.message)
      return
    }
    const next = [...comments, data]
    setComments(next)
    setDraft('')
    onCountChange?.(next.length)
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
    onCountChange?.(next.length)
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

      <form onSubmit={handleSubmit} className="flex gap-2">
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
      </form>
    </div>
  )
}

function CommentItem({ comment, isAuthor, onDelete }) {
  const author = comment.author
  const orgName = author?.organization?.name
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
