type SourcePayload = Record<string, unknown>

// Backend will be camelCased (lowercase first char) when serialized.
export type AlertSeverity = string | number

// Mirror Mercury.Domain.Alerts.AlertType names as serialized (string enum names).
// Add more as you model more alerts.
export type AlertType =
  | 'WrongWayVehicle'
  | 'RedLightRunning'
  | 'HighSpeed'
  | string

export type AlertBroadcastDto = {
  alertType: AlertType
  source: string
  message: string
  locationIdentifier: string
  deviceId?: number | null
  url?: string | null
  tenantId: string
  createdTimestampUtc: string // ISO
  severity: AlertSeverity
}

// Wrong-way
export type WrongWayVehicleAlertBroadcastDto = AlertBroadcastDto & {
  alertType: 'WrongWayVehicle'
  detectorId: number
  travelDirection?: string | null
  incidentId?: number | null
  trackingLogs: SourcePayload[] // tighten later (AlertTrackingLogDto)
  object: SourcePayload // tighten later (AlertObjectDto)
  eventTimestampMs: number
  eventTimeUtc: string // ISO
  recordingId?: number | null
}

// Context only (not used yet, but included so adding new types is trivial)
export type RedLightRunningAlertBroadcastDto = AlertBroadcastDto & {
  alertType: 'RedLightRunning'
  detectorId: number
  movementHeading?: string | null
  movementType?: string | null
  movementCertainty?: string | null
  movementPpt?: number | null
  indication?: string | null
  indicationDurationMs?: number | null
  classification?: string | null
  objectType?: string | null
  speedMph?: number | null
  latitude?: number | null
  longitude?: number | null
  sourceTimestampMs?: number | null
  recordingId?: number | null
}

export type HighSpeedAlertBroadcastDto = AlertBroadcastDto & {
  alertType: 'HighSpeed'
  detectorId: number
  zoneId?: number | null
  incidentId: number
  recordingId?: number | null
  speedThreshold?: number | null
  peakSpeed?: number | null
  eventTimestampMs?: number | null
  eventTimeUtc?: string | null
  object: SourcePayload
  trackingLogs: SourcePayload[]
}

export type AnyAlertBroadcast =
  | WrongWayVehicleAlertBroadcastDto
  | RedLightRunningAlertBroadcastDto
  | HighSpeedAlertBroadcastDto
  | AlertBroadcastDto

export type UiAlert = {
  id: string
  type: AlertType
  message: string
  locationIdentifier: string
  url?: string | null
  tenantId: string
  timestampUtc: string
  severity: AlertSeverity
  payload: AnyAlertBroadcast
}

export type UseAlertsHubOpts = {
  tenantId?: string
  locationIds?: string[]
  withCredentials?: boolean
  skipNegotiation?: boolean

  ttlByTypeMs?: Record<string, number>
  defaultTtlMs?: number
  pruneEveryMs?: number
  maxAlerts?: number
}
