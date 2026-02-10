import type { UiAlert } from '@/components/aggTest/hooks/types'
import CampaignOutlinedIcon from '@mui/icons-material/CampaignOutlined'
import CloseIcon from '@mui/icons-material/Close'
import ExpandLessIcon from '@mui/icons-material/ExpandLess'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import HistoryIcon from '@mui/icons-material/History'
import MyLocationIcon from '@mui/icons-material/MyLocation'
import ReplayIcon from '@mui/icons-material/Replay'
import VideocamOutlinedIcon from '@mui/icons-material/VideocamOutlined'
import {
  Badge,
  Box,
  Button,
  Checkbox,
  Chip,
  Divider,
  IconButton,
  Paper,
  Popover,
  Stack,
  Typography,
} from '@mui/material'
import { useEffect, useMemo, useState } from 'react'

type WrongWayPayload = {
  source?: string
  message?: string
  locationIdentifier?: string
  url?: string | null
  createdTimestampUtc?: string
  severity?: unknown
  detectorId?: number
  trackingLogs?: Array<{
    speedMps?: number
    bearingDeg?: number
  }>
  latitude?: number
  longitude?: number
  object?: { latitude?: number; longitude?: number }
}

type AuditEntry = { tsIso: string; text: string }

type NearbyAsset = {
  id: string
  type: 'camera' | 'sign'
  name: string
  distanceFt: number
}

type ClaimState =
  | { status: 'unclaimed' }
  | { status: 'claimed'; by: string; atIso: string }
  | {
      status: 'dismissed'
      by: string
      atIso: string
      previous?: Exclude<ClaimState, { status: 'dismissed' }>
    }

function getPayload(alert: UiAlert): WrongWayPayload {
  return (alert.payload ?? {}) as WrongWayPayload
}

function mpsToMph(mps: number) {
  return mps * 2.236936
}

function formatTimestamp(iso: string) {
  const ms = Date.parse(iso)
  if (!Number.isFinite(ms)) return iso
  return new Date(ms).toLocaleTimeString()
}

function nowIso() {
  return new Date().toISOString()
}

function pickLatLng(p: WrongWayPayload): { lat: number; lng: number } | null {
  const lat =
    typeof p.latitude === 'number'
      ? p.latitude
      : typeof p.object?.latitude === 'number'
        ? p.object.latitude
        : null
  const lng =
    typeof p.longitude === 'number'
      ? p.longitude
      : typeof p.object?.longitude === 'number'
        ? p.object.longitude
        : null
  if (lat == null || lng == null) return null
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null
  return { lat, lng }
}

function severityLabel(sev: unknown) {
  const s = String(sev ?? '').toLowerCase()
  if (s.includes('critical')) return 'CRITICAL'
  if (s.includes('warning')) return 'WARNING'
  if (s.includes('info')) return 'INFO'
  if (s.includes('error')) return 'ERROR'
  const n = Number(sev)
  if (Number.isFinite(n))
    return n >= 9 ? 'CRITICAL' : n >= 7 ? 'WARNING' : 'INFO'
  return 'CRITICAL'
}

function severityColor(
  label: string
): 'error' | 'warning' | 'info' | 'default' {
  const s = label.toLowerCase()
  if (s === 'critical' || s === 'error') return 'error'
  if (s === 'warning') return 'warning'
  if (s === 'info') return 'info'
  return 'default'
}

/* ------------------------------ Demo constants ---------------------------- */

const HARDCODED_SNAPSHOT = 'https://i.ytimg.com/vi/VtEOg3zkk6E/hqdefault.jpg'

const MOCK_NEARBY_ASSETS: NearbyAsset[] = [
  { id: 'cam-112', type: 'camera', name: 'Camera 112 · WB', distanceFt: 420 },
  { id: 'cam-208', type: 'camera', name: 'Camera 208 · EB', distanceFt: 860 },
  { id: 'sign-19', type: 'sign', name: 'DMS 19 · I-80 WB', distanceFt: 1050 },
]

/* -------------------------------- Component ------------------------------ */

