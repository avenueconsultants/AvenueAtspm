import AddIcon from '@mui/icons-material/Add'
import SyncIcon from '@mui/icons-material/Sync'
import { LoadingButton } from '@mui/lab'
import {
  Avatar,
  Box,
  Button,
  Collapse,
  Modal,
  Paper,
  Typography,
  useTheme,
} from '@mui/material'
import { useEffect, useMemo, useState } from 'react'

import {
  useGetLocationDevicesFromKey,
  usePatchDeviceFromKey,
} from '@/api/config/aTSPMConfigurationApi'
import { Device } from '@/api/config/aTSPMConfigurationApi.schemas'
import { useGetLoggingSyncNewLocationEvents } from '@/api/data/aTSPMLogDataApi'
import { useGetDeviceConfigurations } from '@/features/devices/api'
import { useDeleteDevice } from '@/features/devices/api/devices'
import DeviceCard from '@/features/locations/components/editLocation/DeviceCard'
import { useLocationStore } from '@/features/locations/components/editLocation/locationStore'
import DeviceModal from '@/features/locations/components/editLocation/NewDeviceModal'
import DevicesWizardPanel from '@/features/locations/components/LocationSetupWizard/DevicesWizardPanel.tsx/DevicesWizardPanel'
import { useLocationWizardStore } from '@/features/locations/components/LocationSetupWizard/locationSetupWizardStore'
import { useNotificationStore } from '@/stores/notifications'

const deviceEventResultsMock = [
  {
    deviceId: 53356,
    ipaddress: '10.210.14.39',
    deviceType: 1,
    beforeWorkflowEventCount: 610165,
    afterWorkflowEventCount: 610165,
    changeInEventCount: 200,
    ipModified: false,
  },
  {
    deviceId: 55091,
    ipaddress: '127.0.0.1',
    deviceType: 1,
    beforeWorkflowEventCount: 720111,
    afterWorkflowEventCount: 720111,
    changeInEventCount: 210,
    ipModified: false,
  },
]

interface CombinedDevice extends Device {
  changeInEventCount?: number
  ipModified?: boolean
}

