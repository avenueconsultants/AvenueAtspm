import { useGetLocationSyncLocationFromKey } from '@/api/config/aTSPMConfigurationApi'
import { AddButton } from '@/components/addButton'
import ApproachesInfo from '@/features/locations/components/ApproachesInfo/approachesInfo'
import ApproachesReconcilationReport from '@/features/locations/components/ApproachesReconcilationReport/ApproachesReconcilationReport'
import { NavigationProvider } from '@/features/locations/components/Cell/CellNavigation'
import DetectorsInfo from '@/features/locations/components/DetectorsInfo/detectorsInfo'
import EditApproach from '@/features/locations/components/editApproach/EditApproach'
import { ConfigApproach } from '@/features/locations/components/editLocation/editLocationConfigHandler'
import { useLocationStore } from '@/features/locations/components/editLocation/locationStore'
import { useLocationWizardStore } from '@/features/locations/components/LocationSetupWizard/locationSetupWizardStore'
import SyncIcon from '@mui/icons-material/Sync'
import { LoadingButton } from '@mui/lab'
import { Box, Button, Divider, Paper, Typography } from '@mui/material'
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

  const [showSummary, setShowSummary] = useState(false)
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

  const combinedLocation = { ...location, approaches }

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

        <Button
          variant="outlined"
          onClick={() => setShowSummary((prev) => !prev)}
        >
          {showSummary ? 'Hide Summary' : 'Summary'}
        </Button>

        <LoadingButton
          startIcon={<SyncIcon />}
          loading={isLoading}
          loadingPosition="start"
          variant="outlined"
          onClick={handleSyncLocation}
          sx={{ ml: 1 }}
        >
          Reconcile Approaches
        </LoadingButton>
      </Box>

      {approachesSynced && (
        <ApproachesReconcilationReport categories={categories} />
      )}
      {showSummary && (
        <Paper sx={{ mb: 2 }}>
          <Typography variant="h6" sx={{ p: 2, fontWeight: 'bold' }}>
            Approaches
          </Typography>
          <Divider sx={{ m: 1 }} />
          <ApproachesInfo location={combinedLocation} />
          <Typography variant="h6" sx={{ p: 2, fontWeight: 'bold' }}>
            Detectors
          </Typography>
          <Divider sx={{ m: 1 }} />
          <DetectorsInfo location={combinedLocation} />
        </Paper>
      )}

      {approaches.length > 0 ? (
        <NavigationProvider>
          {approaches.map((approach) => (
            <EditApproach key={approach.id} approach={approach} />
          ))}
        </NavigationProvider>
      ) : (
        <Box sx={{ p: 2, mt: 2, textAlign: 'center' }}>
          <Typography variant="caption" fontStyle="italic">
            No approaches found
          </Typography>
        </Box>
      )}
    </Box>
  )
}

export default ApproachOptions