export default function WrongWayIncidentDock({
  alert,
  isOpen,
  onToggleOpen,
  onClose,
  onJumpTo,
}: {
  alert: UiAlert
  isOpen: boolean
  onToggleOpen: () => void
  onClose: () => void
  onJumpTo?: (ll: { lat: number; lng: number }) => void
}) {
  const p = getPayload(alert)

  // Mocked operator identity for now
  const user = 'admin'

  const ll = useMemo(() => pickLatLng(p), [p])

  // Auto jump-to on trigger (only once per alert update)
  const jumpKey = `${alert.id}|${alert.timestampUtc}`
  const [didAutoJumpKey, setDidAutoJumpKey] = useState<string | null>(null)
  useEffect(() => {
    if (!onJumpTo || !ll) return
    if (didAutoJumpKey === jumpKey) return
    setDidAutoJumpKey(jumpKey)
    onJumpTo(ll)
  }, [onJumpTo, ll, jumpKey, didAutoJumpKey])

  const createdIso =
    (typeof p.createdTimestampUtc === 'string'
      ? p.createdTimestampUtc
      : null) ?? alert.timestampUtc

  const sevText = severityLabel(alert.severity ?? p.severity)
  const sevColor = severityColor(sevText)

  const location = alert.locationIdentifier || p.locationIdentifier || '—'
  const detectorId =
    typeof p.detectorId === 'number'
      ? String(p.detectorId)
      : typeof p.detectorId === 'string'
        ? p.detectorId
        : null

  const logs = Array.isArray(p.trackingLogs) ? p.trackingLogs : []
  const latestLog = logs[0] ?? null
  const speedMps =
    latestLog && typeof latestLog.speedMps === 'number'
      ? latestLog.speedMps
      : null
  const speedMph = speedMps != null ? mpsToMph(speedMps) : null

  const source = (typeof p.source === 'string' && p.source) || 'unknown'

  // claim state
  const [claimState, setClaimState] = useState<ClaimState>({
    status: 'unclaimed',
  })

  // DMS selection (single global trigger)
  const dms = useMemo(
    () =>
      MOCK_NEARBY_ASSETS.filter((a) => a.type === 'sign').sort(
        (a, b) => a.distanceFt - b.distanceFt
      ),
    []
  )
  const cameras = useMemo(
    () =>
      MOCK_NEARBY_ASSETS.filter((a) => a.type === 'camera').sort(
        (a, b) => a.distanceFt - b.distanceFt
      ),
    []
  )

  const [selectedDmsIds, setSelectedDmsIds] = useState<string[]>([])
  const [dmsSentIds, setDmsSentIds] = useState<Set<string>>(new Set())

  // reset demo state when alert changes
  useEffect(() => {
    setClaimState({ status: 'unclaimed' })
    setSelectedDmsIds([])
    setDmsSentIds(new Set())
    setAuditSeenKey(null)
  }, [alert.id])

  const canDecide = claimState.status === 'unclaimed'
  const canDispatch = claimState.status === 'claimed' && claimState.by === user

  // auto-select nearest DMS once claimed
  useEffect(() => {
    if (claimState.status !== 'claimed') return
    if (selectedDmsIds.length) return
    if (dms.length) setSelectedDmsIds([dms[0].id])
  }, [claimState.status, selectedDmsIds.length, dms])

  const toggleDms = (id: string) => {
    setSelectedDmsIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    )
  }

  const triggerDmsAlert = () => {
    if (!canDispatch) return
    if (!selectedDmsIds.length) return
    setDmsSentIds((prev) => {
      const next = new Set(prev)
      for (const id of selectedDmsIds) next.add(id)
      return next
    })
  }

  const undoDismiss = () => {
    if (claimState.status !== 'dismissed') return
    setClaimState(claimState.previous ?? { status: 'unclaimed' })
  }

  // Audit: compact in top bar + popover (no permanent vertical space)
  const audit = useMemo<AuditEntry[]>(() => {
    const entries: AuditEntry[] = [
      { tsIso: alert.timestampUtc, text: 'Alert received' },
    ]

    if (claimState.status === 'claimed') {
      entries.push({
        tsIso: claimState.atIso,
        text: `Claimed by ${claimState.by}`,
      })
    } else if (claimState.status === 'dismissed') {
      entries.push({
        tsIso: claimState.atIso,
        text: `Dismissed by ${claimState.by}`,
      })
    }

    for (const id of Array.from(dmsSentIds)) {
      const sign = dms.find((x) => x.id === id)
      if (sign) {
        entries.push({
          tsIso: nowIso(),
          text: `Triggered DMS alert: ${sign.name}`,
        })
      }
    }

    entries.sort((a, b) => Date.parse(a.tsIso) - Date.parse(b.tsIso))
    return entries
  }, [alert.timestampUtc, claimState, dmsSentIds, dms])

  const latestAudit = audit[audit.length - 1] ?? {
    tsIso: alert.timestampUtc,
    text: 'Alert received',
  }

  const [auditAnchorEl, setAuditAnchorEl] = useState<HTMLElement | null>(null)
  const auditOpen = Boolean(auditAnchorEl)

  const [auditSeenKey, setAuditSeenKey] = useState<string | null>(null)
  const latestAuditKey = `${latestAudit.tsIso}|${latestAudit.text}`

  useEffect(() => {
    if (auditSeenKey == null) setAuditSeenKey(latestAuditKey)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [alert.id])

  useEffect(() => {
    if (auditOpen) setAuditSeenKey(latestAuditKey)
  }, [auditOpen, latestAuditKey])

  const hasNewAudit = auditSeenKey != null && auditSeenKey !== latestAuditKey

  return (
    <Paper elevation={14} sx={dockSx(claimState.status === 'unclaimed')}>
      <TopBar
        sevText={sevText}
        sevColor={sevColor}
        location={location}
        detectorId={detectorId}
        createdIso={createdIso}
        claimState={claimState}
        canDecide={canDecide}
        canDispatch={canDispatch}
        onClaim={() =>
          setClaimState({ status: 'claimed', by: user, atIso: nowIso() })
        }
        onDismiss={() =>
          setClaimState((prev) => ({
            status: 'dismissed',
            by: user,
            atIso: nowIso(),
            previous:
              prev.status === 'dismissed' ? prev.previous : (prev as any),
          }))
        }
        onUndoDismiss={undoDismiss}
        onDispatch={() => {}}
        onPrepareDms={() => {
          if (!isOpen) onToggleOpen()
        }}
        onJumpTo={onJumpTo}
        ll={ll}
        latestAudit={latestAudit}
        hasNewAudit={hasNewAudit}
        onOpenAudit={(el) => setAuditAnchorEl(el)}
        onToggleOpen={onToggleOpen}
        isOpen={isOpen}
        onClose={onClose}
      />

      <AuditPopover
        open={auditOpen}
        anchorEl={auditAnchorEl}
        onClose={() => setAuditAnchorEl(null)}
        audit={audit}
      />

      <Divider />

      <Body
        isOpen={isOpen}
        source={source}
        speedMph={speedMph}
        logsCount={logs.length}
        claimState={claimState}
        cameras={cameras}
        dms={dms}
        canDispatch={canDispatch}
        selectedDmsIds={selectedDmsIds}
        dmsSentIds={dmsSentIds}
        onToggleDms={toggleDms}
        onTriggerDms={triggerDmsAlert}
      />
    </Paper>
  )
}

