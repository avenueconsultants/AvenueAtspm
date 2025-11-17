import { useGetLocationSyncLocationFromKey } from '@/api/config/aTSPMConfigurationApi'
import { AddButton } from '@/components/addButton'
import ApproachesReconcilationReport from '@/features/locations/components/ApproachesReconcilationReport/ApproachesReconcilationReport'
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
    setApproachVerificationStatus('DONE')
  }, [
    mutateAsync,
    location?.id,
    approaches,
    setBadApproaches,
    setBadDetectors,
    setApproachVerificationStatus,
  ])

  useEffect(() => {
    async function handleSyncLocationOnMount() {
      if (approachVerificationStatus === 'READY_TO_RUN') {
        await handleSyncLocation()
        setApproachVerificationStatus('DONE')
      }
    }
    handleSyncLocationOnMount()
  }, [
    approachVerificationStatus,
    handleSyncLocation,
    setApproachVerificationStatus,
  ])

  const approachesSynced = approachVerificationStatus === 'DONE'

  return (
    <Box>
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'flex-end',
          alignItems: 'center',
          mb: 1,
        }}
      >
        <AddButton
          label="New Approach"
          onClick={() => addApproach()}
          sx={{ mr: 1 }}
        />

        <LoadingButton
          startIcon={<SyncIcon />}
          loading={isLoading}
          loadingPosition="start"
          variant="contained"
          color="primary"
          onClick={handleSyncLocation}
        >
          Reconcile Approaches
        </LoadingButton>
      </Box>

      {approachesSynced && (
        <ApproachesReconcilationReport categories={categories} />
      )}
    </Box>
  )
}

export default ApproachOptions
