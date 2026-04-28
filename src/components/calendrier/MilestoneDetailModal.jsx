import Modal from '../ui/Modal.jsx'
import CommentThread from '../comments/CommentThread.jsx'
import {
  countryFlag,
  countryName,
  formatDateRange,
  milestoneType,
} from '../../lib/format'

export default function MilestoneDetailModal({ milestone, lots, projectId, onClose, onCommentChange }) {
  const open = !!milestone
  if (!open) return <Modal open={false} onClose={onClose} title="" />
  const type = milestoneType(milestone.type)
  const lot = milestone.lot_id ? (lots ?? []).find(l => l.id === milestone.lot_id) : null

  return (
    <Modal open={open} onClose={onClose} title="Jalon" size="lg">
      <div className="space-y-4">
        <div>
          <div className="flex flex-wrap items-baseline gap-2">
            <span className={`inline-flex shrink-0 rounded px-2 py-0.5 text-[11px] font-medium ${type.badge}`}>
              {type.label}
            </span>
            <span className="text-xs text-slate-500 tabular-nums">{formatDateRange(milestone.start_date, milestone.end_date)}</span>
            {milestone.country ? (
              <span className="text-xs text-slate-500" title={countryName(milestone.country)}>
                {countryFlag(milestone.country)} {countryName(milestone.country)}
              </span>
            ) : null}
          </div>
          <h3 className="mt-2 text-base font-semibold text-slate-900">{milestone.title}</h3>
          {lot ? (
            <p className="mt-1 text-xs text-slate-500">Tableau : {lot.name}</p>
          ) : null}
          {milestone.notes ? (
            <p className="mt-2 whitespace-pre-wrap text-sm text-slate-700">{milestone.notes}</p>
          ) : null}
        </div>

        <div className="border-t border-slate-200 pt-4">
          <CommentThread
            projectId={projectId}
            entityType="milestone"
            entityId={milestone.id}
            onCountChange={onCommentChange}
          />
        </div>
      </div>
    </Modal>
  )
}
