import type { CSSProperties } from 'react'
import { SENSOR_MAX, SENSOR_MIN } from '../product'

type Props = {
  value?: number
  power: boolean
}

export function SensorMoon({ value, power }: Props) {
  const level =
    value === undefined
      ? 0
      : Math.max(0, Math.min(1, (value - SENSOR_MIN) / (SENSOR_MAX - SENSOR_MIN)))
  const brightness = Math.round(level * 100)
  const moonStyle = { '--level': level } as CSSProperties

  return (
    <section className="moon-section" aria-label="달 상태">
      <div
        aria-label={power ? `달 밝기 ${brightness}%` : '달 꺼짐'}
        className="moon"
        data-power={power ? 'on' : 'off'}
        role="img"
        style={moonStyle}
      >
        <img src="/images/moon.webp" alt="" />
      </div>
      <p className="t-value">{value === undefined ? '—' : value.toLocaleString('ko-KR', { maximumFractionDigits: 2 })}</p>
    </section>
  )
}
