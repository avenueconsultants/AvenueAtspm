import DeleteModal from '@/components/AdminTable/DeleteModal'
import { LocationDiscrepancyReport } from '@/features/locations/components/ApproachOptions/ApproachOptions'
import { useLocationStore } from '@/features/locations/components/editLocation/locationStore'
import { useNotificationStore } from '@/stores/notifications'
import ExpandLessIcon from '@mui/icons-material/ExpandLess'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import {
  Box,
  Button,
  Collapse,
  Divider,
  Paper,
  Typography,
  useTheme,
} from '@mui/material'
import React, { useState } from 'react'
import DiscrepancyMenu from './DiscrepancyMenu'
import DiscrepancyRow, { DiscrepancyItem } from './DiscrepancyRow'
import useDiscrepancyStatuses from './useDiscrepancyStatuses'

interface ApproachesReconcilationReportProps {
  synced: boolean
  categories: LocationDiscrepancyReport
  syncedPhases: number[]
  syncedDetectors: number[]
}

export default function ApproachesReconcilationReport({
  synced,
  categories,
}: ApproachesReconcilationReportProps) {
  const theme = useTheme()
  const { addNotification } = useNotificationStore()
  const {
    approaches,
    deleteApproach,
    deleteDetector,
    addApproach,
    addDetector,
  } = useLocationStore()

  // Use the custom hook to compute statuses and expose updateStatus.
  const { itemStatuses, updateStatus } = useDiscrepancyStatuses(
    categories,
    approaches
  )

  // State for our context menu (shown on individual items)
  const [menuAnchor, setMenuAnchor] = useState<HTMLElement | null>(null)
  const [menuItem, setMenuItem] = useState<DiscrepancyItem | null>(null)

  // State for delete confirmation modal.
  const [deleteModalOpen, setDeleteModalOpen] = useState(false)
  const [deleteModalMode, setDeleteModalMode] = useState<'single' | 'all'>(
    'single'
  )
  const [pendingDeleteItem, setPendingDeleteItem] =
    useState<DiscrepancyItem | null>(null)

  // Toggle open/closed state for the report.
  const [open, setOpen] = useState(true)

  if (!synced) return null

  const toggle = () => setOpen(!open)

  const closeMenu = () => {
    setMenuAnchor(null)
    setMenuItem(null)
  }

  const openMenu = (
    e: React.MouseEvent<HTMLButtonElement>,
    item: DiscrepancyItem
  ) => {
    e.stopPropagation()
    setMenuAnchor(e.currentTarget)
    setMenuItem(item)
  }

  const handleAddApproach = (item: DiscrepancyItem) => {
    const phase = parseInt(item.label.toString(), 10)
    try {
      addApproach(phase)
      updateStatus(item.id.toString(), 'added')
    } catch (err) {
      console.error(err)
    }
  }

  const handleAddDetector = (approachId: number, item: DiscrepancyItem) => {
    const channel = parseInt(item.label.toString(), 10)
    try {
      addDetector(approachId, channel)
      updateStatus(item.id.toString(), 'added')
    } catch (err) {
      console.error(err)
    }
  }

  const handleIgnore = (item: DiscrepancyItem) => {
    updateStatus(item.id.toString(), 'ignored')
  }

  const handleDelete = (item: DiscrepancyItem) => {
    openDeleteDialog('single', item)
  }

  const openDeleteDialog = (mode: 'single' | 'all', item?: DiscrepancyItem) => {
    setDeleteModalMode(mode)
    setPendingDeleteItem(item || null)
    setDeleteModalOpen(true)
    closeMenu()
  }

  const confirmDelete = async () => {
    if (deleteModalMode === 'all') {
      // Bulk deletion for unmatched items.
      categories.notFoundApproaches.forEach((approach) => {
        deleteApproach(approach)
      })
      categories.notFoundDetectorChannels.forEach((det) => {
        const storeDetectors = approaches.flatMap((a) => a.detectors)
        const target = storeDetectors.find(
          (d) => d.detectorChannel?.toString() === det.toString()
        )
        if (target) {
          deleteDetector(target.id)
        }
      })
      addNotification({
        title: 'Deleted all unmatched configured items',
        type: 'success',
      })
    } else if (pendingDeleteItem) {
      // Single deletion: check the kind of item and delete accordingly.
      if (pendingDeleteItem.kind === 'NOT_FOUND_APP') {
        const approachId = parseInt(
          pendingDeleteItem.id.toString().replace('notfound_app_', ''),
          10
        )
        const target = approaches.find((a) => a.id === approachId)
        if (target) {
          try {
            await deleteApproach(target)
            updateStatus(pendingDeleteItem.id.toString(), 'deleted')
          } catch (err) {
            console.error(err)
          }
        }
      } else if (pendingDeleteItem.kind === 'NOT_FOUND_DET') {
        const channel = pendingDeleteItem.label.toString()
        const storeDetectors = approaches.flatMap((a) => a.detectors)
        const target = storeDetectors.find(
          (d) => d.detectorChannel?.toString() === channel
        )
        if (target) {
          try {
            await deleteDetector(target.id)
            updateStatus(pendingDeleteItem.id.toString(), 'deleted')
          } catch (err) {
            console.error(err)
          }
        }
      }
    }
    setDeleteModalOpen(false)
  }

  // --- Build Items for Each Section ---

  const foundPhases: DiscrepancyItem[] = categories.foundPhaseNumbers.map(
    (phase) => ({
      kind: 'FOUND_PHASE',
      id: phase,
      label: phase,
    })
  )

  const foundDetectors: DiscrepancyItem[] =
    categories.foundDetectorChannels.map((det) => ({
      kind: 'FOUND_DET',
      id: det,
      label: det,
    }))

  const notFoundApproaches: DiscrepancyItem[] =
    categories.notFoundApproaches.map((approach) => ({
      kind: 'NOT_FOUND_APP',
      id: approach?.id || `unknown_approach`,
      label: approach.description || `${approach.id}`,
    }))

  const notFoundDetectors: DiscrepancyItem[] =
    categories.notFoundDetectorChannels.map((det) => ({
      kind: 'NOT_FOUND_DET',
      id: det,
      label: det,
    }))

  // --- Rendering ---
  return (
    <Paper sx={{ p: 2, my: 2 }}>
      {/* Report Title */}
      <Box
        display="flex"
        justifyContent="space-between"
        alignItems="center"
        sx={{ cursor: 'pointer' }}
        onClick={toggle}
      >
        <Typography variant="h5" fontWeight="bold">
          Approaches Reconciliation Report
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
          <Typography variant="subtitle1" fontWeight="bold">
            Items Present in the Logs but not Configured
          </Typography>
          <Typography variant="caption">
            These items are present in the logs but not configured. You can
            ignore them or add them.
          </Typography>
          <DiscrepancyRow
            title="Phases Without Approaches"
            items={foundPhases}
            itemStatuses={itemStatuses}
            onButtonClick={(item, e) => openMenu(e, item)}
          />
          <Divider sx={{ my: 2 }} />
          <DiscrepancyRow
            title="Detector Channels Without Detectors"
            items={foundDetectors}
            itemStatuses={itemStatuses}
            onButtonClick={(item, e) => openMenu(e, item)}
          />
        </Paper>

        <Paper
          variant="outlined"
          sx={{
            mt: 2,
            p: 2,
            backgroundColor: theme.palette.background.default,
          }}
        >
          <Box display="flex" justifyContent="space-between" mb={2}>
            <Typography variant="subtitle1" fontWeight="bold" sx={{ mb: 2 }}>
              Items Configured but not Present in the Logs
            </Typography>
            <Button
              variant="outlined"
              color="error"
              size="small"
              onClick={() => openDeleteDialog('all')}
              sx={{ height: 32 }}
            >
              Delete All
            </Button>
          </Box>
          <DiscrepancyRow
            title="Configured Approaches with No Data"
            items={notFoundApproaches}
            itemStatuses={itemStatuses}
            onButtonClick={(item, e) => openMenu(e, item)}
          />
          <Divider sx={{ my: 2 }} />
          <DiscrepancyRow
            title="Configured Detectors with No Data"
            items={notFoundDetectors}
            itemStatuses={itemStatuses}
            onButtonClick={(item, e) => openMenu(e, item)}
          />
        </Paper>
      </Collapse>

      <DiscrepancyMenu
        anchorEl={menuAnchor}
        menuItem={menuItem}
        onClose={closeMenu}
        onIgnore={handleIgnore}
        onAddApproach={handleAddApproach}
        onAddDetector={handleAddDetector}
        onDelete={handleDelete}
        approaches={approaches}
      />

      <DeleteModal
        id={
          deleteModalMode === 'all'
            ? 0
            : pendingDeleteItem
              ? Number(pendingDeleteItem.id)
              : 0
        }
        name={
          deleteModalMode === 'all'
            ? 'All Unmatched Items'
            : pendingDeleteItem?.label.toString() || ''
        }
        objectType={
          deleteModalMode === 'all'
            ? 'Items'
            : pendingDeleteItem?.kind === 'NOT_FOUND_APP'
              ? 'Approach'
              : 'Detector'
        }
        open={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        onConfirm={confirmDelete}
        selectedRow={
          deleteModalMode === 'all'
            ? { id: 0, name: 'All Unmatched Items' }
            : pendingDeleteItem
        }
        associatedObjects={
          deleteModalMode === 'all'
            ? [
                ...notFoundApproaches.map((item) => ({
                  id: typeof item.id === 'number' ? item.id : Number(item.id),
                  name: `Approach: ${item.label}`,
                })),
                ...notFoundDetectors.map((item) => ({
                  id: typeof item.id === 'number' ? item.id : Number(item.id),
                  name: `Detector: ${item.label}`,
                })),
              ]
            : []
        }
        associatedObjectsLabel="Unmatched Configured Items"
      />
    </Paper>
  )
}
