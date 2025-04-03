import { Device } from '@/api/config/aTSPMConfigurationApi.schemas'
import { DeviceEventDownload } from '@/api/data/aTSPMLogDataApi.schemas'
import CheckIcon from '@mui/icons-material/Check'
import CloseIcon from '@mui/icons-material/Close'
import ExpandLessIcon from '@mui/icons-material/ExpandLess'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import SyncIcon from '@mui/icons-material/Sync'
import { LoadingButton } from '@mui/lab'
import {
  Badge,
  Box,
  Button,
  Collapse,
  IconButton,
  TextField,
  Typography,
} from '@mui/material'
import { useState } from 'react'

type CombinedDeviceEvent = Device &
  DeviceEventDownload & {
    ipModified: boolean
  }

interface DevicesWizardPanelProps {
  devices: CombinedDeviceEvent[] | undefined
  onResync: () => void
  isResyncing: boolean
  setShowSyncPanel: (show: boolean) => void
  ipChanges: Record<number, string>
  setIpChanges: React.Dispatch<React.SetStateAction<Record<number, string>>>
}

// Function to get the device name
const getDeviceName = (device: Device) => {
  let deviceName = ''
  if (device?.deviceConfiguration?.product) {
    deviceName +=
      device.deviceConfiguration.product?.manufacturer +
      ' - ' +
      device.deviceConfiguration.product?.model +
      ' '
  }
  deviceName += device?.firmware ? device?.firmware : ''

  return deviceName
}

const DevicesWizardPanel = ({
  devices,
  onResync,
  isResyncing,
  setShowSyncPanel,
  ipChanges,
  setIpChanges,
}: DevicesWizardPanelProps) => {
  const [isExpanded, setIsExpanded] = useState(true)

  const handleIpChange = (deviceId: number, newIp: string) => {
    setIpChanges((prev) => ({ ...prev, [deviceId]: newIp }))
  }

  return (
    <>
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          cursor: 'pointer',
          mb: 2,
        }}
        onClick={() => setIsExpanded((prev) => !prev)}
      >
        <Typography variant="h5">Configure Devices</Typography>
        <IconButton>
          {isExpanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
        </IconButton>
      </Box>

      <Collapse in={isExpanded}>
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            p: 2,
          }}
        >
          <Typography sx={{ flex: 3 }} variant="subtitle2">
            Device Name
          </Typography>
          <Typography sx={{ flex: 2, width: '200px' }} variant="subtitle2">
            IP Address
          </Typography>
          <Typography
            sx={{
              flex: 1,
              textAlign: 'right',
              width: '250px',
              whiteSpace: 'nowrap',
            }}
            variant="subtitle2"
          >
            Rows Downloaded
          </Typography>
          <Typography sx={{ flex: 2, textAlign: 'center' }} variant="subtitle2">
            Status
          </Typography>
        </Box>

        {/* Rows */}
        {devices?.map((device, i) => {
          const newIp = ipChanges[device.id] ?? device.ipaddress
          return (
            <Box
              key={i}
              sx={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                p: 2,
                mb: 2,
                border: '1px solid #ccc',
                borderRadius: '4px',
              }}
            >
              {/* Device Name */}
              <Typography sx={{ flex: 3 }}>{getDeviceName(device)}</Typography>
              {/* IP Address */}
              <Badge
                color="error"
                variant="dot"
                // Show the badge if there's a difference from the original IP
                invisible={device.ipaddress === newIp}
              >
                <TextField
                  label="IP Address"
                  size="small"
                  value={newIp}
                  onChange={(e) => handleIpChange(device.id, e.target.value)}
                />
              </Badge>
              {/* Rows Downloaded */}
              <Typography sx={{ flex: 1, textAlign: 'right', width: '250px' }}>
                {isResyncing
                  ? ''
                  : (device.changeInEventCount?.toLocaleString() ?? 'N/A')}
              </Typography>
              {/* Status */}
              <Box
                sx={{
                  flex: 2,
                  textAlign: 'center',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {isResyncing ? (
                  <Typography variant="body2" sx={{ ml: 1, display: 'inline' }}>
                    Loading...
                  </Typography>
                ) : device?.changeInEventCount &&
                  device.changeInEventCount > 1 ? (
                  <>
                    <CheckIcon color="success" />
                    <Typography
                      variant="body2"
                      sx={{ ml: 1, display: 'inline' }}
                    >
                      Download successful
                    </Typography>
                  </>
                ) : (
                  <>
                    <CloseIcon color="error" />
                    <Typography
                      variant="body2"
                      sx={{ ml: 1, display: 'inline' }}
                    >
                      No data downloaded
                    </Typography>
                  </>
                )}
              </Box>
            </Box>
          )
        })}

        {/* Resync Button */}
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2 }}>
          <LoadingButton
            loading={isResyncing}
            loadingPosition="start"
            startIcon={<SyncIcon />}
            variant="text"
            color="primary"
            onClick={onResync}
          >
            Re-Sync
          </LoadingButton>
        </Box>
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2 }}>
          <Button variant="outlined" onClick={() => setShowSyncPanel(false)}>
            Close
          </Button>
        </Box>
      </Collapse>
    </>
  )
}

export default DevicesWizardPanel
