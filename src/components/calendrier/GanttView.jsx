import { useMemo, useState } from 'react'
import { countryFlag, milestoneType } from '../../lib/format'
import { getFunderColor, getInternalColor, getLotColor, internalLabel } from './ganttColors'
import ArchiveCheckbox from './ArchiveCheckbox.jsx'

// Vue Gantt — deux modes de regroupement (prop groupBy) :
//   'funder' (défaut) — Calendrier global : jalons + livrables, swimlanes par
//                       bailleur + « Production interne » par pays. Comportement
//                       d'origine, inchangé.
//   'lot'    — Planning : tâches groupées par tableau (lot), une swimlane par
//                       lot. Les tâches portent plusieurs périodes (item.periods),
//                       rendues comme N barres sur une même ligne. Périodes
//                       « à confirmer » (isTentative) en hachuré.
//
// Lecture seule : clic sur un item → callback selon sa source
// (milestone → onMilestoneClick · deliverable → onDeliverableClick ·
//  task → onTaskClick).

const DAY_W = 18              // px par jour (zoom standard, fixe pour MVP)
const LABEL_W = 240           // px de la colonne fixe à gauche
const ROW_H = 40              // px par ligne d'item
const LANE_HEADER_H = 44      // px du header de swimlane

// Préfixe des swimlanes "Production interne" (mode funder). Une lane par pays.
const INTERNAL_PREFIX = '__internal__'
const internalKey = (country) => `${INTERNAL_PREFIX}:${country ?? 'null'}`
const NO_LOT_KEY = '__no_lot__'

// Ordre déterministe des pays internes : CA → FR → LU → autres.
const INTERNAL_COUNTRY_ORDER = ['CA', 'FR', 'LU']
function internalCountryRank(country) {
  const i = INTERNAL_COUNTRY_ORDER.indexOf(country)
  return i === -1 ? 99 : i
}

// Segments d'un item : ses périodes si présentes (tâches), sinon une période
// unique reconstruite depuis startDate/endDate (jalons, livrables).
function itemSegments(item) {
  if (item.periods && item.periods.length) return item.periods
  return [{ startDate: item.startDate, endDate: item.endDate, isTentative: false, note: item.notes }]
}

