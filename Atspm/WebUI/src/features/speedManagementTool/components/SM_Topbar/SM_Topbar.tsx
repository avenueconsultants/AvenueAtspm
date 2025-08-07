import AnalysisPeriodOptionsPopup from '@/features/speedManagementTool/components/SM_Topbar/AnalysisPeriodOptionsPopup'
import DateRangeOptionsPopup from '@/features/speedManagementTool/components/SM_Topbar/DateRangeOptionsPopup'
import FiltersButton from '@/features/speedManagementTool/components/SM_Topbar/Filters'
import useSpeedManagementStore from '@/features/speedManagementTool/speedManagementStore'
import { LoadingButton } from '@mui/lab'
import { Alert, Autocomplete, Box, Divider, TextField } from '@mui/material'
import DaysOfWeekOptionsPopup from './DaysOfWeekOptionsPopup'
import GeneralOptionsPopup from './GeneralOptionsPopup'

interface TopBarProps {
  handleOptionClick: () => void
  isLoading: boolean
  isRequestChanged: boolean
  routes: any
}

export default function SM_TopBar({
  handleOptionClick,
  isLoading,
  isRequestChanged,
  routes,
}: TopBarProps) {
  const { zoomToHotspot } = useSpeedManagementStore()

  const handleHotspotClick = (event: any, newValue: any) => {
    const route = routes.find(
      (route: any) => route.properties.name === newValue
    )
    if (!route) return
    zoomToHotspot(route.geometry.coordinates, 13)
  }

  const sortedNames = routes.map((route: any) => route.properties.name).sort()

  return (
    <Box
      sx={{
        display: 'flex',
        padding: 2,
        gap: 2,
        alignItems: 'center',
        backgroundColor: 'background.paper',
        border: '1px solid',
        borderColor: 'divider',
        flexWrap: 'wrap',
      }}
    >
      <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
        <Autocomplete
          options={sortedNames}
          onChange={handleHotspotClick}
          size="small"
          renderInput={(params) => (
            <TextField {...params} placeholder="Go to segment" />
          )}
          sx={{ width: 300 }}
        />
        <Divider orientation="vertical" flexItem />
        <GeneralOptionsPopup />
        <DateRangeOptionsPopup />
        <DaysOfWeekOptionsPopup />
        <AnalysisPeriodOptionsPopup />
        <FiltersButton />
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <LoadingButton
            variant="contained"
            loading={isLoading}
            onClick={handleOptionClick}
            disabled={!isRequestChanged}
            sx={{ textTransform: 'none' }}
          >
            Update
          </LoadingButton>
          {isRequestChanged && (
            <Alert
              severity="warning"
              sx={{ p: 0, px: 1, whiteSpace: 'nowrap' }}
            >
              click Update to apply changes
            </Alert>
          )}
        </Box>
      </Box>
    </Box>
  )
}