/* -------------------------------- Subcomponents -------------------------- */

function TopBar(props: {
  sevText: string
  sevColor: 'error' | 'warning' | 'info' | 'default'
  location: string
  detectorId: string | null
  createdIso: string
  claimState: ClaimState
  canDecide: boolean
  canDispatch: boolean
  onClaim: () => void
  onDismiss: () => void
  onUndoDismiss: () => void
  onDispatch: () => void
  onPrepareDms: () => void
  onJumpTo?: (ll: { lat: number; lng: number }) => void
  ll: { lat: number; lng: number } | null
  latestAudit: AuditEntry
  hasNewAudit: boolean
  onOpenAudit: (el: HTMLElement) => void
  onToggleOpen: () => void
  isOpen: boolean
  onClose: () => void
}) {
  const {
    sevText,
    sevColor,
    location,
    detectorId,
    createdIso,
    claimState,
    canDecide,
    canDispatch,
    onClaim,
    onDismiss,
    onUndoDismiss,
    onDispatch,
    onPrepareDms,
    onJumpTo,
    ll,
    latestAudit,
    hasNewAudit,
    onOpenAudit,
    onToggleOpen,
    isOpen,
    onClose,
  } = props

  return (
    <Box sx={{ px: 2, py: 1.0, flex: '0 0 auto' }}>
      <Stack direction="row" spacing={1} alignItems="center">
        <Chip size="small" color={sevColor} label={sevText} />

        <Typography fontWeight={700} sx={{ whiteSpace: 'nowrap' }}>
          Wrong-way
        </Typography>

        <Typography
          variant="body2"
          sx={{ opacity: 0.9, flex: 1, minWidth: 0 }}
          noWrap
        >
          {location}
          {detectorId ? (
            <Typography component="span" variant="body2" sx={{ opacity: 0.7 }}>
              {` · Detector ${detectorId}`}
            </Typography>
          ) : null}
        </Typography>

        <StatusChip claimState={claimState} />

        <ActionSlot
          claimState={claimState}
          canDecide={canDecide}
          canDispatch={canDispatch}
          onClaim={onClaim}
          onDismiss={onDismiss}
          onUndoDismiss={onUndoDismiss}
          onDispatch={onDispatch}
          onPrepareDms={onPrepareDms}
        />

        {onJumpTo ? (
          <Button
            size="small"
            variant="outlined"
            startIcon={<MyLocationIcon fontSize="small" />}
            disabled={!ll}
            onClick={() => {
              if (ll) onJumpTo(ll)
            }}
            sx={{ fontWeight: 900, px: 1.25, py: 0.5, minWidth: 0 }}
          >
            Jump to
          </Button>
        ) : null}

        <LatestAuditInline
          latest={latestAudit}
          hasNew={hasNewAudit}
          onOpen={(el) => onOpenAudit(el)}
        />

        <Typography
          variant="caption"
          sx={{ opacity: 0.8, whiteSpace: 'nowrap' }}
          title={createdIso}
        >
          {formatTimestamp(createdIso)}
        </Typography>

        <IconButton size="small" onClick={onToggleOpen}>
          {isOpen ? <ExpandMoreIcon /> : <ExpandLessIcon />}
        </IconButton>

        <IconButton size="small" onClick={onClose}>
          <CloseIcon />
        </IconButton>
      </Stack>
    </Box>
  )
}

