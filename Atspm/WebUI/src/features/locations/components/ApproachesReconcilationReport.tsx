import { LocationDiscrepancyReport } from '@/features/locations/components/ApproachOptions/ApproachOptions'
import { useLocationStore } from '@/features/locations/components/editLocation/locationStore'
import AddCircleIcon from '@mui/icons-material/AddCircle'
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline'
import DeleteIcon from '@mui/icons-material/Delete'
import ExpandLessIcon from '@mui/icons-material/ExpandLess'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import HighlightOffIcon from '@mui/icons-material/HighlightOff'
import RemoveIcon from '@mui/icons-material/Remove'
import RemoveCircleOutlineIcon from '@mui/icons-material/RemoveCircleOutline'
import {
  Box,
  Button,
  Collapse,
  ListItemIcon,
  ListItemText,
  Menu,
  MenuItem,
  Paper,
  Stack,
  Typography,
  useTheme,
} from '@mui/material'
import { useEffect, useState } from 'react'

interface ApproachesReconcilationReportProps {
  synced: boolean
  categories: LocationDiscrepancyReport
  syncedPhases: number[]
  syncedDetectors: number[]
}

type ItemStatus = 'pending' | 'ignored' | 'added' | 'deleted'
type ItemKind = 'FOUND_PHASE' | 'FOUND_DET' | 'NOT_FOUND_APP' | 'NOT_FOUND_DET'

interface DiscrepancyItem {
  kind: ItemKind
  id: string
  label: string
}

