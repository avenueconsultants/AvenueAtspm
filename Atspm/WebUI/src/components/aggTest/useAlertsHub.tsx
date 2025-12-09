// hooks/useAlertsHub.ts
import * as signalR from '@microsoft/signalr'
import { useEffect, useMemo, useRef, useState } from 'react'

export type AlertPayload = {
  code: number
  message: string
  locationIdentifier: string
  url?: string | null
  tenantId?: string
  timestampUtc: string
  severity: string
  category?: string | null
}

export function useAlertsHub(opts?: {
  tenantId?: string
  locationIds?: string[]
  withCredentials?: boolean
  skipNegotiation?: boolean
}) {
  const tenantId = opts?.tenantId ?? 'default'
  const locationIds = opts?.locationIds ?? []
  const withCreds = opts?.withCredentials ?? false
  const skipNeg = opts?.skipNegotiation ?? false

  const [alerts, setAlerts] = useState<AlertPayload[]>([])
  const connRef = useRef<signalR.HubConnection | null>(null)

  // IMPORTANT: matches MapHub + dev port
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

    connRef.current = conn

    conn.on('alert', (payload: any) => {
      const code = Number(payload?.code ?? payload?.Code)
      const message = String(payload?.message ?? payload?.Message ?? '')
      const locationIdentifier = String(
        payload?.locationIdentifier ?? payload?.LocationIdentifier ?? ''
      )
      const urlVal = payload?.url ?? payload?.Url ?? null
      const tenantIdVal = payload?.tenantId ?? payload?.TenantId
      const timestampUtc = String(
        payload?.timestampUtc ?? payload?.TimestampUtc ?? ''
      )
      const severity = String(payload?.severity ?? payload?.Severity ?? '')
      const category = payload?.category ?? payload?.Category ?? null

      if (
        !message ||
        !locationIdentifier ||
        !timestampUtc ||
        Number.isNaN(code)
      ) {
        return
      }

      setAlerts((prev) => [
        ...prev,
        {
          code,
          message,
          locationIdentifier,
          url: urlVal,
          tenantId: tenantIdVal,
          timestampUtc,
          severity,
          category,
        },
      ])
    })

    const rejoin = async () => {
      if (tenantId) await conn.invoke('JoinTenant', tenantId)
      for (const loc of locationIds) await conn.invoke('JoinLocation', loc)
    }

    conn.onreconnected(rejoin)
    ;(async () => {
      await conn.start()
      await rejoin()
    })()

    return () => {
      conn.stop()
    }
  }, [url, tenantId, locKey, withCreds, skipNeg])

  return {
    state: connRef.current?.state ?? ('Disconnected' as const),
    alerts,
  }
}
