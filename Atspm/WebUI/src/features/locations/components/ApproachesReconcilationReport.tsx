import { LocationDiscrepancyReport } from '@/features/locations/components/ApproachOptions/ApproachOptions'
import { useLocationStore } from '@/features/locations/components/editLocation/locationStore'
import AddCircleIcon from '@mui/icons-material/AddCircle'
import DeleteIcon from '@mui/icons-material/Delete'
import ExpandLessIcon from '@mui/icons-material/ExpandLess'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import RemoveIcon from '@mui/icons-material/Remove'
import {
  Box,
  Button,
  Collapse,
  Divider,
  ListItemIcon,
  ListItemText,
  Menu,
  MenuItem,
  Paper,
  Stack,
  Tooltip,
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

// Note: We've added a new status "unsaved" to distinguish items that are added but still new.
type ItemStatus = 'pending' | 'ignored' | 'added' | 'deleted' | 'unsaved'
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

  // ---------------------------
  // For items configured but not found:
  // If an approach/detector is missing manually, mark it as deleted.
  // ---------------------------
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

  // ---------------------------
  // For items found in data (but missing from configuration):
  // If a matching item exists in the store, check for the isNew property.
  // For approaches, we compare the protectedPhaseNumber.
  // For detectors, we compare the detectorChannel.
  //
  // If a matching item is present and does NOT have isNew, mark it as "added"
  // (thus removing it from the report). If it is marked as isNew, set status to "unsaved"
  // so it remains but is visually highlighted.
  // ---------------------------
  useEffect(() => {
    categories.foundPhaseNumbers.forEach((phase) => {
      const key = `found_phase_${phase}`
      const matchingApproaches = approaches.filter(
        (a) => a.protectedPhaseNumber == phase
      )
      if (matchingApproaches.length > 0) {
        const existsNonNew = matchingApproaches.some((a) => !a.isNew)
        if (existsNonNew && (itemStatuses[key] || 'pending') === 'pending') {
          setItemStatuses((prev) => ({ ...prev, [key]: 'added' }))
        } else if (
          !existsNonNew &&
          (itemStatuses[key] || 'pending') === 'pending'
        ) {
          setItemStatuses((prev) => ({ ...prev, [key]: 'unsaved' }))
        }
      }
    })
  }, [approaches, categories.foundPhaseNumbers, itemStatuses])

  useEffect(() => {
    categories.foundDetectorChannels.forEach((det) => {
      const key = `found_det_${det}`
      const matchingDetectors = approaches
        .flatMap((a) => a.detectors)
        .filter((d) => d.detectorChannel == det)
      if (matchingDetectors.length > 0) {
        const existsNonNew = matchingDetectors.some((d) => !d.isNew)
        if (existsNonNew && (itemStatuses[key] || 'pending') === 'pending') {
          setItemStatuses((prev) => ({ ...prev, [key]: 'added' }))
        } else if (
          !existsNonNew &&
          (itemStatuses[key] || 'pending') === 'pending'
        ) {
          setItemStatuses((prev) => ({ ...prev, [key]: 'unsaved' }))
        }
      }
    })
  }, [approaches, categories.foundDetectorChannels, itemStatuses])

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
      addApproach(phase)
      // The effect above will check for isNew and update status accordingly.
      setStatus(menuItem.id, 'added')
    } catch (err) {
      console.error(err)
    }
  }

  async function handleAddDetector(approachId: number) {
    if (!menuItem) return
    const channel = parseInt(menuItem.label, 10)
    try {
      await addDetector(approachId, channel)
      setStatus(menuItem.id, 'added')
    } catch (err) {
      console.error(err)
    }
  }

  // ---------------------------
  // renderButton: For items with status "unsaved", wrap the button in a tooltip
  // and style it with a contained, green button. For pending items, render the
  // normal outlined button.
  // ---------------------------
  function renderButton(item: DiscrepancyItem) {
    const status = itemStatuses[item.id] || 'pending'
    if (status === 'unsaved') {
      return (
        <Tooltip
          key={item.id}
          title="Detected but unsaved. We see it, but it is not yet finalized."
        >
          <Button
            variant="contained"
            color="success"
            onClick={(e) => openMenu(e, item)}
            size="small"
            sx={{ margin: 1 }}
            disableElevation
          >
            {item.label}
          </Button>
        </Tooltip>
      )
    }
    // For pending items, render the default outlined button.
    return (
      <Button
        key={item.id}
        variant="outlined"
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

  // ---------------------------
  // row: Only show items with status pending or unsaved.
  // If no items remain, show an "In Sync" message.
  // ---------------------------
  function row(title: string, items: DiscrepancyItem[]) {
    const displayItems = items.filter((item) => {
      const status = itemStatuses[item.id] || 'pending'
      return status === 'pending' || status === 'unsaved'
    })
    if (!displayItems.length) {
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
          {displayItems.map(renderButton)}
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
    <Paper sx={{ p: 2, my: 2 }}>
      <Box
        display="flex"
        justifyContent="space-between"
        alignItems="center"
        sx={{ cursor: 'pointer' }}
        onClick={toggle}
      >
        <Typography variant="h5" fontWeight="bold">
          Approaches Validation Report
        </Typography>
        {open ? <ExpandLessIcon /> : <ExpandMoreIcon />}
      </Box>
      <Collapse in={open}>
        <Paper
          variant="outlined"
          sx={{
            mt: 2,
            p: 2,
            backgroundColor: theme.palette.background.default,
          }}
        >
          <Typography variant="subtitle1" fontWeight="bold" sx={{ mb: 2 }}>
            Found in Data, Missing from Configuration
          </Typography>
          {row('Phases Without Approaches', foundPhases)}
          <Divider sx={{ my: 2 }} />
          {row('Detector Channels Without Detectors', foundDetectors)}
        </Paper>
        <Paper
          variant="outlined"
          sx={{
            mt: 2,
            p: 2,
            backgroundColor: theme.palette.background.default,
          }}
        >
          <Typography variant="subtitle1" fontWeight="bold" sx={{ mb: 2 }}>
            Configured, Missing in Data
          </Typography>
          {row('Configured Approaches with No Data', notFoundApproaches)}
          <Divider sx={{ my: 2 }} />
          {row('Configured Detectors with No Data', notFoundDetectors)}
        </Paper>
      </Collapse>
      <Menu
        anchorEl={menuAnchor}
        open={Boolean(menuAnchor)}
        onClose={closeMenu}
      >
        {menuItem?.kind === 'FOUND_PHASE' && (
          <Box>
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
          </Box>
        )}
        {menuItem?.kind === 'FOUND_DET' && (
          <Box>
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
          </Box>
        )}
        {menuItem?.kind === 'NOT_FOUND_APP' && (
          <Box>
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
          </Box>
        )}
        {menuItem?.kind === 'NOT_FOUND_DET' && (
          <Box>
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
          </Box>
        )}
      </Menu>
    </Paper>
  )
}