export default function ApproachesReconcilationReport({
  synced,
  categories,
}: ApproachesReconcilationReportProps) {
  const theme = useTheme()
  const [open, setOpen] = useState(true)
  const [menuAnchor, setMenuAnchor] = useState<HTMLElement | null>(null)
  const [menuItem, setMenuItem] = useState<DiscrepancyItem | null>(null)
  const [itemStatuses, setItemStatuses] = useState<Record<string, ItemStatus>>(
    {}
  )
  const {
    approaches,
    deleteApproach,
    deleteDetector,
    addApproach,
    addDetector,
  } = useLocationStore()

  // Listen to store changes and mark items as deleted if they're missing
  useEffect(() => {
    categories.notFoundApproaches.forEach((approach) => {
      const key = `notfound_app_${approach.id}`
      const exists = approaches.some((a) => a.id === approach.id)
      if (!exists && itemStatuses[key] !== 'deleted') {
        setItemStatuses((prev) => ({ ...prev, [key]: 'deleted' }))
      }
    })
  }, [approaches, categories.notFoundApproaches, itemStatuses])

  useEffect(() => {
    const storeDetectorChannels = approaches.flatMap((a) =>
      a.detectors.map((d) => d.detectorChannel?.toString())
    )
    categories.notFoundDetectorChannels.forEach((det) => {
      const key = `notfound_det_${det}`
      const exists = storeDetectorChannels.includes(det)
      if (!exists && itemStatuses[key] !== 'deleted') {
        setItemStatuses((prev) => ({ ...prev, [key]: 'deleted' }))
      }
    })
  }, [approaches, categories.notFoundDetectorChannels, itemStatuses])

  if (!synced) return null

  function toggle() {
    setOpen(!open)
  }

  function setStatus(id: string, status: ItemStatus) {
    setItemStatuses((prev) => ({ ...prev, [id]: status }))
    closeMenu()
  }

  function openMenu(
    e: React.MouseEvent<HTMLButtonElement>,
    item: DiscrepancyItem
  ) {
    e.stopPropagation()
    setMenuAnchor(e.currentTarget)
    setMenuItem(item)
  }

  function closeMenu() {
    setMenuAnchor(null)
    setMenuItem(null)
  }

  async function handleAddApproach() {
    if (!menuItem) return
    const phase = parseInt(menuItem.label, 10)
    try {
      await addApproach(phase) // Assumes addApproach accepts a phase number
      setStatus(menuItem.id, 'added')
    } catch (err) {
      console.error(err)
    }
  }

  async function handleAddDetector(approachId: number) {
    if (!menuItem) return
    const channel = parseInt(menuItem.label, 10)
    try {
      await addDetector(approachId, channel) // Assumes addDetector accepts an approachId and channel
      setStatus(menuItem.id, 'added')
    } catch (err) {
      console.error(err)
    }
  }

  function renderButton(item: DiscrepancyItem) {
    const status = itemStatuses[item.id] || 'pending'
    const color =
      status === 'ignored'
        ? 'inherit'
        : status === 'added'
          ? 'success'
          : status === 'deleted'
            ? 'error'
            : 'primary'
    const icon =
      status === 'ignored' ? (
        <RemoveCircleOutlineIcon fontSize="small" />
      ) : status === 'added' ? (
        <CheckCircleOutlineIcon fontSize="small" />
      ) : status === 'deleted' ? (
        <HighlightOffIcon fontSize="small" />
      ) : null

    if (status === 'pending') {
      return (
        <Button
          key={item.id}
          variant="outlined"
          endIcon={icon}
          onClick={(e) => openMenu(e, item)}
          size="small"
          sx={{
            margin: 1,
            color: theme.palette.grey[700],
            borderColor: theme.palette.grey[700],
          }}
          disableElevation
        >
          {item.label}
        </Button>
      )
    }

    return (
      <Button
        key={item.id}
        variant="contained"
        color={color}
        endIcon={icon}
        onClick={(e) => openMenu(e, item)}
        size="small"
        sx={{ margin: 1 }}
        disableElevation
      >
        {item.label}
      </Button>
    )
  }

  function row(title: string, items: DiscrepancyItem[]) {
    if (!items.length) {
      return (
        <Box mb={1}>
          <Typography variant="subtitle2">{title}</Typography>
          <Typography variant="body2" color="success.main">
            In Sync
          </Typography>
        </Box>
      )
    }
    return (
      <Box mb={1}>
        <Typography variant="subtitle2">{title}</Typography>
        <Stack direction="row" spacing={1} mt={1} flexWrap="wrap" rowGap={1}>
          {items.map((i) => renderButton(i))}
        </Stack>
      </Box>
    )
  }

  function buildItem(
    kind: ItemKind,
    uniqueId: string,
    label: string
  ): DiscrepancyItem {
    return { kind, id: uniqueId, label }
  }

  const foundPhases = categories.foundPhaseNumbers.map((phase) =>
    buildItem('FOUND_PHASE', `found_phase_${phase}`, `${phase}`)
  )
  const foundDetectors = categories.foundDetectorChannels.map((det) =>
    buildItem('FOUND_DET', `found_det_${det}`, `${det}`)
  )
  const notFoundApproaches = categories.notFoundApproaches.map((approach) =>
    buildItem(
      'NOT_FOUND_APP',
      `notfound_app_${approach.id}`,
      approach.description || `${approach.id}`
    )
  )
  const notFoundDetectors = categories.notFoundDetectorChannels.map((det) =>
    buildItem('NOT_FOUND_DET', `notfound_det_${det}`, `${det}`)
  )

  async function handleDelete() {
    if (!menuItem) return
    if (menuItem.kind === 'NOT_FOUND_APP') {
      const approachId = parseInt(menuItem.id.replace('notfound_app_', ''), 10)
      const target = approaches.find((a) => a.id === approachId)
      if (target) {
        try {
          await deleteApproach(target)
        } catch (err) {
          console.error(err)
        }
      }
      setStatus(menuItem.id, 'deleted')
    } else if (menuItem.kind === 'NOT_FOUND_DET') {
      const detectorChannel = menuItem.label
      const storeDetectors = approaches.flatMap((a) => a.detectors)
      const target = storeDetectors.find(
        (d) => d.detectorChannel?.toString() === detectorChannel
      )
      if (target) {
        try {
          await deleteDetector(target.id)
        } catch (err) {
          console.error(err)
        }
      }
      setStatus(menuItem.id, 'deleted')
    }
  }

  return (
    <Paper sx={{ p: 2, mb: 2 }}>
      <Box
        display="flex"
        justifyContent="space-between"
        alignItems="center"
        sx={{ cursor: 'pointer' }}
        onClick={toggle}
      >
        <Typography variant="h6" fontWeight="bold">
          Approaches Reconciliation Report
        </Typography>
        {open ? <ExpandLessIcon /> : <ExpandMoreIcon />}
      </Box>
      <Collapse in={open}>
        <Box mt={2}>
          <Typography variant="subtitle1" fontWeight="bold">
            Found
          </Typography>
          {row('Phases (Missing Approach)', foundPhases)}
          {row('Detector Channels (Missing Detector)', foundDetectors)}
        </Box>
        <Box mt={2}>
          <Typography variant="subtitle1" fontWeight="bold">
            Not Found
          </Typography>
          {row('Approaches (No Data)', notFoundApproaches)}
          {row('Detectors (No Data)', notFoundDetectors)}
        </Box>
      </Collapse>
      <Menu
        anchorEl={menuAnchor}
        open={Boolean(menuAnchor)}
        onClose={closeMenu}
      >
        {menuItem?.kind === 'FOUND_PHASE' && (
          <>
            <MenuItem onClick={() => setStatus(menuItem.id, 'ignored')}>
              <ListItemIcon>
                <RemoveIcon fontSize="small" />
              </ListItemIcon>
              <ListItemText>Ignore</ListItemText>
            </MenuItem>
            <MenuItem onClick={handleAddApproach}>
              <ListItemIcon>
                <AddCircleIcon fontSize="small" />
              </ListItemIcon>
              <ListItemText>Add Approach</ListItemText>
            </MenuItem>
          </>
        )}
        {menuItem?.kind === 'FOUND_DET' && (
          <>
            <MenuItem onClick={() => setStatus(menuItem.id, 'ignored')}>
              <ListItemIcon>
                <RemoveIcon fontSize="small" />
              </ListItemIcon>
              <ListItemText>Ignore</ListItemText>
            </MenuItem>
            {approaches.map((a) => (
              <MenuItem key={a.id} onClick={() => handleAddDetector(a.id)}>
                <ListItemIcon>
                  <AddCircleIcon fontSize="small" />
                </ListItemIcon>
                <ListItemText>
                  Add to {a.description || `Approach ${a.id}`}
                </ListItemText>
              </MenuItem>
            ))}
          </>
        )}
        {menuItem?.kind === 'NOT_FOUND_APP' && (
          <>
            <MenuItem onClick={() => setStatus(menuItem.id, 'ignored')}>
              <ListItemIcon>
                <RemoveIcon fontSize="small" />
              </ListItemIcon>
              <ListItemText>Ignore</ListItemText>
            </MenuItem>
            <MenuItem onClick={handleDelete}>
              <ListItemIcon>
                <DeleteIcon fontSize="small" />
              </ListItemIcon>
              <ListItemText>Delete Approach</ListItemText>
            </MenuItem>
          </>
        )}
        {menuItem?.kind === 'NOT_FOUND_DET' && (
          <>
            <MenuItem onClick={() => setStatus(menuItem.id, 'ignored')}>
              <ListItemIcon>
                <RemoveIcon fontSize="small" />
              </ListItemIcon>
              <ListItemText>Ignore</ListItemText>
            </MenuItem>
            <MenuItem onClick={handleDelete}>
              <ListItemIcon>
                <DeleteIcon fontSize="small" />
              </ListItemIcon>
              <ListItemText>Delete Detector</ListItemText>
            </MenuItem>
          </>
        )}
      </Menu>
    </Paper>
  )
}
