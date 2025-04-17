import DeleteModal from '@/components/AdminTable/DeleteModal'
import { LocationDiscrepancyReport } from '@/features/locations/components/ApproachOptions/ApproachOptions'
import { useLocationStore } from '@/features/locations/components/editLocation/locationStore'
import { useLocationWizardStore } from '@/features/locations/components/LocationSetupWizard/locationSetupWizardStore'
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

  const { badApproaches, badDetectors, setBadApproaches, setBadDetectors } =
    useLocationWizardStore()

  const { itemStatuses, updateStatus } = useDiscrepancyStatuses(
    categories,
    approaches
  )

  const [menuAnchor, setMenuAnchor] = useState<HTMLElement | null>(null)
  const [menuItem, setMenuItem] = useState<DiscrepancyItem | null>(null)

  const [deleteModalOpen, setDeleteModalOpen] = useState(false)
  const [deleteModalMode, setDeleteModalMode] = useState<'single' | 'all'>(
    'single'
  )
  const [pendingDeleteItem, setPendingDeleteItem] =
    useState<DiscrepancyItem | null>(null)

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
      updateStatus(item.id.toString(), 'unsaved')
    } catch (err) {
      console.error(err)
    }
  }

  const handleAddDetector = (approachId: number, item: DiscrepancyItem) => {
    const channel = parseInt(item.label.toString(), 10)
    try {
      addDetector(approachId, channel)
      updateStatus(item.id.toString(), 'unsaved')
    } catch (err) {
      console.error(err)
    }
  }

  const handleIgnore = (item: DiscrepancyItem) => {
    updateStatus(item.id.toString(), 'ignored')
    if (item.kind === 'NOT_FOUND_APP') {
      setBadApproaches(badApproaches.filter((a) => a !== item.id))
    } else if (item.kind === 'NOT_FOUND_DET') {
      setBadDetectors(
        badDetectors.filter((d) => d.detectorChannel !== item.label)
      )
    }
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
      try {
        categories.notFoundApproaches.forEach((approach) => {
          deleteApproach(approach)
          updateStatus(approach.id.toString(), 'deleted')
        })
        categories.notFoundDetectorChannels.forEach((det) => {
          const storeDetectors = approaches.flatMap((a) => a.detectors)
          const target = storeDetectors.find(
            (d) => d.detectorChannel?.toString() === det.toString()
          )
          if (target) {
            deleteDetector(target.id)
            updateStatus(target.id.toString(), 'deleted')
          }
        })
        addNotification({
          title: 'Deleted all discrepancy items',
          type: 'success',
        })
      } catch (err) {
        console.error(err)
        addNotification({
          title: 'Error deleting discrepancy items',
          type: 'error',
        })
      }
    } else if (pendingDeleteItem) {
      if (pendingDeleteItem.kind === 'NOT_FOUND_APP') {
        const approachId = parseInt(
          pendingDeleteItem.id.toString().replace('notfound_app_', ''),
          10
        )
        const target = approaches.find((a) => a.id === approachId)
        if (target) {
          try {
            deleteApproach(target)
            updateStatus(pendingDeleteItem.id.toString(), 'deleted')
            addNotification({
              title: `Deleted approach ${target.description}`,
              type: 'success',
            })
          } catch (err) {
            console.error(err)
            addNotification({
              title: `Error deleting approach ${target.description}`,
              type: 'error',
            })
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
            deleteDetector(target.id)
            updateStatus(pendingDeleteItem.id.toString(), 'deleted')
            addNotification({
              title: `Deleted detector ${target.detectorChannel}`,
              type: 'success',
            })
          } catch (err) {
            console.error(err)
            addNotification({
              title: `Error deleting detector ${target.detectorChannel}`,
              type: 'error',
            })
          }
        }
      }
    }
    setDeleteModalOpen(false)
  }

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

  return (
    <Paper sx={{ p: 2, my: 2 }}>
      <Box
        display="flex"
        justifyContent="space-between"
        alignItems="center"
        sx={{ cursor: 'pointer' }}
        onClick={toggle}
      >
        <Typography variant="h4">Approaches Reconciliation Report</Typography>
        {open ? <ExpandLessIcon /> : <ExpandMoreIcon />}
      </Box>

      <Collapse in={open}>
        <Divider sx={{ my: 2 }} />
        <Typography variant="h4" sx={{ mb: 1 }} fontWeight="bold">
          Found
        </Typography>
        <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
          Data was found for the following unconfigured items
        </Typography>
        <Paper
          variant="outlined"
          sx={{ p: 2, mb: 2, backgroundColor: theme.palette.grey[50] }}
        >
          <DiscrepancyRow
            title="Phases"
            items={foundPhases}
            itemStatuses={itemStatuses}
            onButtonClick={(item, e) => openMenu(e, item)}
          />
        </Paper>

        <Paper
          variant="outlined"
          sx={{ p: 2, backgroundColor: theme.palette.grey[50] }}
        >
          {/* <Divider sx={{ my: 2 }} /> */}
          <DiscrepancyRow
            title="Detector Channels"
            items={foundDetectors}
            itemStatuses={itemStatuses}
            onButtonClick={(item, e) => openMenu(e, item)}
          />
        </Paper>
        <Divider sx={{ my: 2 }} />

        <Box display={'flex'}>
          <Box>
            <Box display="flex" alignItems="center" sx={{ mb: 1 }}>
              <Typography variant="h4" fontWeight="bold">
                Not Found
              </Typography>
              {notFoundApproaches.length > 0 || notFoundDetectors.length > 0 ? (
                <Button
                  variant="outlined"
                  color="error"
                  size="small"
                  onClick={() => openDeleteDialog('all')}
                  sx={{ height: 24, ml: 1 }}
                >
                  Delete All
                </Button>
              ) : null}
            </Box>
            <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
              No data was found for the following configured items
            </Typography>
          </Box>
        </Box>
        <Paper
          variant="outlined"
          sx={{ p: 2, mb: 2, backgroundColor: theme.palette.grey[50] }}
        >
          <DiscrepancyRow
            title="Approaches/Phases"
            items={notFoundApproaches}
            itemStatuses={itemStatuses}
            onButtonClick={(item, e) => openMenu(e, item)}
          />
        </Paper>
        <Paper
          variant="outlined"
          sx={{ p: 2, backgroundColor: theme.palette.grey[50] }}
        >
          <DiscrepancyRow
            title="Detectors"
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
            ? 'All Discrepancy Items'
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
            ? { id: 0, name: 'All Discrepancy Items' }
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
