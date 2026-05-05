import Modal from '../ui/Modal.jsx'
import CommentThread from '../comments/CommentThread.jsx'
import {
  countryFlag,
  countryName,
  formatDateRange,
  milestoneType,
} from '../../lib/format'

export default function MilestoneDetailModal({
  milestone,
  lots,
  projectId,
  profile,
  accessLevel,
  onClose,
  onEdit,
  onCommentChange,
}) {
  const open = !!milestone
  if (!open) return <Modal open={false} onClose={onClose} title="" />
  const type = milestoneType(milestone.type)
  const lot = milestone.lot_id ? (lots ?? []).find(l => l.id === milestone.lot_id) : null

  // Permission édition : admin partout, coproducer / production_manager /
  // partner pour leur pays uniquement (alignée sur is_project_writer côté
  // RLS depuis 027).
  const canEdit = accessLevel === 'admin'
    || (['coproducer', 'production_manager', 'partner'].includes(accessLevel)
        && profile?.country === milestone.country)

  return (
    <Modal open={open} onClose={onClose} title="Jalon" size="lg">
      <div className="space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1">
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
          {canEdit && onEdit ? (
            <button
              type="button"
              onClick={onEdit}
              className="shrink-0 rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:border-brand-blue hover:text-brand-blue"
            >
              Modifier
            </button>
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
