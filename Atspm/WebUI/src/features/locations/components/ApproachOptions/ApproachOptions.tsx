import { useGetLocationSyncLocationFromKey } from '@/api/config/aTSPMConfigurationApi'
import { AddButton } from '@/components/addButton'
import ApproachesReconcilationReport from '@/features/locations/components/ApproachesReconcilationReport'
import { useLocationStore } from '@/features/locations/components/editLocation/locationStore'
import { useLocationWizardStore } from '@/features/locations/components/LocationSetupWizard/locationSetupWizardStore'
import SyncIcon from '@mui/icons-material/Sync'
import { LoadingButton } from '@mui/lab'
import { Box } from '@mui/material'
import { useCallback, useEffect, useMemo, useState } from 'react'

const ApproachOptions = () => {
  // Pull wizard store items
  const {
    approachSyncStatus, // 'NOT_STARTED' | 'READY_TO_RUN' | 'DONE'
    setApproachSyncStatus,
    setBadApproaches,
    setBadDetectors,
  } = useLocationWizardStore()

  // Grab approaches and location from your local location store
  const { approaches, location, addApproach } = useLocationStore()

  // API for syncing location → logs/reports
  const { mutateAsync, isLoading } = useGetLocationSyncLocationFromKey()

  // Local state to hold various categories from the sync result
  const [categories, setCategories] = useState({
    foundPhases: [] as string[],
    foundDetectors: [] as string[],
    notFoundApproaches: [] as string[],
    notFoundDetectors: [] as string[],
  })

  // For display, gather all phases in the store (already “synced” locally)
  const syncedPhases = useMemo(
    () =>
      approaches.flatMap((approach) => [
        approach.protectedPhaseNumber,
        approach.permissivePhaseNumber,
        approach.pedestrianPhaseNumber,
      ]),
    [approaches]
  )

  // For display, gather all detector channels in the store (already “synced” locally)
  const syncedDetectors = useMemo(
    () =>
      approaches.flatMap((approach) =>
        approach.detectors.map((det) => det.detectorChannel)
      ),
    [approaches]
  )

  /**
   * Called whenever we explicitly sync from the server.
   * On success, we store "bad approaches/detectors" in the wizard store
   * and also capture the found/not-found categories for the UI.
   */
  const handleSyncLocation = useCallback(async () => {
    try {
      const response = await mutateAsync({
        key: parseInt(location.id, 10),
      })

      // Build a list of approach descriptions that got removed
      const notFoundApproaches = response.removedApproachIds.map(
        (id: number) => {
          const approach = approaches.find((a: any) => a.id === id)
          return approach
            ? approach.description
            : `Unknown Approach (ID: ${id})`
        }
      )

      // Store “bad” approach/detector IDs in Zustand
      setBadApproaches(response.removedApproachIds)
      setBadDetectors(response.removedDetectors)

      // For the UI, store categorization
      setCategories({
        foundPhases: [
          ...response.loggedButUnusedProtectedOrPermissivePhases,
          ...response.loggedButUnusedOverlapPhases,
        ],
        foundDetectors: response.loggedButUnusedDetectorChannels,
        notFoundApproaches,
        notFoundDetectors: response.removedDetectors,
      })
    } catch (error) {
      console.error(error)
    }
  }, [
    mutateAsync,
    location.id,
    approaches,
    setBadApproaches,
    setBadDetectors,
    setCategories,
  ])

  /**
   * If the wizard store sets approachSyncStatus = "READY_TO_RUN",
   * we auto-run the sync once, then mark approachSyncStatus = "DONE".
   */
  useEffect(() => {
    if (approachSyncStatus === 'READY_TO_RUN') {
      ;(async () => {
        await handleSyncLocation()
        setApproachSyncStatus('DONE')
      })()
    }
  }, [approachSyncStatus, handleSyncLocation, setApproachSyncStatus])

  // Are we “synced” yet? (used by ApproachesReconcilationReport)
  const approachesSynced = approachSyncStatus === 'DONE'

  return (
    <Box>
      {/* Top bar: "Add Approach" + "Sync" button */}
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'flex-end',
          alignItems: 'center',
          mb: 1,
        }}
      >
        <AddButton label="New Approach" onClick={addApproach} sx={{ mr: 1 }} />
        <LoadingButton
          startIcon={<SyncIcon />}
          loading={isLoading}
          loadingPosition="start"
          variant="contained"
          color="primary"
          onClick={async () => {
            // Manual re-sync
            await handleSyncLocation()
            setApproachSyncStatus('DONE')
          }}
        >
          Sync
        </LoadingButton>
      </Box>

      {/* 
        Show a summary of how approaches/detectors from the server 
        match up with the store, using the categories we set
      */}
      <ApproachesReconcilationReport
        synced={approachesSynced}
        categories={categories}
        syncedPhases={syncedPhases}
        syncedDetectors={syncedDetectors}
      />
    </Box>
  )
}

export default ApproachOptions
