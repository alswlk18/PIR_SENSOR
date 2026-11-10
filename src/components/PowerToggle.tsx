import { useState } from 'react'
import { setLedPower } from '../lib/device'

type Props = {
  power: boolean
  onChange: (power: boolean) => void
}

export function PowerToggle({ power, onChange }: Props) {
  const [failed, setFailed] = useState(false)

  const toggle = async () => {
    const previous = power
    const next = !power
    setFailed(false)
    onChange(next)
    if (!(await setLedPower(next))) {
      onChange(previous)
      setFailed(true)
    }
  }

  return (
    <div>
      <div className="control-row">
        <div>
          <p className="t-label">LED 전원</p>
          <p className="t-caption muted">{power ? '켜짐' : '꺼짐'}</p>
        </div>
        <button
          aria-checked={power}
          aria-label="LED 전원"
          className="power-switch"
          onClick={toggle}
          role="switch"
          type="button"
        >
          <span />
        </button>
      </div>
      {failed && <p className="t-caption power-error">전원 변경 실패, 다시 시도</p>}
    </div>
  )
}
