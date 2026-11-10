import { useEffect, useRef, useState } from 'react'
import type { Reading } from '../lib/device'
import { SENSOR_MAX, SENSOR_MIN } from '../product'

export function SensorChart({ readings }: { readings: Reading[] }) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [width, setWidth] = useState(320)
  const height = 200
  const pad = { left: 40, right: 8, top: 8, bottom: 20 }

  useEffect(() => {
    const node = containerRef.current
    if (!node) return
    const resize = () => setWidth(node.clientWidth)
    resize()
    const observer = new ResizeObserver(resize)
    observer.observe(node)
    return () => observer.disconnect()
  }, [])

  const plotWidth = Math.max(1, width - pad.left - pad.right)
  const plotHeight = height - pad.top - pad.bottom
  const x = (index: number) =>
    pad.left + (index / Math.max(1, readings.length - 1)) * plotWidth
  const y = (value: number) =>
    pad.top + (1 - (value - SENSOR_MIN) / (SENSOR_MAX - SENSOR_MIN)) * plotHeight
  const points = readings.map((reading, index) => `${x(index)},${y(reading.value)}`).join(' ')
  const current = readings.at(-1)?.value
  const ticks = [SENSOR_MAX, (SENSOR_MAX + SENSOR_MIN) / 2, SENSOR_MIN]

  return (
    <section aria-label="실시간 센서값">
      <div className="sensor-chart" ref={containerRef}>
        {readings.length === 0 ? (
          <p className="t-body chart-empty">센서를 연결하면 값이 여기에 그려집니다.</p>
        ) : (
          <svg
            aria-label={`센서값 추이, 현재 ${current?.toLocaleString('ko-KR', { maximumFractionDigits: 2 })}`}
            height={height}
            role="img"
            width={width}
          >
            {ticks.map(tick => (
              <g key={tick}>
                <line className="chart-grid" x1={pad.left} x2={width - pad.right} y1={y(tick)} y2={y(tick)} />
                <text className="chart-label" textAnchor="end" x={pad.left - 8} y={y(tick) + 4}>
                  {tick}
                </text>
              </g>
            ))}
            <text className="chart-label" x={pad.left} y={height - 2}>−60s</text>
            <text className="chart-label" textAnchor="end" x={width - pad.right} y={height - 2}>지금</text>
            <polyline className="chart-line" points={points} />
          </svg>
        )}
      </div>
    </section>
  )
}