function StatusChip({ claimState }: { claimState: ClaimState }) {
  if (claimState.status === 'claimed') {
    return (
      <Chip
        size="small"
        variant="outlined"
        label={`Claimed by ${claimState.by}`}
      />
    )
  }
  if (claimState.status === 'dismissed') {
    return (
      <Chip
        size="small"
        variant="outlined"
        label={`Dismissed by ${claimState.by}`}
      />
    )
  }
  return null
}

function ActionSlot(props: {
  claimState: ClaimState
  canDecide: boolean
  canDispatch: boolean
  onClaim: () => void
  onDismiss: () => void
  onUndoDismiss: () => void
  onDispatch: () => void
  onPrepareDms: () => void
}) {
  const ACTION_SLOT_WIDTH = 360

  const {
    claimState,
    canDecide,
    canDispatch,
    onClaim,
    onDismiss,
    onUndoDismiss,
    onDispatch,
    onPrepareDms,
  } = props

  if (canDecide) {
    return (
      <Box
        sx={{
          width: ACTION_SLOT_WIDTH,
          display: 'flex',
          justifyContent: 'flex-end',
          gap: 1,
        }}
      >
        <Button
          size="small"
          variant="contained"
          onClick={onClaim}
          sx={{ fontWeight: 900, px: 1.75, py: 0.6 }}
        >
          CLAIM
        </Button>
        <Button
          size="small"
          variant="outlined"
          color="inherit"
          onClick={onDismiss}
          sx={{ fontWeight: 900, px: 1.75, py: 0.6 }}
        >
          DISMISS
        </Button>
      </Box>
    )
  }

  if (claimState.status === 'dismissed') {
    return (
      <Box
        sx={{
          width: ACTION_SLOT_WIDTH,
          display: 'flex',
          justifyContent: 'flex-end',
          gap: 1,
        }}
      >
        <Button
          size="small"
          variant="outlined"
          startIcon={<ReplayIcon fontSize="small" />}
          onClick={onUndoDismiss}
          sx={{ fontWeight: 900, px: 1.25, py: 0.55 }}
        >
          Undo dismiss
        </Button>
      </Box>
    )
  }

  // claimed
  return (
    <Box
      sx={{
        width: ACTION_SLOT_WIDTH,
        display: 'flex',
        justifyContent: 'flex-end',
        gap: 1,
      }}
    >
      <Button
        size="small"
        variant="contained"
        disabled={!canDispatch}
        onClick={onDispatch}
        sx={{ fontWeight: 900, px: 1.75, py: 0.6 }}
      >
        DISPATCH
      </Button>

      <Button
        size="small"
        variant="outlined"
        disabled={!canDispatch}
        onClick={onPrepareDms}
        sx={{ fontWeight: 900, px: 1.75, py: 0.6 }}
      >
        Prepare DMS
      </Button>
    </Box>
  )
}

