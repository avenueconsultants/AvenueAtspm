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
import DevicesWizardModal from '@/features/locations/components/LocationSetupWizard/DevicesWizardPanel.tsx/DevicesWizardPanel'
import { useLocationWizardStore } from '@/features/locations/components/LocationSetupWizard/locationSetupWizardStore'
import { useNotificationStore } from '@/stores/notifications'
import AddIcon from '@mui/icons-material/Add'
import LanIcon from '@mui/icons-material/Lan'
import { Avatar, Box, Button, Modal, Typography, useTheme } from '@mui/material'
import { useEffect, useMemo, useState } from 'react'

const deviceEventResultsMock = [
  {
    deviceId: 53356,
    ipaddress: '10.210.14.39',
    deviceType: 1,
    beforeWorkflowEventCount: 610165,
    afterWorkflowEventCount: 610365, // +200
    changeInEventCount: 200,
    ipModified: false,
  },
  {
    deviceId: 55091,
    ipaddress: '127.0.0.1',
    deviceType: 1,
    beforeWorkflowEventCount: 720111,
    afterWorkflowEventCount: 720321, // +210
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
  const { location } = useLocationStore()
  const { addNotification } = useNotificationStore()

  const { deviceVerificationStatus, setDeviceVerificationStatus } =
    useLocationWizardStore()

  const [isModalOpen, setModalOpen] = useState(false)
  const [currentDevice, setCurrentDevice] = useState<Device | null>(null)
  const [openDeleteModal, setOpenDeleteModal] = useState(false)
  const [deleteDeviceId, setDeleteDeviceId] = useState<string | null>(null)

  const [showSyncModal, setShowSyncModal] = useState(false)

  const [ipChanges, setIpChanges] = useState<Record<number, string>>({})

  const [mockEventData, setMockEventData] = useState<
    typeof deviceEventResultsMock | []
  >([])
  const [isFetchingEvents, setIsFetchingEvents] = useState(false)

  const {
    data: devicesData,
    refetch: refetchDevices,
    isFetching: isRefetchingDevices,
  } = useGetLocationDevicesFromKey(location?.id as number, {
    expand: 'DeviceConfiguration',
  })

  const devices = useMemo(() => devicesData?.value || [], [devicesData])

  const { data: deviceConfigurationsData } = useGetDeviceConfigurations()
  const { mutate: deleteDevice } = useDeleteDevice()
  const { mutateAsync: updateDevice } = usePatchDeviceFromKey()

  const deviceIdsString = devices.map((d) => d.id).join(',')
  const {
    data: deviceEventResults,
    refetch: fetchDeviceEventResults,
    isFetching: isEventDataLoading,
  } = useGetLoggingSyncNewLocationEvents(
    { deviceIds: deviceIdsString },
    { query: { enabled: false } }
  )

  // ------------------------------------------------
  // 1) If the wizard says "READY_TO_RUN", open modal & run check
  // ------------------------------------------------
  useEffect(() => {
    if (deviceVerificationStatus === 'READY_TO_RUN') {
      setShowSyncModal(true)
      handleResync()
    }
  }, [deviceVerificationStatus, setDeviceVerificationStatus])

  const handleResync = async () => {
    try {
      setIsFetchingEvents(true)
      setMockEventData([])

      await fetchDeviceEventResults()

      await new Promise<void>((resolve) => {
        setTimeout(() => {
          setMockEventData(deviceEventResultsMock)
          resolve()
        }, 1500)
      })
    } catch (err) {
      console.error('Failed to fetch device event data: ', err)
    } finally {
      setIsFetchingEvents(false)
    }
  }

  // ------------------------------------------------
  // 3) Combine device + event results
  // ------------------------------------------------
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

  const handleSaveAndClose = async () => {
    const entries = Object.entries(ipChanges)
    for (const [devIdStr, newIp] of entries) {
      const devId = Number(devIdStr)
      if (!devId || !newIp) continue

      try {
        await updateDevice({ key: devId, data: { ipaddress: newIp } })
        addNotification({
          title: `Device ${devId} updated successfully`,
          type: 'success',
        })
      } catch (err) {
        console.error('Failed to update device IP:', err)
      }
    }

    await refetchDevices()
    setIpChanges({})

    setShowSyncModal(false)
    setDeviceVerificationStatus('DONE')
  }

  const handleModalClose = () => {
    setShowSyncModal(false)
  }

  if (!deviceConfigurationsData?.value || !devicesData?.value) {
    return <Typography variant="h6">Loading...</Typography>
  }

  return (
    <>
      <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
        <Button
          startIcon={<LanIcon />}
          variant="contained"
          color="primary"
          onClick={() => {
            setShowSyncModal(true)
            handleResync()
          }}
        >
          Verify IP Addresses
        </Button>
      </Box>

      <DevicesWizardModal
        open={showSyncModal}
        onClose={handleModalClose}
        onSaveAndClose={handleSaveAndClose}
        devices={combinedDevices}
        onResync={handleResync}
        isResyncing={
          isEventDataLoading || isRefetchingDevices || isFetchingEvents
        }
        ipChanges={ipChanges}
        setIpChanges={setIpChanges}
      />

      <Box
        sx={{
          display: 'flex',
          overflowX: 'auto',
          flexWrap: 'nowrap',
          gap: '30px',
          mt: '10px',
        }}
      >
        {devices.map((device) => (
          <DeviceCard
            key={device.id}
            device={device}
            onEdit={(dev) => {
              setCurrentDevice(dev)
              setModalOpen(true)
            }}
            onDelete={() => {
              setDeleteDeviceId(device.id)
              setOpenDeleteModal(true)
            }}
          />
        ))}

        {/* Add Device card */}
        <Button
          onClick={() => {
            setCurrentDevice(null)
            setModalOpen(true)
          }}
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
          <Typography variant="h6" sx={{ mt: 2 }}>
            Add New Device
          </Typography>
        </Button>
      </Box>

      {/* Add/Edit Device Modal */}
      {isModalOpen && (
        <DeviceModal
          onClose={() => setModalOpen(false)}
          device={currentDevice}
          locationId={location?.id}
          refetchDevices={refetchDevices}
        />
      )}

      {/* Delete Confirmation Modal */}
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
              onClick={() => {
                if (deleteDeviceId) {
                  deleteDevice(deleteDeviceId, { onSuccess: refetchDevices })
                }
                setOpenDeleteModal(false)
              }}
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
