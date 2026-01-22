import * as signalR from '@microsoft/signalr'
import { useEffect, useMemo, useRef, useState } from 'react'

type SourcePayload = Record<string, unknown>

export type AlertPayload = {
  code: number
  message: string
  locationIdentifier: string
  url?: string | null
  tenantId?: string
  timestampUtc: string
  severity: string | number
  category?: string | null
  sourcePayload?: SourcePayload | null
  type?: string | null
}

export function useAlertsHub(opts?: {
  tenantId?: string
  locationIds?: string[]
  withCredentials?: boolean
  skipNegotiation?: boolean
}) {
  const tenantId = opts?.tenantId ?? 'default'
  const locationIds = useMemo(
    () => opts?.locationIds ?? ['blueband-1'],
    [opts?.locationIds]
  )
  const withCreds = opts?.withCredentials ?? true
  const skipNeg = opts?.skipNegotiation ?? true

  const [alerts, setAlerts] = useState<AlertPayload[]>([])
  const connRef = useRef<signalR.HubConnection | null>(null)

  const url = useMemo(() => 'http://10.20.100.71:30080/hubs/stats', [])

  useEffect(() => {
    const conn = new signalR.HubConnectionBuilder()
      .withUrl(url, {
        transport: signalR.HttpTransportType.WebSockets,
        withCredentials: withCreds,
        skipNegotiation: skipNeg,
      })
      .withAutomaticReconnect()
      .build()

    connRef.current = conn

    conn.off('alert')

    conn.on('alert', (payload) => {
      const sourcePayloadJson = safeJsonParse(payload?.sourcePayloadJson)

      const alert: AlertPayload = {
        code: payload?.code,
        message: payload?.message,
        locationIdentifier: payload?.locationIdentifier,
        url: payload?.url,
        tenantId: payload?.tenantId,
        timestampUtc: payload?.timestampUtc,
        severity: payload?.severity,
        category: payload?.category,
        sourcePayload: sourcePayloadJson,
        type: sourcePayloadJson?.type,
      }

      setAlerts((prev) => [...prev, alert])
    })

    const rejoin = async () => {
      if (tenantId) await conn.invoke('JoinTenant', tenantId)
      for (const loc of locationIds) await conn.invoke('JoinLocation', loc)
    }

    conn.onreconnected(() => rejoin())
    ;(async () => {
      try {
        await conn.start()
        await rejoin()
      } catch (e) {
        console.error('[signalr] start failed', e)
      }
    })()

    return () => {
      conn.stop()
    }
  }, [url, tenantId, withCreds, skipNeg, locationIds])

  return {
    state: connRef.current?.state ?? 'Disconnected',
    alerts,
  }
}

function safeJsonParse(input: unknown) {
  if (typeof input !== 'string') return null
  try {
    const parsed = JSON.parse(input)
    return parsed && typeof parsed === 'object'
      ? (parsed as SourcePayload)
      : null
  } catch {
    return null
  }
}
