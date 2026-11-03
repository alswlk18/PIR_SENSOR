import { useState } from 'react'
import { MAX_SAMPLES, useReadings, type Sample } from './useReadings'

const ACCENT = '#FF8A3D'
const IS_MOTION_DETECTED = false

type Range = '1H' | '6H' | '24H'
type MotionReading = { time: string; t: number; value: 0 | 1 }
type RangeData = { duration: number; readings: MotionReading[]; ticks: { time: string; t: number }[] }

const rangeData: Record<Range, RangeData> = {
  '1H': {
    duration: 55,
    readings: [
      { time: '14:00', t: 0, value: 0 },
      { time: '14:05', t: 5, value: 1 },
      { time: '14:08', t: 8, value: 0 },
      { time: '14:31', t: 31, value: 1 },
      { time: '14:33', t: 33, value: 0 },
      { time: '14:48', t: 48, value: 1 },
      { time: '14:50', t: 50, value: 0 },
      { time: '14:55', t: 55, value: 0 },
    ],
    ticks: [
      { time: '14:00', t: 0 }, { time: '14:10', t: 10 }, { time: '14:20', t: 20 },
      { time: '14:30', t: 30 }, { time: '14:40', t: 40 }, { time: '14:50', t: 50 },
      { time: '14:55', t: 55 },
    ],
  },
  '6H': {
    duration: 360,
    readings: [
      { time: '09:00', t: 0, value: 0 }, { time: '09:42', t: 42, value: 1 },
      { time: '09:49', t: 49, value: 0 }, { time: '11:16', t: 136, value: 1 },
      { time: '11:22', t: 142, value: 0 }, { time: '12:38', t: 218, value: 1 },
      { time: '12:43', t: 223, value: 0 }, { time: '14:48', t: 348, value: 1 },
      { time: '14:50', t: 350, value: 0 }, { time: '15:00', t: 360, value: 0 },
    ],
    ticks: [
      { time: '09:00', t: 0 }, { time: '10:00', t: 60 }, { time: '11:00', t: 120 },
      { time: '12:00', t: 180 }, { time: '13:00', t: 240 }, { time: '14:00', t: 300 },
      { time: '15:00', t: 360 },
    ],
  },
  '24H': {
    duration: 1440,
    readings: [
      { time: '어제 15시', t: 0, value: 0 }, { time: '어제 18시', t: 180, value: 1 },
      { time: '18:12', t: 192, value: 0 }, { time: '22:05', t: 425, value: 1 },
      { time: '22:11', t: 431, value: 0 }, { time: '오늘 07:32', t: 992, value: 1 },
      { time: '07:40', t: 1000, value: 0 }, { time: '14:48', t: 1428, value: 1 },
      { time: '14:50', t: 1430, value: 0 }, { time: '현재', t: 1440, value: 0 },
    ],
    ticks: [
      { time: '어제 15시', t: 0 }, { time: '19시', t: 240 }, { time: '23시', t: 480 },
      { time: '03시', t: 720 }, { time: '07시', t: 960 }, { time: '11시', t: 1200 },
      { time: '현재', t: 1440 },
    ],
  },
}

const summaries: Record<Range, [string, string][]> = {
  '1H': [['구간 내 감지 횟수', '3회'], ['총 감지 시간', '7분'], ['감지 비율', '12.7%'], ['마지막 감지', '14:48']],
  '6H': [['구간 내 감지 횟수', '4회'], ['총 감지 시간', '20분'], ['감지 비율', '5.6%'], ['마지막 감지', '14:48']],
  '24H': [['구간 내 감지 횟수', '4회'], ['총 감지 시간', '28분'], ['감지 비율', '1.9%'], ['마지막 감지', '14:48']],
}

const events = [
  { time: '14:55:18', title: '상태 갱신', detail: '비감지 상태 유지 중', status: '정상' },
  { time: '14:50:21', title: '감지 종료', detail: '지속 시간 2분 19초', status: '정상' },
  { time: '14:48:02', title: '움직임 감지', detail: '감지 범위 내 움직임 발생', status: '감지' },
  { time: '14:33:10', title: '감지 종료', detail: '지속 시간 2분 26초', status: '정상' },
]

