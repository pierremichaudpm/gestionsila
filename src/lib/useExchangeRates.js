import { useEffect, useState } from 'react'
import { supabase } from './supabase'

// Hook pour récupérer les taux de change courants d'un projet.
// Renvoie { rates, loading, error, refresh }.
//
// rates = { eurToCad, cadToEur, date }, valeurs Number ou null.
//
// L'objet rates a une identité stable tant que les valeurs ne changent pas,
// ce qui évite des re-renders inutiles dans les composants en aval.

const EMPTY_RATES = Object.freeze({ eurToCad: null, cadToEur: null, date: null })

export function useExchangeRates(projectId) {
  const [state, setState] = useState({ rates: EMPTY_RATES, loading: true, error: null })
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    if (!projectId) {
      setState({ rates: EMPTY_RATES, loading: false, error: null })
      return
    }
    let alive = true

    supabase
      .from('project_settings')
      .select('exchange_rate_eur_to_cad, exchange_rate_cad_to_eur, exchange_rate_date')
      .eq('project_id', projectId)
      .maybeSingle()
      .then(({ data, error }) => {
        if (!alive) return
        if (error) {
          setState({ rates: EMPTY_RATES, loading: false, error })
          return
        }
        setState({
          rates: {
            eurToCad: data?.exchange_rate_eur_to_cad ? Number(data.exchange_rate_eur_to_cad) : null,
            cadToEur: data?.exchange_rate_cad_to_eur ? Number(data.exchange_rate_cad_to_eur) : null,
            date:     data?.exchange_rate_date ?? null,
          },
          loading: false,
          error: null,
        })
      })

    return () => { alive = false }
  }, [projectId, reloadKey])

  return {
    ...state,
    refresh: () => setReloadKey(k => k + 1),
  }
}
