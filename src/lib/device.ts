import type { RealtimeChannel } from '@supabase/supabase-js'
import { DEVICE_ID, MAX_POINTS } from '../product'
import { db, DEMO_MODE } from './supabase'

export type Reading = { value: number; created_at: string }
export type Status = 'disconnected' | 'connecting' | 'connected' | 'error'

type ConnectOptions = {
  onInit: (rows: Reading[]) => void
  onReading: (row: Reading) => void
  onStatus: (status: Status) => void
}

let channel: RealtimeChannel | null = null
let demoTimer: ReturnType<typeof setInterval> | null = null

function demoReading(): Reading {
  const phase = Date.now() / 2400
  const value = Math.max(0, Math.min(1, (Math.sin(phase) + 1) / 2))
  return { value, created_at: new Date().toISOString() }
}

export async function connectSensor({ onInit, onReading, onStatus }: ConnectOptions) {
  await disconnectSensor()
  onStatus('connecting')

  if (DEMO_MODE || !db) {
    onInit([])
    onStatus('connected')
    onReading(demoReading())
    demoTimer = setInterval(() => onReading(demoReading()), 500)
    return
  }

  const { data, error } = await db
    .from('sensor_readings')
    .select('value, created_at')
    .eq('device_id', DEVICE_ID)
    .order('created_at', { ascending: false })
    .limit(MAX_POINTS)

  if (error) {
    onStatus('error')
    return
  }

  onInit((data as Reading[]).reverse())
  channel = db
    .channel(`sensor-readings-${DEVICE_ID}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'sensor_readings',
        filter: `device_id=eq.${DEVICE_ID}`,
      },
      payload => onReading(payload.new as Reading),
    )
    .subscribe(realtimeStatus => {
      if (realtimeStatus === 'SUBSCRIBED') onStatus('connected')
      if (realtimeStatus === 'CHANNEL_ERROR' || realtimeStatus === 'TIMED_OUT') {
        onStatus('error')
      }
    })
}

export async function disconnectSensor() {
  if (demoTimer) {
    clearInterval(demoTimer)
    demoTimer = null
  }
  if (channel && db) await db.removeChannel(channel)
  channel = null
}

export async function setLedPower(on: boolean): Promise<boolean> {
  if (DEMO_MODE || !db) return true
  const { error } = await db
    .from('device_state')
    .update({ led_on: on, updated_at: new Date().toISOString() })
    .eq('device_id', DEVICE_ID)
  return !error
}

export async function loadPower(): Promise<boolean> {
  if (DEMO_MODE || !db) return true
  const { data, error } = await db
    .from('device_state')
    .select('led_on')
    .eq('device_id', DEVICE_ID)
    .maybeSingle()
  return error ? false : Boolean(data?.led_on)
}