function MotionChart({ data }: { data: RangeData }) {
  const [hovered, setHovered] = useState<number | null>(null)
  const width = 980
  const height = 340
  const pad = { left: 92, right: 28, top: 48, bottom: 46 }
  const chartHeight = height - pad.top - pad.bottom
  const x = (t: number) => pad.left + (t / data.duration) * (width - pad.left - pad.right)
  const y = (value: 0 | 1) => value ? pad.top + 20 : pad.top + chartHeight - 20

  return (
    <div className="chart-wrap">
      <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label="시간대별 PIR 움직임 감지 기록">
        {([1, 0] as const).map(value => (
          <g key={value}>
            <line className="grid" x1={pad.left} x2={width - pad.right} y1={y(value)} y2={y(value)} />
            <text className="motion-axis" x={pad.left - 16} y={y(value) + 4} textAnchor="end">
              {value ? '감지(1)' : '비감지(0)'}
            </text>
          </g>
        ))}

        {data.readings.slice(0, -1).map((item, i) => {
          const next = data.readings[i + 1]
          const x1 = x(item.t)
          const x2 = x(next.t)
          return (
            <g key={`${item.time}-${next.time}`}>
              {item.value === 1 && <rect className="detected-area" x={x1} y={y(1)} width={x2 - x1} height={y(0) - y(1)} />}
              <line className={item.value ? 'detected-segment' : 'idle-segment'} x1={x1} x2={x2} y1={y(item.value)} y2={y(item.value)} />
              {item.value !== next.value && (
                <line className={next.value ? 'detected-segment' : 'transition-segment'} x1={x2} x2={x2} y1={y(item.value)} y2={y(next.value)} />
              )}
              <rect
                className="hit-area"
                x={x1}
                y={pad.top}
                width={Math.max(8, x2 - x1)}
                height={chartHeight}
                onMouseEnter={() => setHovered(i)}
                onMouseLeave={() => setHovered(null)}
              />
            </g>
          )
        })}

        {data.ticks.map(tick => (
          <text className="axis" x={x(tick.t)} y={height - 13} textAnchor="middle" key={tick.time}>{tick.time}</text>
        ))}

        <circle
          className="last-point idle-point"
          cx={x(data.duration)}
          cy={y(data.readings[data.readings.length - 1].value)}
          r="6"
        />
        {hovered !== null && (
          <line className="hover-line" x1={x(data.readings[hovered].t)} x2={x(data.readings[hovered].t)} y1={pad.top} y2={y(0)} />
        )}
      </svg>
      {hovered !== null && (
        <div
          className="tooltip"
          style={{
            left: `${(x(data.readings[hovered].t) / width) * 100}%`,
            top: `${(y(data.readings[hovered].value) / height) * 100}%`,
          }}
        >
          <strong>{data.readings[hovered].time}</strong>
          <span>{data.readings[hovered].value ? '움직임 감지됨 · HIGH(1)' : '움직임 비감지 · LOW(0)'}</span>
        </div>
      )}
    </div>
  )
}

function LiveChart({ samples }: { samples: Sample[] }) {
  const [hovered, setHovered] = useState<number | null>(null)
  const width = 980
  const height = 300
  const pad = { left: 56, right: 28, top: 24, bottom: 32 }
  const values = samples.map(s => s.value)
  const min = Math.min(0, ...values)
  const max = Math.max(1, ...values)
  const x = (i: number) => pad.left + (i / (MAX_SAMPLES - 1)) * (width - pad.left - pad.right)
  const y = (v: number) => pad.top + (1 - (v - min) / (max - min)) * (height - pad.top - pad.bottom)
  const points = samples.map((s, i) => `${x(i)},${y(s.value)}`).join(' ')
  const fmt = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(1))

  return (
    <div className="chart-wrap">
      <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label="최근 100개 센서 값 선 그래프">
        {[max, (max + min) / 2, min].map(v => (
          <g key={v}>
            <line className="grid" x1={pad.left} x2={width - pad.right} y1={y(v)} y2={y(v)} />
            <text className="motion-axis" x={pad.left - 12} y={y(v) + 4} textAnchor="end">{fmt(v)}</text>
          </g>
        ))}
        {samples.length === 0 && (
          <text className="axis" x={width / 2} y={height / 2} textAnchor="middle">
            센서 값이 들어오면 여기에 표시됩니다.
          </text>
        )}
        {samples.length > 1 && <polyline className="live-line" points={points} />}
        {samples.length > 0 && (
          <circle className="last-point" cx={x(samples.length - 1)} cy={y(samples[samples.length - 1].value)} r="5" />
        )}
        {samples.map((s, i) => (
          <rect
            key={s.id}
            className="hit-area"
            x={x(i) - 4}
            y={pad.top}
            width={8}
            height={height - pad.top - pad.bottom}
            onMouseEnter={() => setHovered(i)}
            onMouseLeave={() => setHovered(null)}
          />
        ))}
        {hovered !== null && samples[hovered] && (
          <line className="hover-line" x1={x(hovered)} x2={x(hovered)} y1={pad.top} y2={height - pad.bottom} />
        )}
      </svg>
      {hovered !== null && samples[hovered] && (
        <div
          className="tooltip"
          style={{ left: `${(x(hovered) / width) * 100}%`, top: `${(y(samples[hovered].value) / height) * 100}%` }}
        >
          <strong>{new Date(samples[hovered].time).toLocaleTimeString('ko-KR', { hour12: false })}</strong>
          <span>값 {fmt(samples[hovered].value)}</span>
        </div>
      )}
    </div>
  )
}

function SectionHead({ index, title, note, right }: { index: string; title: string; note: string; right?: React.ReactNode }) {
  return (
    <div className="section-head">
      <div><span className="eyebrow">{index}</span><h2>{title}</h2><p>{note}</p></div>
      {right && <div className="controls">{right}</div>}
    </div>
  )
}

