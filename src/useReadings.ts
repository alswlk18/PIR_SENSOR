import { useEffect, useState } from 'react'
import { supabase } from './supabase'

export const MAX_SAMPLES = 100

export type Sample = { id: number; time: number; value: number }
type Row = { id: number; value: number; created_at: string }

const toSample = (r: Row): Sample => ({ id: r.id, time: new Date(r.created_at).getTime(), value: r.value })

// readings 테이블의 최근 100개를 불러오고, Realtime으로 새 행을 구독해 바로 갱신한다.
export function useReadings() {
  const [samples, setSamples] = useState<Sample[]>([])
  const [live, setLive] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!supabase) return
    const client = supabase
    let cancelled = false

    const load = () =>
      client
        .from('readings')
        .select('id, value, created_at')
        .order('created_at', { ascending: false })
        .limit(MAX_SAMPLES)
        .then(({ data, error }) => {
          if (cancelled) return
          if (error) return setError(error.message)
          setError(null)
          setSamples((data as Row[]).reverse().map(toSample))
        })

    const channel = client
      .channel('readings-inserts')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'readings' }, payload => {
        const next = toSample(payload.new as Row)
        setSamples(prev => (prev.some(s => s.id === next.id) ? prev : [...prev, next].slice(-MAX_SAMPLES)))
      })
      .subscribe(status => {
        if (cancelled) return
        setLive(status === 'SUBSCRIBED')
        // 구독이 (재)연결되면 그 사이 놓친 행을 다시 불러온다
        if (status === 'SUBSCRIBED') void load()
        if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') setError('Realtime 구독에 실패했습니다.')
      })

    return () => {
      cancelled = true
      void client.removeChannel(channel)
    }
  }, [])

  return { samples, live, error, enabled: !!supabase }
}