function LatestAuditInline(props: {
  latest: AuditEntry
  hasNew: boolean
  onOpen: (el: HTMLElement) => void
}) {
  const { latest, hasNew, onOpen } = props

  return (
    <Stack direction="row" spacing={0.75} alignItems="center" sx={{ ml: 0.5 }}>
      <Typography
        variant="caption"
        sx={{ opacity: 0.75, whiteSpace: 'nowrap' }}
        title={latest.tsIso}
      >
        {formatTimestamp(latest.tsIso)}
      </Typography>

      <Typography
        variant="caption"
        sx={{ opacity: 0.9, maxWidth: 240 }}
        noWrap
        title={latest.text}
      >
        {latest.text}
      </Typography>

      <Badge color="error" variant="dot" invisible={!hasNew} overlap="circular">
        <IconButton
          size="small"
          onClick={(e) => onOpen(e.currentTarget)}
          title="View audit"
        >
          <HistoryIcon fontSize="small" />
        </IconButton>
      </Badge>
    </Stack>
  )
}

function AuditPopover(props: {
  open: boolean
  anchorEl: HTMLElement | null
  onClose: () => void
  audit: AuditEntry[]
}) {
  const { open, anchorEl, onClose, audit } = props

  return (
    <Popover
      open={open}
      anchorEl={anchorEl}
      onClose={onClose}
      anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      transformOrigin={{ vertical: 'top', horizontal: 'right' }}
      PaperProps={{ sx: { p: 1.25, width: 420, maxWidth: '90vw' } }}
    >
      <Typography fontWeight={900} sx={{ mb: 0.75 }}>
        Audit
      </Typography>

      <Stack spacing={0.5}>
        {audit.map((a, idx) => (
          <AuditLine key={`${a.tsIso}-${idx}`} ts={a.tsIso} text={a.text} />
        ))}
      </Stack>
    </Popover>
  )
}

function Body(props: {
  isOpen: boolean
  source: string
  speedMph: number | null
  logsCount: number
  claimState: ClaimState
  cameras: NearbyAsset[]
  dms: NearbyAsset[]
  canDispatch: boolean
  selectedDmsIds: string[]
  dmsSentIds: Set<string>
  onToggleDms: (id: string) => void
  onTriggerDms: () => void
}) {
  const {
    isOpen,
    source,
    speedMph,
    logsCount,
    claimState,
    cameras,
    dms,
    canDispatch,
    selectedDmsIds,
    dmsSentIds,
    onToggleDms,
    onTriggerDms,
  } = props

  return (
    <Box sx={{ px: 2, py: 1.25, flex: '1 1 auto', overflow: 'auto' }}>
      {!isOpen ? (
        <Stack
          direction="row"
          spacing={3}
          alignItems="flex-start"
          sx={{ pb: 0.5 }}
        >
          <Stack direction="row" spacing={3}>
            <Info label="Speed">
              {speedMph != null ? `${speedMph.toFixed(1)} mph` : '—'}
            </Info>
            <Info label="Direction">SB</Info>
            <Info label="Tracking logs">{String(logsCount)}</Info>
          </Stack>
        </Stack>
      ) : (
        <Stack direction="row" spacing={2} alignItems="stretch">
          <SnapshotPanel source={source} />

          <RightPanel
            claimState={claimState}
            speedMph={speedMph}
            logsCount={logsCount}
            cameras={cameras}
            dms={dms}
            canDispatch={canDispatch}
            selectedDmsIds={selectedDmsIds}
            dmsSentIds={dmsSentIds}
            onToggleDms={onToggleDms}
            onTriggerDms={onTriggerDms}
          />
        </Stack>
      )}
    </Box>
  )
}

function SnapshotPanel({ source }: { source: string }) {
  return (
    <Box sx={{ width: 440, flex: '0 0 auto' }}>
      <Stack
        direction="row"
        justifyContent="space-between"
        alignItems="baseline"
      >
        <Typography fontWeight={900}>Snapshot</Typography>
        <Typography variant="caption" sx={{ opacity: 0.75 }}>
          {source}
        </Typography>
      </Stack>

      <Box
        sx={{
          mt: 0.6,
          height: 220,
          border: '1px solid',
          borderColor: 'divider',
          borderRadius: 1,
          overflow: 'hidden',
          bgcolor: 'background.default',
        }}
      >
        <Box
          component="img"
          src={HARDCODED_SNAPSHOT}
          alt="incident snapshot"
          sx={{ width: '100%', height: '100%', objectFit: 'cover' }}
        />
      </Box>
    </Box>
  )
}