export default function GanttView({
  items,
  funders = [],
  lots = [],
  groupBy = 'funder',
  laneHeaderLabel,
  onMilestoneClick,
  onDeliverableClick,
  onTaskClick,
  onToggleArchive,
}) {
  const [laneFilter, setLaneFilter] = useState('all')

  // ─── Plage temporelle (tient compte des périodes) ─────────────────
  const range = useMemo(() => computeRange(items), [items])

  // ─── Regroupement par swimlane ────────────────────────────────────
  const lanes = useMemo(
    () => (groupBy === 'lot'
      ? buildLotLanes(items, lots)
      : buildFunderLanes(items, funders)),
    [items, funders, lots, groupBy]
  )

  const visibleLanes = laneFilter === 'all'
    ? lanes
    : lanes.filter(l => l.key === laneFilter)

  if (lanes.length === 0) {
    return (
      <div className="rounded-lg border border-slate-200 bg-white px-5 py-8 text-center text-sm text-slate-500">
        Aucune entrée à afficher dans le Gantt.
      </div>
    )
  }

  const totalDays = daysBetween(range.start, range.end) + 1
  const scaleWidth = totalDays * DAY_W
  const months = monthSegments(range.start, range.end)
  const today = startOfDay(new Date())
  const todayX =
    today >= range.start && today <= range.end
      ? daysBetween(range.start, today) * DAY_W
      : null

  const headerLabel = laneHeaderLabel ?? (groupBy === 'lot' ? 'Tableaux / Tâches' : 'Bailleurs / Livrables')

  return (
    <section className="space-y-3">
      {/* Légende cliquable filtrante */}
      <div className="flex flex-wrap items-center gap-2">
        <FilterChip
          active={laneFilter === 'all'}
          onClick={() => setLaneFilter('all')}
          color="#5a5248"
          label="Tout"
          count={items.length}
        />
        {lanes.map(lane => (
          <FilterChip
            key={lane.key}
            active={laneFilter === lane.key}
            onClick={() => setLaneFilter(laneFilter === lane.key ? 'all' : lane.key)}
            color={lane.color}
            label={lane.name}
            country={lane.isInternal ? null : lane.country}
            count={lane.items.length}
          />
        ))}
        {laneFilter !== 'all' ? (
          <button
            type="button"
            onClick={() => setLaneFilter('all')}
            className="ml-auto text-xs font-medium text-slate-500 underline-offset-2 hover:text-slate-800 hover:underline"
          >
            Réinitialiser
          </button>
        ) : null}
      </div>

      {/* Cadre Gantt */}
      <div className="overflow-x-auto rounded-lg border border-slate-200 bg-[color:var(--gantt-bg)] shadow-sm">
        <div style={{ minWidth: LABEL_W + scaleWidth }}>
          {/* Header timeline */}
          <div className="flex border-b border-slate-200 bg-[color:var(--gantt-bg)]">
            <div
              className="flex shrink-0 items-center bg-[color:var(--gantt-header)] px-4 text-[10.5px] font-medium uppercase tracking-[0.14em] text-slate-500"
              style={{ width: LABEL_W }}
            >
              {headerLabel}
            </div>
            <div className="relative" style={{ width: scaleWidth, height: 52 }}>
              {/* Bandeau mois */}
              <div className="absolute left-0 right-0 top-0 flex h-[26px] border-b border-slate-200">
                {months.map((m, i) => (
                  <div
                    key={i}
                    className="overflow-hidden whitespace-nowrap border-r border-slate-200 px-2 py-1 text-[13px] font-medium text-slate-800"
                    style={{ width: m.days * DAY_W, fontFamily: 'serif' }}
                  >
                    {m.label}
                  </div>
                ))}
              </div>
              {/* Bandeau jours */}
              <div className="absolute left-0 right-0 top-[26px] flex h-[26px]">
                {Array.from({ length: totalDays }).map((_, i) => {
                  const d = addDays(range.start, i)
                  const dow = d.getDay()
                  const isWeekend = dow === 0 || dow === 6
                  const isToday = sameDay(d, today)
                  return (
                    <div
                      key={i}
                      className="shrink-0 border-r border-slate-100 text-center text-[9.5px] leading-[26px]"
                      style={{
                        width: DAY_W,
                        background: isToday
                          ? 'rgba(168, 36, 58, 0.06)'
                          : isWeekend
                            ? 'rgba(0,0,0,0.02)'
                            : 'transparent',
                        color: isToday ? '#a8243a' : '#8c8478',
                        fontWeight: isToday ? 600 : 400,
                      }}
                    >
                      {d.getDate()}
                    </div>
                  )
                })}
              </div>
            </div>
          </div>

          {/* Lanes */}
          <div className="relative">
            {visibleLanes.map(lane => (
              <Swimlane
                key={lane.key}
                lane={lane}
                rangeStart={range.start}
                scaleWidth={scaleWidth}
                emptyLabel={groupBy === 'lot' ? 'Aucune entrée' : 'Aucun jalon'}
                onMilestoneClick={onMilestoneClick}
                onDeliverableClick={onDeliverableClick}
                onTaskClick={onTaskClick}
                onToggleArchive={onToggleArchive}
              />
            ))}
            {todayX !== null ? (
              <div
                className="pointer-events-none absolute top-0 z-10"
                style={{ left: LABEL_W + todayX, bottom: 0, width: 1, background: '#a8243a' }}
              >
                <div
                  className="absolute"
                  style={{ top: -3, left: -3, width: 7, height: 7, borderRadius: '50%', background: '#a8243a' }}
                />
              </div>
            ) : null}
          </div>
        </div>
      </div>

      <p className="text-[11px] text-slate-500">
        <span className="inline-block h-2 w-4 rounded-sm" style={{ background: '#5a5248' }} />{' '}
        {groupBy === 'lot' ? 'Barre = période avec début et fin' : 'Barre = jalon avec date de début et de fin'}
        {'   ·   '}
        <span className="inline-block h-2 w-2 rotate-45 align-middle" style={{ background: '#5a5248' }} />{' '}
        {groupBy === 'lot' ? 'Losange = date ponctuelle' : 'Losange = date ponctuelle (jalon ou livrable)'}
        {'   ·   '}
        Trait rouge = aujourd'hui · Hachures = {groupBy === 'lot' ? 'période à confirmer' : 'livrable soumis ou validé'}
      </p>
    </section>
  )
}

