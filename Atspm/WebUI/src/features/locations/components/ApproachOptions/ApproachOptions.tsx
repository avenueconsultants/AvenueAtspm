import { useGetLocationSyncLocationFromKey } from '@/api/config/aTSPMConfigurationApi'
import { AddButton } from '@/components/addButton'
import ApproachesReconcilationReport from '@/features/locations/components/ApproachesReconcilationReport'
import { ConfigApproach } from '@/features/locations/components/editLocation/editLocationConfigHandler'
import { useLocationStore } from '@/features/locations/components/editLocation/locationStore'
import { useLocationWizardStore } from '@/features/locations/components/LocationSetupWizard/locationSetupWizardStore'
import SyncIcon from '@mui/icons-material/Sync'
import { LoadingButton } from '@mui/lab'
import { Box } from '@mui/material'
import { useCallback, useEffect, useMemo, useState } from 'react'

export interface LocationDiscrepancyReport {
  foundPhaseNumbers: number[]
  notFoundApproaches: ConfigApproach[]
  foundDetectorChannels: number[]
  notFoundDetectorChannels: string[]
}

const ApproachOptions = () => {
  // Pull approachVerificationStatus from store
  const {
    approachVerificationStatus,
    setApproachVerificationStatus,
    setBadApproaches,
    setBadDetectors,
  } = useLocationWizardStore()

  const { approaches, location, addApproach } = useLocationStore()
  const { mutateAsync, isLoading } = useGetLocationSyncLocationFromKey()

  const [categories, setCategories] = useState<LocationDiscrepancyReport>({
    foundPhaseNumbers: [],
    notFoundApproaches: [],
    foundDetectorChannels: [],
    notFoundDetectorChannels: [],
  })

  const currentPhaseNumbersUsed = useMemo(
    () =>
      approaches
        .flatMap((approach) => [
          approach.protectedPhaseNumber,
          approach.permissivePhaseNumber,
          approach.pedestrianPhaseNumber,
        ])
        .filter((phase) => phase != null),
    [approaches]
  )

  const currentDetectorChannelsUsed = useMemo(
    () =>
      approaches
        .flatMap((approach) =>
          approach.detectors.map((det) => det.detectorChannel)
        )
        .filter((chan) => chan != null),
    [approaches]
  )

  // The actual reconciliation logic
  const handleSyncLocation = useCallback(async () => {
    if (!location?.id) return

    try {
      const response = await mutateAsync({ key: location.id })

      // Identify removed approaches
      const notFoundApproaches =
        response?.removedApproachIds
          ?.map((id) => approaches.find((a) => a.id === id))
          .filter(Boolean) || []

      if (response?.removedApproachIds) {
        setBadApproaches(response.removedApproachIds)
      }
      if (response?.removedDetectors) {
        setBadDetectors(response.removedDetectors)
      }

      const foundPhaseNumbers: number[] = []

      if (response?.loggedButUnusedProtectedOrPermissivePhases) {
        foundPhaseNumbers.push(
          ...response.loggedButUnusedProtectedOrPermissivePhases
        )
      }
      if (response?.loggedButUnusedOverlapPhases) {
        foundPhaseNumbers.push(...response.loggedButUnusedOverlapPhases)
      }

      setCategories({
        foundPhaseNumbers,
        notFoundApproaches,
        foundDetectorChannels: response?.loggedButUnusedDetectorChannels || [],
        notFoundDetectorChannels: response?.removedDetectors || [],
      })
    } catch (error) {
      console.error(error)
    }
  }, [mutateAsync, location?.id, approaches, setBadApproaches, setBadDetectors])

  /**
   * If the wizard sets approachVerificationStatus = "READY_TO_RUN",
   * we auto-run the sync once, then mark approachVerificationStatus = "DONE".
   */
  useEffect(() => {
    if (approachVerificationStatus === 'READY_TO_RUN') {
      ;(async () => {
        await handleSyncLocation()
        setApproachVerificationStatus('DONE')
      })()
    }
  }, [
    approachVerificationStatus,
    handleSyncLocation,
    setApproachVerificationStatus,
  ])

  // If approachVerificationStatus === 'DONE', we've already run reconciliation
  const approachesSynced = approachVerificationStatus === 'DONE'

  return (
    <Box>
      {/* This "Sync" button is a manual way for user to re-run reconciliation */}
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
            await handleSyncLocation()
            setApproachVerificationStatus('DONE')
          }}
        >
          Reconcile Approaches
        </LoadingButton>
      </Box>

      {/* Show some reconciliation results */}
      <ApproachesReconcilationReport
        synced={approachesSynced}
        categories={categories}
        syncedPhases={currentPhaseNumbersUsed}
        syncedDetectors={currentDetectorChannelsUsed}
      />
    </Box>
  )
}

export default ApproachOptions
