export type TtlByTypeMs = Record<string, number>

export type AlertRetentionOpts = {
  ttlByTypeMs?: TtlByTypeMs
  defaultTtlMs?: number
  pruneEveryMs?: number
  maxAlerts?: number
}

export type AlertRetentionConfig = {
  ttlByTypeMs: TtlByTypeMs
  defaultTtlMs: number
  pruneEveryMs: number
  maxAlerts: number
  getTtlMs(type: string | null | undefined): number
}

export const DEFAULT_TTL_BY_TYPE_MS: TtlByTypeMs = {
  'object.wrong-way': 20_000,
}

export const DEFAULT_ALERT_TTL_MS = 2 * 600_000
export const DEFAULT_PRUNE_EVERY_MS = 5_000
export const DEFAULT_MAX_ALERTS = 2000

export function resolveAlertRetention(
  opts?: AlertRetentionOpts
): AlertRetentionConfig {
  const ttlByTypeMs = opts?.ttlByTypeMs ?? DEFAULT_TTL_BY_TYPE_MS
  const defaultTtlMs = opts?.defaultTtlMs ?? DEFAULT_ALERT_TTL_MS
  const pruneEveryMs = opts?.pruneEveryMs ?? DEFAULT_PRUNE_EVERY_MS
  const maxAlerts = opts?.maxAlerts ?? DEFAULT_MAX_ALERTS

  return {
    ttlByTypeMs,
    defaultTtlMs,
    pruneEveryMs,
    maxAlerts,
    getTtlMs: (type) => ttlByTypeMs[type ?? ''] ?? defaultTtlMs,
  }
}