// ─── Construction des swimlanes — mode bailleur (inchangé) ──────────
function buildFunderLanes(items, funders) {
  const map = new Map()
  // Pré-amorçage des 3 lanes internes (toujours présentes même vides).
  for (const country of INTERNAL_COUNTRY_ORDER) {
    const key = internalKey(country)
    map.set(key, {
      key, funder: null, items: [],
      color: getInternalColor(country), name: internalLabel(country),
      country, isInternal: true,
    })
  }
  for (const item of items) {
    const isInternal = !item.funderId
    const key = isInternal ? internalKey(item.country) : item.funderId
    if (!map.has(key)) {
      const funder = !isInternal ? funders.find(f => f.id === item.funderId) ?? null : null
      map.set(key, {
        key, funder, items: [],
        color: isInternal ? getInternalColor(item.country) : getFunderColor(item.funderId),
        name: isInternal ? internalLabel(item.country) : (funder?.name ?? internalLabel(null)),
        country: isInternal ? item.country : (funder?.country ?? null),
        isInternal,
      })
    }
    map.get(key).items.push(item)
  }
  for (const lane of map.values()) sortLaneItems(lane)
  return Array.from(map.values()).sort((a, b) => {
    if (a.isInternal && !b.isInternal) return -1
    if (!a.isInternal && b.isInternal) return 1
    if (a.isInternal && b.isInternal) {
      const rA = internalCountryRank(a.country)
      const rB = internalCountryRank(b.country)
      if (rA !== rB) return rA - rB
      return (a.country ?? '').localeCompare(b.country ?? '')
    }
    return a.name.localeCompare(b.name)
  })
}

// ─── Construction des swimlanes — mode lot (planning) ───────────────
// Une lane par lot, dans l'ordre fourni (sort_order). Toutes les sections
// présentes même vides (structure permanente du planning). Les tâches sans
// lot tombent dans une lane « Sans tableau » en fin de liste.
function buildLotLanes(items, lots) {
  const map = new Map()
  for (const lot of lots) {
    map.set(lot.id, {
      key: lot.id, items: [],
      color: getLotColor(lot.id), name: lot.name,
      country: lot.country ?? null, isInternal: false,
    })
  }
  for (const item of items) {
    const key = item.lotId ?? NO_LOT_KEY
    if (!map.has(key)) {
      map.set(key, {
        key, items: [],
        color: key === NO_LOT_KEY ? getInternalColor(null) : getLotColor(item.lotId),
        name: key === NO_LOT_KEY ? 'Sans tableau' : (item.context ?? 'Tableau'),
        country: item.country ?? null, isInternal: false,
      })
    }
    map.get(key).items.push(item)
  }
  for (const lane of map.values()) sortLaneItems(lane)
  // Ordre : on respecte l'ordre des lots fournis, puis « Sans tableau » à la fin.
  const order = new Map(lots.map((l, i) => [l.id, i]))
  return Array.from(map.values()).sort((a, b) => {
    const rA = a.key === NO_LOT_KEY ? 9999 : (order.get(a.key) ?? 9998)
    const rB = b.key === NO_LOT_KEY ? 9999 : (order.get(b.key) ?? 9998)
    return rA - rB
  })
}

function sortLaneItems(lane) {
  lane.items.sort((a, b) => (a.startDate < b.startDate ? -1 : a.startDate > b.startDate ? 1 : 0))
}

// ─── Swimlane ───────────────────────────────────────────────────────
function Swimlane({ lane, rangeStart, scaleWidth, emptyLabel = 'Aucune entrée', onMilestoneClick, onDeliverableClick, onTaskClick, onToggleArchive }) {
  return (
    <div className="border-b border-slate-200 last:border-b-0">
      <div className="flex" style={{ height: LANE_HEADER_H, background: 'var(--gantt-header)' }}>
        <div className="flex shrink-0 items-center gap-2 border-r border-slate-200 px-4" style={{ width: LABEL_W }}>
          <span className="inline-block h-[10px] w-[10px] shrink-0 rounded-sm" style={{ background: lane.color }} />
          <div className="min-w-0 flex-1">
            <div className="truncate text-[14px] font-semibold leading-tight text-slate-900">
              {lane.name}
            </div>
            <div className="truncate text-[10.5px] uppercase tracking-wide text-slate-500">
              {lane.country && !lane.isInternal ? `${countryFlag(lane.country)} · ` : ''}
              {lane.items.length} {lane.items.length === 1 ? 'entrée' : 'entrées'}
            </div>
          </div>
        </div>
        <div style={{ width: scaleWidth }} />
      </div>

      {lane.items.length === 0 ? (
        <div className="flex items-stretch border-b border-slate-100 last:border-b-0" style={{ height: ROW_H }}>
          <div
            className="flex shrink-0 items-center border-r border-slate-200 pl-9 pr-4 text-[12px] italic text-slate-400"
            style={{ width: LABEL_W }}
          >
            {emptyLabel}
          </div>
          <div style={{ width: scaleWidth }} />
        </div>
      ) : (
        lane.items.map(item => (
          <ItemRow
            key={item.id}
            item={item}
            color={lane.color}
            rangeStart={rangeStart}
            scaleWidth={scaleWidth}
            onMilestoneClick={onMilestoneClick}
            onDeliverableClick={onDeliverableClick}
            onTaskClick={onTaskClick}
            onToggleArchive={onToggleArchive}
          />
        ))
      )}
    </div>
  )
}