function RightPanel(props: {
  claimState: ClaimState
  speedMph: number | null
  logsCount: number
  cameras: NearbyAsset[]
  dms: NearbyAsset[]
  canDispatch: boolean
  selectedDmsIds: string[]
  dmsSentIds: Set<string>
  onToggleDms: (id: string) => void
  onTriggerDms: () => void
}) {
  const {
    claimState,
    speedMph,
    logsCount,
    cameras,
    dms,
    canDispatch,
    selectedDmsIds,
    dmsSentIds,
    onToggleDms,
    onTriggerDms,
  } = props

  return (
    <Box
      sx={{ flex: 1, minWidth: 360, display: 'flex', flexDirection: 'column' }}
    >
      <HelperLine claimState={claimState} />

      <Divider />

      <Box sx={{ pt: 1.25 }}>
        <Stack direction="row" spacing={3} alignItems="flex-start">
          <FactsPanel speedMph={speedMph} logsCount={logsCount} />

          <NearbyCamerasPanel cameras={cameras} />

          <NearbyDmsPanel
            dms={dms}
            canDispatch={canDispatch}
            selectedIds={selectedDmsIds}
            sentIds={dmsSentIds}
            onToggle={onToggleDms}
            onTrigger={onTriggerDms}
          />
        </Stack>
      </Box>
    </Box>
  )
}

function HelperLine({ claimState }: { claimState: ClaimState }) {
  if (claimState.status === 'unclaimed') {
    return (
      <Typography variant="body2" sx={{ opacity: 0.85, pb: 1 }}>
        Verify quickly, then claim or dismiss (top bar).
      </Typography>
    )
  }
  if (claimState.status === 'dismissed') {
    return (
      <Typography variant="body2" sx={{ opacity: 0.85, pb: 1 }}>
        Dismissed as a false alarm. You can undo from the top bar.
      </Typography>
    )
  }
  return (
    <Typography variant="body2" sx={{ opacity: 0.85, pb: 1 }}>
      Claimed. Dispatch and coordinate cameras / DMS.
    </Typography>
  )
}

function FactsPanel(props: { speedMph: number | null; logsCount: number }) {
  const { speedMph, logsCount } = props
  return (
    <Box sx={{ flex: 0.65, minWidth: 100 }}>
      <Stack spacing={0.9}>
        <Info label="Speed">
          {speedMph != null ? `${speedMph.toFixed(1)} mph` : '—'}
        </Info>
        <Info label="Direction">SB</Info>
        <Info label="Tracking logs">{String(logsCount)}</Info>
      </Stack>
    </Box>
  )
}

function NearbyCamerasPanel({ cameras }: { cameras: NearbyAsset[] }) {
  return (
    <Box sx={{ flex: 1.05, minWidth: 280 }}>
      <Typography fontWeight={900} sx={{ mb: 0.5 }}>
        Nearby cameras
      </Typography>

      <Stack spacing={0.75}>
        {cameras.map((a) => (
          <RowCard key={a.id}>
            <VideocamOutlinedIcon fontSize="small" />
            <Typography
              variant="body2"
              sx={{ fontWeight: 800, flex: 1 }}
              noWrap
            >
              {a.name}
            </Typography>
            <Typography
              variant="caption"
              sx={{ opacity: 0.75, whiteSpace: 'nowrap' }}
            >
              {a.distanceFt.toLocaleString()} ft
            </Typography>
            <Button
              size="small"
              variant="text"
              sx={{ fontWeight: 900, minWidth: 0 }}
            >
              Open
            </Button>
          </RowCard>
        ))}
      </Stack>
    </Box>
  )
}

