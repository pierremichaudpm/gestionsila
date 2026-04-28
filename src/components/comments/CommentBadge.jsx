export default function CommentBadge({ count = 0, className = '' }) {
  if (!count) {
    return (
      <span className={`inline-flex items-center gap-1 text-xs text-slate-400 ${className}`}>
        <CommentIcon />
        <span>0</span>
      </span>
    )
  }
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-medium text-slate-600 ${className}`}>
      <CommentIcon />
      <span>{count}</span>
    </span>
  )
}

function CommentIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path
        d="M2 4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2H7l-3 3v-3H4a2 2 0 0 1-2-2V4z"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
    </svg>
  )
}
