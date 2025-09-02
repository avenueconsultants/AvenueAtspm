import indianaHighRezDataEnumerations from '@/lib/indianaHighResDataEnumerations.json'
import { useSidebarStore } from '@/stores/sidebar'
import ClearIcon from '@mui/icons-material/Clear'
import CloseIcon from '@mui/icons-material/Close'
import ExpandLessIcon from '@mui/icons-material/ExpandLess'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import SearchIcon from '@mui/icons-material/Search'
import {
  Box,
  Collapse,
  Divider,
  IconButton,
  InputAdornment,
  Link,
  List,
  ListItem,
  ListItemText,
  ListSubheader,
  TextField,
  Typography,
} from '@mui/material'
import { useEffect, useMemo, useState } from 'react'

type EventItem = {
  eventType: string
  code: string
  descriptor: string
  parameter: string
  description: string
}

type RangeItem = {
  kind: 'range'
  start: number
  end: number
  descriptor: string
  parameter: string
  description: string
}
type SingleItem = { kind: 'single'; item: EventItem }
type DisplayItem = RangeItem | SingleItem

const escapeRegExp = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
const asNum = (s: string) => {
  const n = Number(s)
  return Number.isFinite(n) ? n : undefined
}

function highlight(text: string, query: string) {
  if (!query?.trim()) return text
  const re = new RegExp(`(${escapeRegExp(query.trim())})`, 'ig')
  return String(text)
    .split(re)
    .map((part, i) =>
      re.test(part) ? (
        <mark
          key={i}
          style={{
            padding: 0,
            backgroundColor: 'primary.main',
            color: 'inherit',
            fontWeight: 700,
          }}
        >
          {part}
        </mark>
      ) : (
        <span key={i}>{part}</span>
      )
    )
}