// ─── Ligne d'item (1..N barres / losanges selon les périodes) ───────
function ItemRow({ item, color, rangeStart, scaleWidth, onMilestoneClick, onDeliverableClick, onTaskClick, onToggleArchive }) {
  const isMilestone = item.source === 'milestone'
  const milestoneId = isMilestone ? item.id.replace(/^milestone-/, '') : null

  // Dimming au niveau item (livrable soumis/validé) — mode funder.
  const itemDimmed = item.source === 'deliverable' && (item.status === 'submitted' || item.status === 'validated')

  function handleClick() {
    if (item.source === 'milestone') onMilestoneClick?.(item.id.replace(/^milestone-/, ''))
    else if (item.source === 'deliverable') onDeliverableClick?.(item.id.replace(/^deliverable-/, ''))
    else if (item.source === 'task') onTaskClick?.(item.taskId ?? item.id.replace(/^task-/, ''))
  }

  const segments = itemSegments(item)

  return (
    <div className="flex items-stretch border-b border-slate-100 last:border-b-0" style={{ height: ROW_H }}>
      <div
        className="flex shrink-0 items-center gap-2 border-r border-slate-200 pl-9 pr-3 text-[13px] text-slate-800"
        style={{ width: LABEL_W }}
      >
        <span className="flex-1 truncate">{item.title}</span>
        {isMilestone && onToggleArchive ? (
          <ArchiveCheckbox checked={item.archived} onChange={(next) => onToggleArchive(milestoneId, next)} />
        ) : null}
      </div>
      <div className="relative" style={{ width: scaleWidth }}>
        {segments.map((seg, idx) => (
          <Segment
            key={idx}
            seg={seg}
            color={color}
            rangeStart={rangeStart}
            itemDimmed={itemDimmed}
            label={item.title}
            tooltip={buildTooltip(item, seg)}
            onClick={handleClick}
          />
        ))}
      </div>
    </div>
  )
}

// ─── Une barre (ou losange) pour une période ────────────────────────
function Segment({ seg, color, rangeStart, itemDimmed, label, tooltip, onClick }) {
  if (!seg.startDate) return null
  const isPunctual = !seg.endDate || seg.startDate === seg.endDate
  const start = parseDate(seg.startDate)
  const end = seg.endDate ? parseDate(seg.endDate) : start
  const offsetDays = daysBetween(rangeStart, start)
  const durationDays = daysBetween(start, end) + 1

  const dimmed = itemDimmed || seg.isTentative
  const hatched = dimmed

  if (isPunctual) {
    return (
      <button
        type="button"
        title={tooltip}
        onClick={onClick}
        className="absolute z-[1] cursor-pointer transition-transform hover:scale-110"
        style={{
          left: offsetDays * DAY_W + DAY_W / 2 - 7,
          top: ROW_H / 2 - 7,
          width: 14, height: 14,
          background: color,
          opacity: dimmed ? 0.55 : 1,
          transform: 'rotate(45deg)',
          border: '1px solid rgba(255,255,255,0.4)',
          boxShadow: '0 1px 2px rgba(0,0,0,0.15)',
          padding: 0,
        }}
        aria-label={label}
      />
    )
  }

  return (
    <button
      type="button"
      title={tooltip}
      onClick={onClick}
      className="absolute flex cursor-pointer items-center overflow-hidden rounded-[4px] px-2 text-[12px] font-medium text-white transition-shadow hover:shadow-md"
      style={{
        left: offsetDays * DAY_W,
        top: 6,
        height: ROW_H - 12,
        width: Math.max(DAY_W, durationDays * DAY_W),
        background: color,
        opacity: dimmed ? 0.55 : 1,
        backgroundImage: hatched
          ? 'linear-gradient(135deg, rgba(255,255,255,0.18) 25%, transparent 25%, transparent 50%, rgba(255,255,255,0.18) 50%, rgba(255,255,255,0.18) 75%, transparent 75%)'
          : undefined,
        backgroundSize: hatched ? '8px 8px' : undefined,
        boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.08), 0 1px 2px rgba(0,0,0,0.06)',
        border: 'none',
        textAlign: 'left',
      }}
    >
      <span className="truncate">{label}</span>
    </button>
  )
}