function NearbyDmsPanel(props: {
  dms: NearbyAsset[]
  canDispatch: boolean
  selectedIds: string[]
  sentIds: Set<string>
  onToggle: (id: string) => void
  onTrigger: () => void
}) {
  const { dms, canDispatch, selectedIds, sentIds, onToggle, onTrigger } = props

  return (
    <Box sx={{ flex: 1.15, minWidth: 320 }}>
      <Stack
        direction="row"
        justifyContent="space-between"
        alignItems="baseline"
        sx={{ mb: 0.25 }}
      >
        <Typography fontWeight={900}>Nearby DMS signs</Typography>

        <Button
          size="small"
          variant="contained"
          onClick={onTrigger}
          disabled={!canDispatch || selectedIds.length === 0}
          sx={{ fontWeight: 900 }}
        >
          Trigger DMS alert
          {selectedIds.length ? ` (${selectedIds.length})` : ''}
        </Button>
      </Stack>

      <Typography
        variant="caption"
        sx={{ opacity: 0.75, display: 'block', mb: 0.75 }}
      >
        Select sign(s), then send a wrong-way warning.
      </Typography>

      <Stack spacing={0.75}>
        {dms.map((a) => {
          const selected = selectedIds.includes(a.id)
          const sent = sentIds.has(a.id)

          return (
            <RowCard
              key={a.id}
              sx={{
                borderColor: selected ? 'primary.main' : 'divider',
                opacity: sent ? 0.85 : 1,
              }}
            >
              <Checkbox
                size="small"
                checked={selected}
                onChange={() => onToggle(a.id)}
                disabled={!canDispatch}
              />
              <CampaignOutlinedIcon fontSize="small" />
              <Typography
                variant="body2"
                sx={{ fontWeight: 800, flex: 1 }}
                noWrap
              >
                {a.name}
              </Typography>
              <Typography
                variant="caption"
                sx={{ opacity: 0.75, whiteSpace: 'nowrap' }}
              >
                {a.distanceFt.toLocaleString()} ft
              </Typography>

              {sent ? (
                <Chip size="small" label="Sent" variant="outlined" />
              ) : (
                <Button
                  size="small"
                  variant="text"
                  sx={{ fontWeight: 900, minWidth: 0 }}
                  onClick={() => onToggle(a.id)}
                  disabled={!canDispatch}
                >
                  {selected ? 'Selected' : 'Select'}
                </Button>
              )}
            </RowCard>
          )
        })}
      </Stack>
    </Box>
  )
}

/* --------------------------------- UI bits -------------------------------- */

function Info({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <Box sx={{ minWidth: 160 }}>
      <Typography variant="caption" sx={{ opacity: 0.7, display: 'block' }}>
        {label}
      </Typography>
      <Typography variant="body2" sx={{ fontWeight: 900 }}>
        {children}
      </Typography>
    </Box>
  )
}

function AuditLine({ ts, text }: { ts: string; text: string }) {
  return (
    <Stack direction="row" spacing={1} alignItems="baseline">
      <Typography
        variant="caption"
        sx={{ opacity: 0.75, whiteSpace: 'nowrap' }}
      >
        {formatTimestamp(ts)}
      </Typography>
      <Typography variant="body2" sx={{ opacity: 0.9 }}>
        {text}
      </Typography>
    </Stack>
  )
}

function RowCard({ children, sx }: { children: React.ReactNode; sx?: any }) {
  return (
    <Stack
      direction="row"
      spacing={1}
      alignItems="center"
      sx={{
        border: '1px solid',
        borderColor: 'divider',
        borderRadius: 1,
        px: 1,
        py: 0.65,
        ...sx,
      }}
    >
      {children}
    </Stack>
  )
}

function dockSx(glow: boolean) {
  return {
    position: 'absolute',
    left: 12,
    right: 12,
    bottom: 12,
    zIndex: 1400,
    overflow: 'hidden',
    borderRadius: 2,
    maxHeight: '52vh',
    display: 'flex',
    flexDirection: 'column',
    border: '2px solid',
    borderColor: 'error.main',
    boxShadow: (theme: any) =>
      `0 0 0 4px ${theme.palette.error.main}22, 0 10px 30px rgba(0,0,0,.25)`,
    '@keyframes wwGlow': {
      '0%': {
        boxShadow: '0 0 0 4px rgba(211,47,47,.10), 0 10px 30px rgba(0,0,0,.25)',
      },
      '50%': {
        boxShadow: '0 0 0 8px rgba(211,47,47,.18), 0 10px 30px rgba(0,0,0,.25)',
      },
      '100%': {
        boxShadow: '0 0 0 4px rgba(211,47,47,.10), 0 10px 30px rgba(0,0,0,.25)',
      },
    },
    animation: glow ? 'wwGlow 1.6s ease-in-out infinite' : 'none',
  }
}
