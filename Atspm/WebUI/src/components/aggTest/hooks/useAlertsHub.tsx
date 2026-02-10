import { resolveAlertRetention } from '@/components/aggTest/hooks/retention'
import {
  AnyAlertBroadcast,
  UiAlert,
  UseAlertsHubOpts,
} from '@/components/aggTest/hooks/types'
import * as signalR from '@microsoft/signalr'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

export function useAlertsHub(opts?: UseAlertsHubOpts) {
  const tenantId = opts?.tenantId ?? 'default'
  const locationIds = useMemo(
    () => opts?.locationIds ?? ['blueband-1'],
    [opts?.locationIds]
  )
  const withCreds = opts?.withCredentials ?? true
  const skipNeg = opts?.skipNegotiation ?? true

  const retention = useMemo(
    () =>
      resolveAlertRetention({
        ttlByTypeMs: opts?.ttlByTypeMs,
        defaultTtlMs: opts?.defaultTtlMs,
        pruneEveryMs: opts?.pruneEveryMs,
        maxAlerts: opts?.maxAlerts,
      }),
    [opts?.ttlByTypeMs, opts?.defaultTtlMs, opts?.pruneEveryMs, opts?.maxAlerts]
  )

  const { pruneEveryMs, maxAlerts } = retention

  const [alerts, setAlerts] = useState<UiAlert[]>([])
  const connRef = useRef<signalR.HubConnection | null>(null)

  const url = useMemo(() => 'http://10.20.100.71:30080/hubs/stats', [])

  const prune = useCallback(
    (xs: UiAlert[], nowMs: number) => {
      const keep: UiAlert[] = []
      for (const a of xs) {
        const ts = Date.parse(a.timestampUtc)
        if (!Number.isFinite(ts)) continue
        const age = nowMs - ts
        if (age <= retention.getTtlMs(String(a.type))) keep.push(a)
      }

      keep.sort(
        (a, b) => Date.parse(b.timestampUtc) - Date.parse(a.timestampUtc)
      )
      if (keep.length > maxAlerts) keep.length = maxAlerts
      return keep
    },
    [maxAlerts, retention]
  )

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

    conn.on('alert', (payload: AnyAlertBroadcast) => {
      const alert = toUiAlert(payload)
      const now = Date.now()
      setAlerts((prev) => prune([...prev, alert], now))
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
  }, [url, tenantId, withCreds, skipNeg, locationIds, prune])

  useEffect(() => {
    const t = window.setInterval(() => {
      const now = Date.now()
      setAlerts((prev) => prune(prev, now))
    }, pruneEveryMs)

    return () => window.clearInterval(t)
  }, [pruneEveryMs, prune])

  return {
    state: connRef.current?.state ?? 'Disconnected',
    alerts,
  }
}

function toUiAlert(dto: AnyAlertBroadcast): UiAlert {
  const incidentId = (dto as any)?.incidentId ?? null

  const id = `${dto.alertType}:${incidentId}-${dto.createdTimestampUtc}`

  return {
    id,
    type: dto.alertType,
    message: dto.message,
    locationIdentifier: dto.locationIdentifier,
    url: dto.url ?? null,
    tenantId: dto.tenantId,
    timestampUtc: dto.createdTimestampUtc,
    severity: dto.severity,
    payload: dto,
  }
}