export default function App() {
  const [range, setRange] = useState<Range>('1H')
  const readings = useReadings()
  const last = readings.samples[readings.samples.length - 1]
  const detected = last ? last.value > 0 : IS_MOTION_DETECTED

  return (
    <main>
      <header className="hero">
        <div className="topline">
          <p className="kicker">PIR 모션 센서 · 실시간 모니터링</p>
          <span className="online">
            <i className={readings.live ? '' : 'off'} /> {readings.live ? '실시간 구독 중' : '연결 안 됨'}
          </span>
        </div>
        <h1>공간의 움직임을<br /><span>실시간으로 감지하다</span></h1>
        <p>PIR-01 센서의 움직임 감지 여부와 발생 기록을 한눈에 확인합니다. 현재 화면은 디지털 HIGH·LOW 예시 데이터로 구성되어 있습니다.</p>
      </header>

      <section className="current-grid" aria-label="현재 PIR 센서 상태">
        <article className={`primary-reading ${detected ? 'detected' : 'idle'}`}>
          <div className="reading-head">
            <p>현재 감지 상태</p>
            <span>LIVE</span>
          </div>
          <div className={`motion-state ${detected ? 'detected' : 'idle'}`}>
            {detected ? '감지됨' : '비감지'}
          </div>
          <div className="reading-foot">
            <span><i className={`pulse ${detected ? 'detected' : ''}`} /> {detected ? '움직임 감지 중' : '대기 중'}</span>
            <span>
              {last
                ? `수신값 ${last.value} · ${new Date(last.time).toLocaleTimeString('ko-KR', { hour12: false })}`
                : '데이터 없음'}
            </span>
          </div>
        </article>
        <div className="kpis">
          {[
            ['마지막 감지 시각', '14:48:02', '2분 전'],
            ['오늘 감지 횟수', '18회', '오전 0시 기준'],
            ['연속 비감지 시간', '07분', '현재 대기 중'],
            ['감지 유지 시간', '5초', '센서 설정값'],
          ].map(([label, value, note]) => (
            <article className="kpi" key={label}>
              <p>{label}</p><strong>{value}</strong><span>{note}</span>
            </article>
          ))}
        </div>
      </section>

      {readings.error && <p className="serial-error-box">DB 오류: {readings.error}</p>}
      {!readings.enabled && <p className="serial-error-box">.env의 Supabase 설정을 찾지 못했습니다.</p>}

      <section className="card">
        <SectionHead
          index="LIVE · 센서 값"
          title="실시간 센서 값"
          note={`Supabase readings 테이블의 최근 ${MAX_SAMPLES}개 값입니다. 새 행이 들어오면 Realtime으로 바로 갱신됩니다.`}
        />
        <LiveChart samples={readings.samples} />
      </section>

      <section className="card">
        <SectionHead
          index="01 · 감지 기록"
          title="시간에 따른 감지 기록"
          note="디지털 출력값 1은 움직임 감지, 0은 비감지 상태를 의미합니다."
          right={
            <div className="range-toggle" aria-label="조회 기간">
              {(['1H', '6H', '24H'] as Range[]).map(item => (
                <button key={item} className={range === item ? 'active' : ''} onClick={() => setRange(item)}>{item}</button>
              ))}
            </div>
          }
        />
        <div className="chart-legend">
          <span><i className="legend-object" /> 감지 구간</span>
        </div>
        <MotionChart data={rangeData[range]} />
        <div className="chart-summary">
          {summaries[range].map(([label, value]) => (
            <div key={label}><span>{label}</span><strong>{value}</strong></div>
          ))}
        </div>
      </section>

      <section className="detail-grid">
        <article className="card status-card">
          <SectionHead index="02 · 센서 상태" title="센서 상태" note="PIR 모션 센서의 현재 동작 정보입니다." />
          <div className={`sensor-visual ${detected ? 'detecting' : 'dormant'}`} aria-hidden="true">
            <div className="beam beam-one" /><div className="beam beam-two" /><div className="beam beam-three" />
            <div className="sensor-core"><i /></div>
          </div>
          <dl className="status-list">
            <div><dt>장치 ID</dt><dd>PIR-01-A204</dd></div>
            <div><dt>센서 모델</dt><dd>HC-SR501</dd></div>
            <div><dt>출력 방식</dt><dd>디지털 HIGH·LOW</dd></div>
            <div><dt>마지막 동기화</dt><dd>14:55:18</dd></div>
            <div><dt>동작 상태</dt><dd className="accent-text">정상</dd></div>
          </dl>
        </article>

        <article className="card event-card">
          <SectionHead index="03 · 최근 활동" title="최근 감지 기록" note="최근 발생한 감지 및 상태 변경 이벤트입니다." />
          <div className="event-list">
            {events.map(event => (
              <div className="event-row" key={event.time}>
                <time>{event.time}</time>
                <div><strong>{event.title}</strong><span>{event.detail}</span></div>
                <em className={event.status === '감지' ? 'detected-badge' : ''}>{event.status}</em>
              </div>
            ))}
          </div>
        </article>
      </section>

      <footer>
        <p>PIR-01 모션 센서 모니터링 대시보드 · 예시 데이터</p>
        <span>실제 센서 연결 시 감지 상태와 기록이 자동으로 갱신됩니다.</span>
      </footer>
    </main>
  )
}
