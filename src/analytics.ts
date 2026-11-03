export type Range = '1H' | '6H' | '24H'
export type Run = { start: number; end: number }
export type MotionReading = { time: string; t: number; value: 0 | 1 }
export type RangeData = { duration: number; readings: MotionReading[]; ticks: { time: string; t: number }[] }

export const RANGE_MINUTES: Record<Range, number> = { '1H': 60, '6H': 360, '24H': 1440 }
const TICK_MINUTES: Record<Range, number> = { '1H': 10, '6H': 60, '24H': 240 }

const pad = (n: number) => String(n).padStart(2, '0')
export const clock = (ms: number) => {
  const d = new Date(ms)
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`
}
export const clockSec = (ms: number) => `${clock(ms)}:${pad(new Date(ms).getSeconds())}`

export function formatDuration(ms: number): string {
  const s = Math.round(ms / 1000)
  if (s < 60) return `${s}초`
  const m = Math.floor(s / 60)
  if (m < 60) return s % 60 ? `${m}분 ${s % 60}초` : `${m}분`
  const h = Math.floor(m / 60)
  return m % 60 ? `${h}시간 ${m % 60}분` : `${h}시간`
}

export function ago(ms: number, now: number): string {
  const s = Math.max(0, Math.round((now - ms) / 1000))
  if (s < 60) return `${s}초 전`
  if (s < 3600) return `${Math.floor(s / 60)}분 전`
  return `${Math.floor(s / 3600)}시간 전`
}

// 조회 구간 [now - 기간, now]로 잘라낸 감지 구간
function clip(runs: Run[], from: number, to: number): Run[] {
  return runs
    .filter(r => r.end > from && r.start < to)
    .map(r => ({ start: Math.max(r.start, from), end: Math.min(r.end, to) }))
}

export function buildRangeData(range: Range, runs: Run[], now: number): RangeData {
  const duration = RANGE_MINUTES[range]
  const from = now - duration * 60_000
  const min = (ms: number) => (ms - from) / 60_000
  const readings: MotionReading[] = [{ time: clock(from), t: 0, value: 0 }]
  for (const r of clip(runs, from, now)) {
    readings.push({ time: clock(r.start), t: min(r.start), value: 1 })
    readings.push({ time: clock(r.end), t: min(r.end), value: 0 })
  }
  readings.push({ time: '현재', t: duration, value: 0 })
  // 감지 시작 시각이 구간 시작과 같으면 첫 점이 1이어야 하므로 겹치는 t=0 점을 정리
  const first = readings[1]
  if (first && first.t === 0 && first.value === 1) readings.shift()

  const ticks: RangeData['ticks'] = []
  for (let t = 0; t <= duration; t += TICK_MINUTES[range]) ticks.push({ time: clock(from + t * 60_000), t })
  if (ticks[ticks.length - 1].t !== duration) ticks.push({ time: '현재', t: duration })
  return { duration, readings, ticks }
}

export function summarize(range: Range, runs: Run[], now: number): [string, string][] {
  const total = RANGE_MINUTES[range] * 60_000
  const inRange = clip(runs, now - total, now)
  const detectedMs = inRange.reduce((sum, r) => sum + (r.end - r.start), 0)
  const last = inRange[inRange.length - 1]
  return [
    ['구간 내 감지 횟수', `${inRange.length}회`],
    ['총 감지 시간', formatDuration(detectedMs)],
    ['감지 비율', `${((detectedMs / total) * 100).toFixed(1)}%`],
    ['마지막 감지', last ? clockSec(last.start) : '없음'],
  ]
}

export function recentEvents(runs: Run[], detected: boolean, limit = 6) {
  const events: { time: number; title: string; detail: string; status: '감지' | '정상' }[] = []
  runs.forEach((r, i) => {
    events.push({ time: r.start, title: '움직임 감지', detail: '감지 범위 내 움직임 발생', status: '감지' })
    const ongoing = detected && i === runs.length - 1
    if (!ongoing) {
      events.push({ time: r.end, title: '감지 종료', detail: `지속 시간 ${formatDuration(r.end - r.start)}`, status: '정상' })
    }
  })
  return events.sort((a, b) => b.time - a.time).slice(0, limit).map(e => ({ ...e, label: clockSec(e.time) }))
}

export function startOfToday(now: number): number {
  const d = new Date(now)
  d.setHours(0, 0, 0, 0)
  return d.getTime()
}

// 현재 감지가 이어진 시간(ms). 감지 중이 아니면 0.
// 최근 감지 구간이 지금까지 이어지고 있으면 그 시작 시각을, 아니면 최근 값의 연속 구간 시작을 쓴다.
export function detectionStreak(samples: { time: number; value: number }[], runs: Run[], now: number): number {
  const last = samples[samples.length - 1]
  if (!last || last.value <= 0) return 0
  const lastRun = runs[runs.length - 1]
  let start = last.time
  if (lastRun && lastRun.end >= last.time - 6000) {
    start = lastRun.start
  } else {
    for (let i = samples.length - 1; i >= 0 && samples[i].value > 0; i--) start = samples[i].time
  }
  return Math.max(0, now - start)
}
