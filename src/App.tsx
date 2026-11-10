import { useEffect, useState } from 'react'
import { ConnectionControl } from './components/ConnectionControl'
import { PowerToggle } from './components/PowerToggle'
import { ProductHeader } from './components/ProductHeader'
import { SensorChart } from './components/SensorChart'
import { SensorMoon } from './components/SensorMoon'
import {
  connectSensor,
  disconnectSensor,
  loadPower,
  type Reading,
  type Status,
} from './lib/device'
import { DEMO_MODE } from './lib/supabase'
import { MAX_POINTS } from './product'

export default function App() {
  const [status, setStatus] = useState<Status>('disconnected')
  const [power, setPower] = useState(false)
  const [readings, setReadings] = useState<Reading[]>([])

  useEffect(() => {
    void loadPower().then(setPower)
    return () => {
      void disconnectSensor()
    }
  }, [])

  const handleConnect = () => {
    void connectSensor({
      onInit: setReadings,
      onReading: reading => setReadings(previous => [...previous, reading].slice(-MAX_POINTS)),
      onStatus: setStatus,
    })
  }

  const handleDisconnect = () => {
    void disconnectSensor().then(() => setStatus('disconnected'))
  }

  return (
    <main>
      <ProductHeader />
      {DEMO_MODE && <p className="t-caption demo-note">데모 데이터로 표시 중</p>}
      <SensorMoon value={readings.at(-1)?.value} power={power} />
      <div className="lower-grid">
        <section className="controls-section" aria-label="조명 제어">
          <ConnectionControl
            onConnect={handleConnect}
            onDisconnect={handleDisconnect}
            status={status}
          />
          <PowerToggle onChange={setPower} power={power} />
        </section>
        <SensorChart readings={readings} />
      </div>
    </main>
  )
}