export default function EventCodesPanel() {
  const allEvents = indianaHighRezDataEnumerations as EventItem[]
  const { closeRightSidebar } = useSidebarStore()

  const [query, setQuery] = useState('')
  const [sectionOpen, setSectionOpen] = useState<Record<string, boolean>>({})

  // Build per-eventType groups in ORIGINAL order of first appearance,
  // and compress consecutive codes with identical descriptor/description/parameter into a single range item.
  const { groupedDisplay, groupedRaw, rangeMemberCodesByType } = useMemo(() => {
    const mapRaw = new Map<string, EventItem[]>()
    const order: string[] = []

    for (const e of allEvents) {
      const key = e.eventType || 'Other'
      if (!mapRaw.has(key)) {
        mapRaw.set(key, [])
        order.push(key)
      }
      mapRaw.get(key)!.push(e)
    }

    const groupedDisplay: Array<[string, DisplayItem[]]> = []
    const groupedRaw: Array<[string, EventItem[]]> = []
    const rangeMemberCodesByType = new Map<string, Set<string>>() // codes that belong to a collapsed range

    for (const key of order) {
      const items = [...(mapRaw.get(key) ?? [])]
      // sort by numeric code asc (fallback to string/descriptor)
      items.sort((a, b) => {
        const an = asNum(a.code)
        const bn = asNum(b.code)
        if (an !== undefined && bn !== undefined) return an - bn
        return (
          a.code.localeCompare(b.code) ||
          a.descriptor.localeCompare(b.descriptor)
        )
      })

      // scan & collapse ranges
      const display: DisplayItem[] = []
      const rangeMembers = new Set<string>()
      let i = 0
      while (i < items.length) {
        const cur = items[i]
        const curN = asNum(cur.code)
        // start a potential run
        let j = i + 1
        while (
          j < items.length &&
          asNum(items[j]?.code) !== undefined &&
          curN !== undefined &&
          asNum(items[j]?.code)! === asNum(items[j - 1]?.code)! + 1 &&
          items[j].descriptor === cur.descriptor &&
          items[j].description === cur.description &&
          items[j].parameter === cur.parameter
        ) {
          j++
        }

        // If run length > 1 and only codes differ, collapse to range
        if (j - i > 1 && curN !== undefined) {
          const endN = asNum(items[j - 1].code)!
          display.push({
            kind: 'range',
            start: curN,
            end: endN,
            descriptor: cur.descriptor,
            description: cur.description,
            parameter: cur.parameter,
          })
          for (let k = i; k < j; k++) rangeMembers.add(items[k].code)
          i = j
        } else {
          display.push({ kind: 'single', item: cur })
          i++
        }
      }

      groupedDisplay.push([key, display])
      groupedRaw.push([key, items])
      rangeMemberCodesByType.set(key, rangeMembers)
    }

    return { groupedDisplay, groupedRaw, rangeMemberCodesByType }
  }, [allEvents])

  // Initialize all sections open
  useEffect(() => {
    if (Object.keys(sectionOpen).length === 0 && groupedDisplay.length) {
      setSectionOpen(
        Object.fromEntries(groupedDisplay.map(([t]) => [t, false]))
      )
    }
  }, [groupedDisplay, sectionOpen])

  const hasQuery = query.trim() !== ''
  const qLower = query.trim().toLowerCase()

  // ranking for search ordering
  const rankFor = (e: EventItem, q: string) => {
    const code = e.code.toLowerCase()
    const qq = q.toLowerCase()
    if (code === qq) return 0
    if (code.startsWith(qq)) return 1
    if (code.includes(qq)) return 2
    const blob = `${e.descriptor} ${e.description} ${e.parameter}`.toLowerCase()
    if (blob.includes(qq)) return 3
    return 4
  }

  // When searching:
  //  - Show ONLY single items.
  //  - Suppress any item that belongs to a collapsed range, UNLESS the query equals that exact code.
  //  - Order by our ranking (exact -> startsWith (shorter first) -> contains -> text), then numeric code asc.
  const filtered = useMemo(() => {
    if (!hasQuery) return groupedDisplay // show collapsed ranges when not searching

    return groupedRaw
      .map(([eventType, items]) => {
        const rangeMembers =
          rangeMemberCodesByType.get(eventType) ?? new Set<string>()
        const matches = items.filter((e) => {
          const textMatch = [e.code, e.descriptor, e.description, e.parameter]
            .filter(Boolean)
            .some((x) => String(x).toLowerCase().includes(qLower))
          if (!textMatch) return false

          // suppress bulk "reserved" ranges unless exact code
          if (rangeMembers.has(e.code) && e.code.toLowerCase() !== qLower)
            return false

          return true
        })

        matches.sort((a, b) => {
          const ra = rankFor(a, qLower)
          const rb = rankFor(b, qLower)
          if (ra !== rb) return ra - rb
          if (ra === 1) {
            if (a.code.length !== b.code.length)
              return a.code.length - b.code.length
          }
          const an = asNum(a.code)
          const bn = asNum(b.code)
          if (an !== undefined && bn !== undefined) return an - bn
          return a.code.localeCompare(b.code)
        })

        // convert to DisplayItem singles for uniform render
        return [
          eventType,
          matches.map((m) => ({ kind: 'single', item: m }) as DisplayItem),
        ] as [string, DisplayItem[]]
      })
      .filter(([, items]) => items.length > 0)
  }, [groupedDisplay, groupedRaw, hasQuery, qLower, rangeMemberCodesByType])

  const toggleSection = (key: string) =>
    setSectionOpen((s) => ({ ...s, [key]: !s[key] }))

  return (
    <>
      {/* Header / Controls */}
      <Box
        sx={{
          p: 2,
          pb: 0,
          display: 'flex',
          gap: 1,
          justifyContent: 'space-between',
        }}
      >
        <Typography variant="subtitle2" gutterBottom>
          List of Event Codes
        </Typography>
        <IconButton
          size="small"
          onClick={closeRightSidebar}
          aria-label="Collapse sidebar"
        >
          <CloseIcon fontSize="small" />
        </IconButton>
      </Box>

      <Box
        sx={{ p: 2, display: 'flex', gap: 1, justifyContent: 'space-between' }}
      >
        <TextField
          size="small"
          placeholder="Search code, descriptor…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          sx={{ width: 280 }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon fontSize="small" />
              </InputAdornment>
            ),
            endAdornment: query ? (
              <InputAdornment position="end">
                <IconButton
                  size="small"
                  aria-label="clear search"
                  onClick={() => setQuery('')}
                >
                  <ClearIcon fontSize="small" />
                </IconButton>
              </InputAdornment>
            ) : undefined,
          }}
        />
      </Box>

      <Divider />

      {/* Groups (preserve original eventType order) */}
      <Box sx={{ overflowY: 'auto', flex: 1 }}>
        {filtered.map(([eventType, items]) => {
          const open = hasQuery ? true : !!sectionOpen[eventType]
          return (
            <List
              key={eventType}
              dense
              sx={{ pt: 1, pb: 0 }}
              subheader={
                <ListSubheader
                  component="div"
                  sx={{
                    bgcolor: 'background.paper',
                    position: 'sticky',
                    top: 0,
                    borderBottom: '1px solid',
                    borderColor: 'divider',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    pb: 0,
                    pr: 1,
                  }}
                >
                  <Typography variant="subtitle2">{eventType}</Typography>
                  {!hasQuery && (
                    <IconButton
                      size="small"
                      onClick={() => toggleSection(eventType)}
                      aria-label={open ? 'Collapse section' : 'Expand section'}
                    >
                      {open ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                    </IconButton>
                  )}
                </ListSubheader>
              }
            >
              <Collapse in={open} timeout="auto" unmountOnExit={!hasQuery}>
                {items.map((d, idx) =>
                  d.kind === 'range' ? (
                    // Show a single consolidated row like "71–80 — Overlap events reserved for future use."
                    <ListItem
                      key={`${eventType}-range-${d.start}-${d.end}-${idx}`}
                    >
                      <ListItemText
                        primaryTypographyProps={{
                          variant: 'body2',
                          fontWeight: 600,
                        }}
                        secondaryTypographyProps={{
                          variant: 'caption',
                          color: 'text.secondary',
                        }}
                        primary={
                          <>
                            {d.start}–{d.end} •{' '}
                            {d.descriptor || 'Reserved for future use'}
                          </>
                        }
                        secondary={
                          <>
                            {d.description && <div>{d.description}</div>}
                            {d.parameter && (
                              <div>
                                <strong>Parameter:</strong> {d.parameter}
                              </div>
                            )}
                          </>
                        }
                      />
                    </ListItem>
                  ) : (
                    <ListItem key={`${eventType}-${d.item.code}`}>
                      <ListItemText
                        primaryTypographyProps={{
                          variant: 'body2',
                          fontWeight: 500,
                        }}
                        secondaryTypographyProps={{
                          variant: 'caption',
                          color: 'text.secondary',
                        }}
                        primary={
                          <>
                            {highlight(d.item.code, query)}{' '}
                            <span>
                              —{' '}
                              {highlight(
                                d.item.descriptor || 'Reserved for future use',
                                query
                              )}
                            </span>
                          </>
                        }
                        secondary={
                          <>
                            {d.item.description && (
                              <div>{highlight(d.item.description, query)}</div>
                            )}
                            {d.item.parameter && (
                              <div>
                                <strong>Parameter:</strong>{' '}
                                {highlight(d.item.parameter, query)}
                              </div>
                            )}
                          </>
                        }
                      />
                    </ListItem>
                  )
                )}
              </Collapse>
            </List>
          )
        })}
        <Box
          sx={{
            p: 2,
            bgcolor: 'background.default',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <Typography variant="caption" color="text.secondary" gutterBottom>
            Event code definitions are adapted from:
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Li, H., A. M. Hainen, J. R. Sturdevant, T. Atkison, S. Talukder, J.
            K. Mathew, D. M. Bullock, D. Nelson, D. M. Maas, Jr., J. Fink, and
            T. Stiles.
            <em>
              {' '}
              Indiana Traffic Signal Hi Resolution Data Logger Enumerations.
            </em>
            Indiana Department of Transportation and Purdue University, West
            Lafayette, Indiana, 2019. <br />
            <Link
              href="https://doi.org/10.5703/1288284316998"
              target="_blank"
              rel="noopener noreferrer"
              underline="hover"
            >
              https://doi.org/10.5703/1288284316998
            </Link>
          </Typography>
        </Box>
      </Box>
    </>
  )
}
