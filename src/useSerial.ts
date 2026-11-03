import { useCallback, useEffect, useRef, useState } from 'react'
import { supabase } from './supabase'

const BAUD_RATE = 9600
// 값이 바뀌지 않아도 이 간격(ms)마다 한 번은 DB에 저장
const SAVE_INTERVAL_MS = 1000
export const MAX_SAMPLES = 100

export type Sample = { id: number; time: number; value: number }

type SerialPortLike = {
  open(options: { baudRate: number }): Promise<void>
  close(): Promise<void>
  readable: ReadableStream<Uint8Array> | null
}
type SerialLike = EventTarget & { requestPort(): Promise<SerialPortLike> }

const getSerial = () => (navigator as unknown as { serial?: SerialLike }).serial

// "1" / "0" / "HIGH" / "LOW" / 숫자 문자열을 숫자로 변환. 해석 불가능하면 null.
function parseLine(line: string): number | null {
  const text = line.trim()
  if (!text) return null
  if (/^(high|true|on)$/i.test(text)) return 1
  if (/^(low|false|off)$/i.test(text)) return 0
  const n = Number(text)
  return Number.isFinite(n) ? n : null
}

export function useSerial() {
  const [connected, setConnected] = useState(false)
  const [samples, setSamples] = useState<Sample[]>([])
  const [error, setError] = useState<string | null>(null)
  const readerRef = useRef<ReadableStreamDefaultReader<string> | null>(null)
  const [dbError, setDbError] = useState<string | null>(null)
  const nextId = useRef(1_000_000_000)
  const lastSaved = useRef<{ value: number; time: number } | null>(null)
  const supported = typeof navigator !== 'undefined' && !!getSerial()

  const save = useCallback(async (rows: Sample[]) => {
    if (!supabase || !rows.length) return
    const { error } = await supabase
      .from('readings')
      .insert(rows.map(r => ({ value: r.value, created_at: new Date(r.time).toISOString() })))
    setDbError(error ? error.message : null)
  }, [])

  // 처음 열 때 DB에 저장된 최근 100개를 불러와 그래프에 표시
  useEffect(() => {
    if (!supabase) return
    let cancelled = false
    supabase
      .from('readings')
      .select('id, value, created_at')
      .order('created_at', { ascending: false })
      .limit(MAX_SAMPLES)
      .then(({ data, error }) => {
        if (cancelled) return
        if (error) return setDbError(error.message)
        const rows = (data ?? []).reverse().map(r => ({
          id: r.id as number,
          time: new Date(r.created_at as string).getTime(),
          value: r.value as number,
        }))
        setSamples(prev => [...rows, ...prev].slice(-MAX_SAMPLES))
      })
    return () => { cancelled = true }
  }, [])

  const readLoop = useCallback(async (port: SerialPortLike) => {
    if (!port.readable) return
    const decoder = new TextDecoderStream()
    const closed = port.readable.pipeTo(decoder.writable as WritableStream<Uint8Array>)
    const reader = decoder.readable.getReader()
    readerRef.current = reader
    let buffer = ''
    try {
      while (true) {
        const { value, done } = await reader.read()
        if (done) break
        buffer += value
        const lines = buffer.split(/\r?\n/)
        buffer = lines.pop() ?? ''
        const now = Date.now()
        const parsed: Sample[] = []
        for (const line of lines) {
          const v = parseLine(line)
          if (v !== null) parsed.push({ id: nextId.current++, time: now, value: v })
        }
        if (parsed.length) {
          setSamples(prev => [...prev, ...parsed].slice(-MAX_SAMPLES))
          // 값이 바뀌었거나 마지막 저장 후 SAVE_INTERVAL_MS가 지났을 때만 저장
          const toSave = parsed.filter(p => {
            const prev = lastSaved.current
            if (prev && prev.value === p.value && p.time - prev.time < SAVE_INTERVAL_MS) return false
            lastSaved.current = { value: p.value, time: p.time }
            return true
          })
          void save(toSave)
        }
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : '시리얼 읽기 중 오류가 발생했습니다.')
    } finally {
      readerRef.current = null
      reader.cancel().catch(() => {})
      await closed.catch(() => {})
      await port.close().catch(() => {})
      setConnected(false)
    }
  }, [save])

  const connect = useCallback(async () => {
    const serial = getSerial()
    if (!serial) return
    setError(null)
    try {
      const port = await serial.requestPort()
      await port.open({ baudRate: BAUD_RATE })
      setConnected(true)
      void readLoop(port)
    } catch (e) {
      // 포트 선택 창을 닫은 경우(NotFoundError)는 오류로 취급하지 않음
      if (e instanceof DOMException && e.name === 'NotFoundError') return
      setError(e instanceof Error ? e.message : '시리얼 포트를 열 수 없습니다.')
    }
  }, [readLoop])

  const disconnect = useCallback(() => {
    readerRef.current?.cancel().catch(() => {})
  }, [])

  useEffect(() => () => { readerRef.current?.cancel().catch(() => {}) }, [])

  return { supported, connected, samples, error, dbError, dbEnabled: !!supabase, connect, disconnect }
}
