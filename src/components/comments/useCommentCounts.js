import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'

// Bulk-fetch comment counts for a list of entities of the same type. Returns
// a Map<entityId, number>. Re-runs when `bumpKey` changes (use it to refresh
// after a comment is added/deleted in a child thread).
export function useCommentCounts(projectId, entityType, entityIds, bumpKey = 0) {
  const [counts, setCounts] = useState(() => new Map())

  const idsKey = entityIds && entityIds.length > 0
    ? [...entityIds].sort().join(',')
    : ''

  useEffect(() => {
    if (!projectId || !entityType || !idsKey) {
      setCounts(new Map())
      return
    }
    let alive = true

    async function load() {
      const ids = idsKey.split(',')
      const { data, error } = await supabase
        .from('comments')
        .select('entity_id')
        .eq('project_id', projectId)
        .eq('entity_type', entityType)
        .in('entity_id', ids)

      if (!alive || error) return
      const map = new Map()
      for (const row of data ?? []) {
        map.set(row.entity_id, (map.get(row.entity_id) ?? 0) + 1)
      }
      setCounts(map)
    }

    load()
    return () => { alive = false }
  }, [projectId, entityType, idsKey, bumpKey])

  return counts
}
