import { useMemo, useState } from 'react'
import { countryFlag, milestoneType } from '../../lib/format'
import { getFunderColor, INTERNAL_LABEL } from './ganttColors'
import ArchiveCheckbox from './ArchiveCheckbox.jsx'

// Vue Gantt complémentaire de la timeline verticale du Calendrier.
// Lecture seule : pas de drag, pas d'édition. Clic sur un item ouvre la modal
// de détail correspondante (milestone → MilestoneDetailModal ;
// deliverable → EditDeliverableModal), via les callbacks passés en props.
//
// Inspiration visuelle : palette éditoriale chaude (papier/encre), proche du
// fichier de référence cibles_rouges_gantt_2.html. Pas de la palette navy
// applicative, qui est trop monotone à l'échelle du Gantt.

const DAY_W = 18              // px par jour (zoom standard, fixe pour MVP)
const LABEL_W = 240           // px de la colonne fixe à gauche
const ROW_H = 40              // px par ligne d'item
const LANE_HEADER_H = 44      // px du header de swimlane

const INTERNAL_KEY = '__internal__'

export default function GanttView({
  items,
  funders,
  onMilestoneClick,
  onDeliverableClick,
  onToggleArchive,
}) {
  const [funderFilter, setFunderFilter] = useState('all')

  // ─── Plage temporelle ─────────────────────────────────────────────
  const range = useMemo(() => computeRange(items), [items])

  // ─── Regroupement par swimlane ────────────────────────────────────
  const lanes = useMemo(() => {
    const map = new Map() // key -> { key, funder, items[], color, name }
    for (const item of items) {
      const key = item.funderId ?? INTERNAL_KEY
      if (!map.has(key)) {
        const funder = item.funderId
          ? funders.find(f => f.id === item.funderId) ?? null
          : null
        map.set(key, {
          key,
          funder,
          items: [],
          color: getFunderColor(item.funderId),
          name: funder?.name ?? INTERNAL_LABEL,
          country: funder?.country ?? null,
        })
      }
      map.get(key).items.push(item)
    }
    // Tri des items intra-lane par date de début
    for (const lane of map.values()) {
      lane.items.sort((a, b) => (a.startDate < b.startDate ? -1 : a.startDate > b.startDate ? 1 : 0))
    }
    // Ordre des lanes : bailleurs A→Z, "Production interne" en dernier
    return Array.from(map.values()).sort((a, b) => {
      if (a.key === INTERNAL_KEY) return 1
      if (b.key === INTERNAL_KEY) return -1
      return a.name.localeCompare(b.name)
    })
  }, [items, funders])

  // ─── Légende : toutes les lanes présentes ─────────────────────────
  const visibleLanes = funderFilter === 'all'
    ? lanes
    : lanes.filter(l => l.key === funderFilter)

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

  return (
    <section className="space-y-3">
      {/* Légende cliquable filtrante */}
      <div className="flex flex-wrap items-center gap-2">
        <FilterChip
          active={funderFilter === 'all'}
          onClick={() => setFunderFilter('all')}
          color="#5a5248"
          label="Tous les bailleurs"
          count={items.length}
        />
        {lanes.map(lane => (
          <FilterChip
            key={lane.key}
            active={funderFilter === lane.key}
            onClick={() => setFunderFilter(funderFilter === lane.key ? 'all' : lane.key)}
            color={lane.color}
            label={lane.name}
            country={lane.country}
            count={lane.items.length}
          />
        ))}
        {funderFilter !== 'all' ? (
          <button
            type="button"
            onClick={() => setFunderFilter('all')}
            className="ml-auto text-xs font-medium text-slate-500 underline-offset-2 hover:text-slate-800 hover:underline"
          >
            Réinitialiser
          </button>
        ) : null}
      </div>

      {/* Cadre Gantt */}
      <div className="overflow-x-auto rounded-lg border border-slate-200 bg-[#fbf7ef] shadow-sm">
        <div style={{ minWidth: LABEL_W + scaleWidth }}>
          {/* Header timeline */}
          <div className="flex border-b border-slate-200 bg-[#fbf7ef]">
            <div
              className="flex shrink-0 items-center bg-[#ebe4d2] px-4 text-[10.5px] font-medium uppercase tracking-[0.14em] text-slate-500"
              style={{ width: LABEL_W }}
            >
              Bailleurs / Livrables
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
                onMilestoneClick={onMilestoneClick}
                onDeliverableClick={onDeliverableClick}
                onToggleArchive={onToggleArchive}
              />
            ))}
            {todayX !== null ? (
              <div
                className="pointer-events-none absolute top-0 z-10"
                style={{
                  left: LABEL_W + todayX,
                  bottom: 0,
                  width: 1,
                  background: '#a8243a',
                }}
              >
                <div
                  className="absolute"
                  style={{
                    top: -3,
                    left: -3,
                    width: 7,
                    height: 7,
                    borderRadius: '50%',
                    background: '#a8243a',
                  }}
                />
              </div>
            ) : null}
          </div>
        </div>
      </div>

      <p className="text-[11px] text-slate-500">
        <span className="inline-block h-2 w-4 rounded-sm" style={{ background: '#5a5248' }} /> Barre = jalon avec date de début et de fin
        {'   ·   '}
        <span className="inline-block h-2 w-2 rotate-45 align-middle" style={{ background: '#5a5248' }} /> Losange = date ponctuelle (jalon ou livrable)
        {'   ·   '}
        Trait rouge = aujourd'hui · Hachures = livrable soumis ou validé
      </p>
    </section>
  )
}