// ─── Filter chip (légende cliquable) ────────────────────────────────
function FilterChip({ active, onClick, color, label, country, count }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        'inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium transition-colors',
        active
          ? 'border-slate-800 bg-slate-800 text-white'
          : 'border-slate-300 bg-white text-slate-700 hover:border-slate-500',
      ].join(' ')}
    >
      <span className="inline-block h-2 w-2 rounded-full" style={{ background: color }} />
      <span>{country ? `${countryFlag(country)} ` : ''}{label}</span>
      <span className={active ? 'text-white/70' : 'text-slate-400'}>· {count}</span>
    </button>
  )
}

// ─── Helpers dates ──────────────────────────────────────────────────
function parseDate(s) {
  const [y, m, d] = s.split('-').map(Number)
  return new Date(y, m - 1, d)
}
function addDays(d, n) {
  const x = new Date(d)
  x.setDate(x.getDate() + n)
  return x
}
function daysBetween(a, b) {
  return Math.round((b - a) / (1000 * 60 * 60 * 24))
}
function startOfDay(d) {
  const x = new Date(d)
  x.setHours(0, 0, 0, 0)
  return x
}
function sameDay(a, b) {
  return a.getFullYear() === b.getFullYear()
    && a.getMonth() === b.getMonth()
    && a.getDate() === b.getDate()
}

function computeRange(items) {
  const today = startOfDay(new Date())
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1)
  if (items.length === 0) {
    return { start: monthStart, end: addDays(monthStart, 365) }
  }
  let minStart = null
  let maxEnd = null
  for (const item of items) {
    for (const seg of itemSegments(item)) {
      if (!seg.startDate) continue
      const s = parseDate(seg.startDate)
      const e = seg.endDate ? parseDate(seg.endDate) : s
      if (!minStart || s < minStart) minStart = s
      if (!maxEnd || e > maxEnd) maxEnd = e
    }
  }
  if (!minStart) return { start: monthStart, end: addDays(monthStart, 365) }
  const start = minStart < monthStart
    ? new Date(minStart.getFullYear(), minStart.getMonth(), 1)
    : monthStart
  const endTarget = new Date(maxEnd.getFullYear(), maxEnd.getMonth() + 7, 0)
  return { start, end: endTarget }
}

function monthSegments(start, end) {
  const out = []
  let cursor = new Date(start.getFullYear(), start.getMonth(), 1)
  const labels = ['Janv', 'Févr', 'Mars', 'Avril', 'Mai', 'Juin', 'Juil', 'Août', 'Sept', 'Oct', 'Nov', 'Déc']
  while (cursor <= end) {
    const next = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1)
    const segStart = cursor < start ? start : cursor
    const segEnd = next > end ? end : addDays(next, -1)
    const days = daysBetween(segStart, segEnd) + 1
    out.push({ label: `${labels[cursor.getMonth()]} ${cursor.getFullYear()}`, days })
    cursor = next
  }
  return out
}

function buildTooltip(item, seg) {
  const parts = [item.title]
  if (seg?.startDate) {
    if (seg.endDate && seg.endDate !== seg.startDate) parts.push(`${seg.startDate} → ${seg.endDate}`)
    else parts.push(seg.startDate)
  }
  if (item.source === 'milestone' && item.type) parts.push(milestoneType(item.type).label)
  if (item.source === 'deliverable' && item.status) parts.push(`Statut : ${item.status}`)
  if (item.source === 'task' && item.responsable) parts.push(`Resp. : ${item.responsable}`)
  if (seg?.isTentative) parts.push('À confirmer')
  const note = seg?.note ?? (item.periods ? null : item.notes)
  if (note) parts.push(note)
  return parts.join('\n')
}
