import { useEffect, useRef, useState } from 'react'
import { supabase } from './supabase'
import type { Run } from './analytics'

export const MAX_SAMPLES = 100
const RUNS_WINDOW_MS = 24 * 60 * 60_000
const RUNS_REFRESH_MS = 10_000

export type Sample = { id: number; time: number; value: number }
type Row = { id: number; value: number; created_at: string }
type RunRow = { started_at: string; ended_at: string }

const toSample = (r: Row): Sample => ({ id: r.id, time: new Date(r.created_at).getTime(), value: r.value })

// readings 테이블의 최근 100개를 불러오고, Realtime으로 새 행을 구독해 바로 갱신한다.
// 감지 구간(최근 24시간)은 DB 함수 detection_runs로 가져와 주기적으로 새로 고친다.
export function useReadings() {
  const [samples, setSamples] = useState<Sample[]>([])
  const [runs, setRuns] = useState<Run[]>([])
  const [live, setLive] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [runsError, setRunsError] = useState<string | null>(null)
  const [now, setNow] = useState(() => Date.now())
  const lastValue = useRef<number | null>(null)

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [])

  useEffect(() => {
    if (!supabase) return
    const client = supabase
    let cancelled = false

    const loadRuns = async () => {
      const { data, error } = await client.rpc('detection_runs', {
        since: new Date(Date.now() - RUNS_WINDOW_MS).toISOString(),
      })
      if (cancelled) return
      if (error) return setRunsError(error.message)
      setRunsError(null)
      setRuns((data as RunRow[]).map(r => ({ start: Date.parse(r.started_at), end: Date.parse(r.ended_at) })).reverse())
    }

    const loadSamples = () =>
      client
        .from('readings')
        .select('id, value, created_at')
        .order('created_at', { ascending: false })
        .limit(MAX_SAMPLES)
        .then(({ data, error }) => {
          if (cancelled) return
          if (error) return setError(error.message)
          setError(null)
          const rows = (data as Row[]).reverse().map(toSample)
          lastValue.current = rows.length ? rows[rows.length - 1].value : null
          setSamples(rows)
        })

    const channel = client
      .channel('readings-inserts')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'readings' }, payload => {
        const next = toSample(payload.new as Row)
        setSamples(prev => (prev.some(s => s.id === next.id) ? prev : [...prev, next].slice(-MAX_SAMPLES)))
        // 감지 상태가 바뀌면 구간 목록도 바로 새로 가져온다
        if (lastValue.current !== null && (lastValue.current > 0) !== (next.value > 0)) void loadRuns()
        lastValue.current = next.value
      })
      .subscribe(status => {
        if (cancelled) return
        setLive(status === 'SUBSCRIBED')
        // 구독이 (재)연결되면 그 사이 놓친 행을 다시 불러온다
        if (status === 'SUBSCRIBED') void loadSamples()
        if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') setError('Realtime 구독에 실패했습니다.')
      })

    void loadRuns()
    const timer = setInterval(loadRuns, RUNS_REFRESH_MS)

    return () => {
      cancelled = true
      clearInterval(timer)
      void client.removeChannel(channel)
    }
  }, [])

  return { samples, runs, live, error, runsError, now, enabled: !!supabase }
}