// ─── Swimlane ───────────────────────────────────────────────────────
function Swimlane({ lane, rangeStart, scaleWidth, onMilestoneClick, onDeliverableClick, onToggleArchive }) {
  return (
    <div className="border-b border-slate-200 last:border-b-0">
      {/* Header swimlane */}
      <div className="flex" style={{ height: LANE_HEADER_H, background: '#ebe4d2' }}>
        <div
          className="flex shrink-0 items-center gap-2 border-r border-slate-200 px-4"
          style={{ width: LABEL_W }}
        >
          <span
            className="inline-block h-[10px] w-[10px] shrink-0 rounded-sm"
            style={{ background: lane.color }}
          />
          <div className="min-w-0 flex-1">
            <div className="truncate text-[14px] font-semibold leading-tight text-slate-900">
              {lane.name}
            </div>
            <div className="truncate text-[10.5px] uppercase tracking-wide text-slate-500">
              {lane.country ? `${countryFlag(lane.country)} · ` : ''}
              {lane.items.length} {lane.items.length === 1 ? 'entrée' : 'entrées'}
            </div>
          </div>
        </div>
        <div style={{ width: scaleWidth }} />
      </div>

      {/* Rangs d'items */}
      {lane.items.map(item => (
        <ItemRow
          key={item.id}
          item={item}
          color={lane.color}
          rangeStart={rangeStart}
          scaleWidth={scaleWidth}
          onMilestoneClick={onMilestoneClick}
          onDeliverableClick={onDeliverableClick}
          onToggleArchive={onToggleArchive}
        />
      ))}
    </div>
  )
}

// ─── Ligne d'item (barre ou losange) ────────────────────────────────
function ItemRow({ item, color, rangeStart, scaleWidth, onMilestoneClick, onDeliverableClick, onToggleArchive }) {
  const isMilestone = item.source === 'milestone'
  const milestoneId = isMilestone ? item.id.replace(/^milestone-/, '') : null
  const isPunctual = !item.endDate || item.startDate === item.endDate
  const start = parseDate(item.startDate)
  const end = item.endDate ? parseDate(item.endDate) : start
  const offsetDays = daysBetween(rangeStart, start)
  const durationDays = daysBetween(start, end) + 1

  // Visuels par statut deliverable
  const isDelivered = item.source === 'deliverable'
  const status = isDelivered ? item.status : null
  const dimmed = status === 'submitted' || status === 'validated'
  const hatched = dimmed

  function handleClick() {
    if (item.source === 'milestone') {
      const id = item.id.replace(/^milestone-/, '')
      onMilestoneClick?.(id)
    } else if (item.source === 'deliverable') {
      const id = item.id.replace(/^deliverable-/, '')
      onDeliverableClick?.(id)
    }
  }

  const tooltip = buildTooltip(item)

  return (
    <div className="flex items-stretch border-b border-slate-100 last:border-b-0" style={{ height: ROW_H }}>
      <div
        className="flex shrink-0 items-center gap-2 border-r border-slate-200 pl-9 pr-3 text-[13px] text-slate-800"
        style={{ width: LABEL_W }}
      >
        <span className="flex-1 truncate">{item.title}</span>
        {isMilestone && onToggleArchive ? (
          <ArchiveCheckbox
            checked={item.archived}
            onChange={(next) => onToggleArchive(milestoneId, next)}
          />
        ) : null}
      </div>
      <div className="relative" style={{ width: scaleWidth }}>
        {isPunctual ? (
          <button
            type="button"
            title={tooltip}
            onClick={handleClick}
            className="absolute z-[1] cursor-pointer transition-transform hover:scale-110"
            style={{
              left: offsetDays * DAY_W + DAY_W / 2 - 7,
              top: ROW_H / 2 - 7,
              width: 14,
              height: 14,
              background: color,
              opacity: dimmed ? 0.55 : 1,
              transform: 'rotate(45deg)',
              border: '1px solid rgba(255,255,255,0.4)',
              boxShadow: '0 1px 2px rgba(0,0,0,0.15)',
              padding: 0,
            }}
            aria-label={item.title}
          />
        ) : (
          <button
            type="button"
            title={tooltip}
            onClick={handleClick}
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
              boxShadow:
                'inset 0 0 0 1px rgba(255,255,255,0.08), 0 1px 2px rgba(0,0,0,0.06)',
              border: 'none',
              textAlign: 'left',
            }}
          >
            <span className="truncate">{item.title}</span>
          </button>
        )}
      </div>
    </div>
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
      <span
        className="inline-block h-2 w-2 rounded-full"
        style={{ background: color }}
      />
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
    const s = parseDate(item.startDate)
    const e = item.endDate ? parseDate(item.endDate) : s
    if (!minStart || s < minStart) minStart = s
    if (!maxEnd || e > maxEnd) maxEnd = e
  }
  // Borne basse : le plus proche entre 1er du mois courant et minStart
  const start = minStart < monthStart
    ? new Date(minStart.getFullYear(), minStart.getMonth(), 1)
    : monthStart
  // Borne haute : maxEnd + 6 mois (fin de mois)
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
    out.push({
      label: `${labels[cursor.getMonth()]} ${cursor.getFullYear()}`,
      days,
    })
    cursor = next
  }
  return out
}

function buildTooltip(item) {
  const parts = [item.title]
  if (item.endDate && item.endDate !== item.startDate) {
    parts.push(`${item.startDate} → ${item.endDate}`)
  } else {
    parts.push(item.startDate)
  }
  if (item.source === 'milestone' && item.type) {
    parts.push(milestoneType(item.type).label)
  }
  if (item.source === 'deliverable' && item.status) {
    parts.push(`Statut : ${item.status}`)
  }
  if (item.notes) parts.push(item.notes)
  return parts.join('\n')
}