const EditDevices = () => {
  const theme = useTheme()

  const { activeStep, deviceDownloadStatus, setDeviceDownloadStatus } =
    useLocationWizardStore()
  const { addNotification } = useNotificationStore()

  const { location } = useLocationStore()

  const [isModalOpen, setModalOpen] = useState(false)
  const [currentDevice, setCurrentDevice] = useState<Device | null>(null)
  const [openDeleteModal, setOpenDeleteModal] = useState(false)
  const [deleteDeviceId, setDeleteDeviceId] = useState<string | null>(null)

  const [showSyncPanel, setShowSyncPanel] = useState(false)

  const {
    data: devicesData,
    refetch: refetchDevices,
    isFetching: isResyncing,
  } = useGetLocationDevicesFromKey(location?.id as number, {
    expand: 'DeviceConfiguration',
  })
  const devices = useMemo(() => devicesData?.value || [], [devicesData])

  const { mutateAsync: updateDevice } = usePatchDeviceFromKey()

  const [ipChanges, setIpChanges] = useState<Record<number, string>>({})

  const { data: deviceConfigurationsData } = useGetDeviceConfigurations()
  const { mutate: deleteDevice } = useDeleteDevice()

  const deviceIdsString = devices.map((d) => d.id).join(',')
  const {
    data: deviceEventResults,
    refetch: fetchDeviceEventResults,
    isFetching: isEventDataLoading,
  } = useGetLoggingSyncNewLocationEvents(
    { deviceIds: deviceIdsString },
    {
      query: {
        enabled: !!deviceIdsString,
      },
    }
  )

  const [mockEventData, setMockEventData] = useState<
    typeof deviceEventResultsMock | []
  >([])

  const [isOverrideLoading, setIsOverrideLoading] = useState(false)

  useEffect(() => {
    if (deviceDownloadStatus === 'READY_TO_RUN' && deviceIdsString) {
      setIsOverrideLoading(true)
      fetchDeviceEventResults()
        .then(() => {
          // Wait 2s, then set the mock data
          return new Promise<void>((resolve) => {
            setTimeout(() => {
              setMockEventData(deviceEventResultsMock)
              resolve()
            }, 2000)
          })
        })
        .then(() => {
          setDeviceDownloadStatus('DONE')
          setIsOverrideLoading(false)
        })
        .catch((err) => {
          console.error('Failed to fetch device event data: ', err)
          setIsOverrideLoading(false)
        })
    }
  }, [
    deviceDownloadStatus,
    deviceIdsString,
    fetchDeviceEventResults,
    setDeviceDownloadStatus,
  ])

  useEffect(() => {
    if (activeStep === 1) {
      setShowSyncPanel(true)
    }
  }, [activeStep, setDeviceDownloadStatus])

  useEffect(() => {
    // the moment activeStep becomes 2, we’ve “clicked Next”
    // from the wizard perspective
    console.log('activeStep', activeStep)
    if (activeStep === 2) {
      console.log('Updating device IPs: ', ipChanges)
      Object.entries(ipChanges).forEach(([devIdStr, newIp]) => {
        console.log('Updating device IP: ', devIdStr, newIp)
        const devId = Number(devIdStr)
        if (!devId || !newIp) return
        // call your “update” device mutation
        updateDevice({ key: devId, data: { ipaddress: newIp } })
          .then(() => {
            // refetch the devices after updating
            refetchDevices()
            addNotification({
              title: `Device ${devId} updated successfully`,
              type: 'success',
            })
          })
          .catch((err) => {
            console.error('Failed to update device IP: ', err)
          })
      })

      // You might or might not want to reset state here
      setIpChanges({})
    }
  }, [activeStep, ipChanges, updateDevice, refetchDevices, addNotification])

  const combinedDevices: CombinedDevice[] = useMemo(() => {
    if (!devices.length) return []

    const finalEventData = mockEventData.length
      ? mockEventData
      : deviceEventResults?.value || []

    const allConfigs = deviceConfigurationsData?.value || []

    return devices.map((dev) => {
      const matchedEvents = finalEventData.find((e) => e.deviceId === dev.id)

      const matchedConfig = allConfigs.find(
        (cfg) => cfg.id === dev.deviceConfigurationId
      )

      return {
        ...dev,
        changeInEventCount: matchedEvents?.changeInEventCount,
        ipModified: matchedEvents?.ipModified,

        deviceConfiguration: matchedConfig,
      }
    })
  }, [devices, deviceEventResults, mockEventData, deviceConfigurationsData])

  if (!deviceConfigurationsData?.value || !devicesData?.value) {
    return <Typography variant="h6">Loading...</Typography>
  }

  const handleAddClick = () => {
    setCurrentDevice(null)
    setModalOpen(true)
  }

  const handleEditClick = (device: Device) => {
    setCurrentDevice(device)
    setModalOpen(true)
  }

  const handleDelete = (deviceId: string) => {
    setDeleteDeviceId(deviceId)
    setOpenDeleteModal(true)
  }

  const confirmDeleteDevice = () => {
    if (deleteDeviceId) {
      deleteDevice(deleteDeviceId, { onSuccess: refetchDevices })
    }
    setOpenDeleteModal(false)
  }

  const handlePageSync = () => {
    setShowSyncPanel((prev) => !prev)
    handleResync()
  }

  const handleResync = () => {
    setDeviceDownloadStatus('NOT_STARTED')
    setMockEventData([])
    setTimeout(() => {
      setDeviceDownloadStatus('READY_TO_RUN')
    }, 0)
  }

  const isLoadingCombined =
    isEventDataLoading || isResyncing || isOverrideLoading

  return (
    <>
      <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
        <LoadingButton
          startIcon={<SyncIcon />}
          loading={isLoadingCombined}
          loadingPosition="start"
          variant="contained"
          color="primary"
          onClick={handlePageSync}
        >
          Sync
        </LoadingButton>
      </Box>

      {/* “Wizard” / sync panel */}
      <Collapse in={showSyncPanel} timeout="auto" unmountOnExit>
        <Paper
          sx={{
            border: `1px solid ${theme.palette.divider}`,
            borderRadius: 1,
            p: 2,
            mb: 2,
            boxShadow: '0 0 15px rgba(0, 123, 255, 0.5)',
          }}
        >
          <DevicesWizardPanel
            devices={combinedDevices}
            onResync={handleResync}
            isResyncing={isLoadingCombined}
            setShowSyncPanel={setShowSyncPanel}
            ipChanges={ipChanges}
            setIpChanges={setIpChanges}
          />
        </Paper>
      </Collapse>

      {/* Device Cards */}
      <Box
        sx={{
          display: 'flex',
          overflowX: 'auto',
          flexWrap: 'nowrap',
          gap: '30px',
          marginTop: '10px',
        }}
      >
        {devices.map((device) => (
          <DeviceCard
            key={device.id}
            device={device}
            onEdit={handleEditClick}
            onDelete={() => handleDelete(device.id)}
          />
        ))}

        {/* Add New Device Button */}
        <Button
          onClick={handleAddClick}
          sx={{
            padding: 2,
            mb: 1.95,
            minWidth: '400px',
            minHeight: '400px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            border: `4px dashed ${theme.palette.primary.main}`,
          }}
        >
          <Avatar sx={{ bgcolor: theme.palette.primary.main, mb: 1 }}>
            <AddIcon />
          </Avatar>
          <Typography variant="h6" sx={{ marginTop: 2 }} component="p">
            Add New Device
          </Typography>
        </Button>
      </Box>

      {/* Device Edit Modal */}
      {isModalOpen && (
        <DeviceModal
          onClose={() => setModalOpen(false)}
          device={currentDevice}
          locationId={location?.id}
          refetchDevices={refetchDevices}
        />
      )}

      {/* Device Delete Confirmation Modal */}
      <Modal
        open={openDeleteModal}
        onClose={() => setOpenDeleteModal(false)}
        aria-labelledby="delete-confirmation"
        aria-describedby="confirm-delete-approach"
      >
        <Box
          sx={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: 400,
            bgcolor: 'background.paper',
            boxShadow: 24,
            p: 4,
          }}
        >
          <Typography id="delete-confirmation" sx={{ fontWeight: 'bold' }}>
            Confirm Delete
          </Typography>
          <Typography id="confirm-delete-approach" sx={{ mt: 2 }}>
            Are you sure you want to delete this device?
          </Typography>
          <Box sx={{ mt: 4, display: 'flex', justifyContent: 'flex-end' }}>
            <Button onClick={() => setOpenDeleteModal(false)} color="inherit">
              Cancel
            </Button>
            <Button
              onClick={confirmDeleteDevice}
              color="error"
              variant="contained"
            >
              Delete Device
            </Button>
          </Box>
        </Box>
      </Modal>
    </>
  )
}

export default EditDevices
