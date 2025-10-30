// hooks/useStatsHub.ts
import * as signalR from '@microsoft/signalr'
import { useEffect, useMemo, useRef, useState } from 'react'

type Dir = 'Northbound' | 'Southbound' | 'Eastbound' | 'Westbound'

// ADD: deterministic remap of any real id to one of the three fake ids
const FAKE_IDS = ['4028', '7115', '5001'] as const
const pickFakeId = (realId: string) => {
  let h = 0
  for (let i = 0; i < realId.length; i++)
    h = (h * 31 + realId.charCodeAt(i)) | 0
  return FAKE_IDS[Math.abs(h) % FAKE_IDS.length]
}

export function useStatsHub(opts?: {
  tenantId?: string
  locationIds?: string[]
  withCredentials?: boolean
  skipNegotiation?: boolean
  flushMs?: number
}) {
  const tenantId = opts?.tenantId ?? 'default'
  const locationIds = opts?.locationIds ?? []
  const withCreds = opts?.withCredentials ?? false
  const skipNeg = opts?.skipNegotiation ?? false
  const flushMs = opts?.flushMs ?? 100

  const [batch, setBatch] = useState<Record<string, number>>({})
  const [dirBatch, setDirBatch] = useState<
    Record<string, Partial<Record<Dir, number>>>
  >({})
  const connRef = useRef<signalR.HubConnection | null>(null)
  const totalBufRef = useRef<Record<string, number>>({})
  const dirBufRef = useRef<Record<string, Partial<Record<Dir, number>>>>({})
  const dirtyRef = useRef(false)
  const timerRef = useRef<number | null>(null)
  const url = useMemo(() => 'https://localhost:44322/hubs/stats', [])
  const locKey = useMemo(() => locationIds.join('|'), [locationIds])

  useEffect(() => {
    const conn = new signalR.HubConnectionBuilder()
      .withUrl(url, {
        transport: signalR.HttpTransportType.WebSockets,
        withCredentials: withCreds,
        skipNegotiation: skipNeg,
      })
      .withAutomaticReconnect()
      .build()

    conn.on('statsUpdate', (payload: any) => {
      const realId = String(payload?.locationIdentifier ?? '')
      if (!realId) return

      // REMAP: pretend it came from one of 4028/7115/5001
      const id = pickFakeId(realId)

      const tot =
        Number(payload?.volume?.acTotalVolume) ||
        Number(payload?.volume?.llcTotalVolume) ||
        Number(payload?.volume) ||
        0
      if (!Number.isNaN(tot)) totalBufRef.current[id] = tot

      const arr: Array<{ direction?: string; volume?: number }> =
        payload?.volume?.acApproachVolumes ??
        payload?.volume?.llcApproachVolumes ??
        []
      if (Array.isArray(arr) && arr.length) {
        const prev = dirBufRef.current[id] ?? {}
        const next: Partial<Record<Dir, number>> = { ...prev }
        for (const p of arr) {
          const d = String(p?.direction ?? '') as Dir
          const v = Number(p?.volume)
          if (!d || Number.isNaN(v)) continue
          next[d] = v
        }
        dirBufRef.current[id] = next
      }
      dirtyRef.current = true
    })

    const rejoin = async () => {
      if (tenantId) await conn.invoke('JoinTenant', tenantId)
      for (const loc of locationIds) await conn.invoke('JoinLocation', loc)
    }

    conn.onreconnected(rejoin)
    ;(async () => {
      await conn.start()
      await rejoin()
      if (!timerRef.current) {
        timerRef.current = window.setInterval(() => {
          if (!dirtyRef.current) return
          dirtyRef.current = false
          const tot = totalBufRef.current
          totalBufRef.current = {}
          const dirs = dirBufRef.current
          dirBufRef.current = {}
          if (Object.keys(tot).length) setBatch((prev) => ({ ...prev, ...tot }))
          if (Object.keys(dirs).length) {
            setDirBatch((prev) => {
              const next = { ...prev }
              for (const [k, v] of Object.entries(dirs))
                next[k] = { ...(prev[k] ?? {}), ...v }
              return next
            })
          }
        }, flushMs) as unknown as number
      }
    })()

    connRef.current = conn
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current)
        timerRef.current = null
      }
      conn.stop()
    }
  }, [url, tenantId, locKey, withCreds, skipNeg, flushMs])

  return {
    state: connRef.current?.state ?? ('Disconnected' as const),
    batch,
    dirBatch,
  }
}
