import { useEffect, useState } from 'react'
import { supabase } from './supabase'

export function useCurrentProject() {
  const [state, setState] = useState({
    projectId: null,
    project: null,
    accessLevel: null,
    orgId: null,
    loading: true,
    error: null,
  })

  useEffect(() => {
    let alive = true

    async function load() {
      const { data: userData, error: userError } = await supabase.auth.getUser()
      if (!alive) return

      if (userError || !userData?.user) {
        setState({ projectId: null, project: null, accessLevel: null, orgId: null, loading: false, error: userError ?? null })
        return
      }

      const { data, error } = await supabase
        .from('project_members')
        .select('project_id, org_id, access_level, projects(id, name, description)')
        .eq('user_id', userData.user.id)
        .limit(1)
        .maybeSingle()

      if (!alive) return

      if (error) {
        setState({ projectId: null, project: null, accessLevel: null, orgId: null, loading: false, error })
        return
      }
      if (!data) {
        setState({ projectId: null, project: null, accessLevel: null, orgId: null, loading: false, error: null })
        return
      }
      setState({
        projectId: data.project_id,
        project: data.projects,
        accessLevel: data.access_level,
        orgId: data.org_id,
        loading: false,
        error: null,
      })
    }

    load()
    return () => { alive = false }
  }, [])

  return state
}
