import MultipleLocationsSelect from '@/components/MultipleLocationsSelect/MultipleLocationsSelect'
import SelectDateTime from '@/components/selectTimeSpan'
import { StyledPaper } from '@/components/StyledPaper'
import LocationsDisplay from '@/features/activeTransportation/components/LocationsDisplay'
import { MultiSelectCheckbox } from '@/features/aggregateData/components/chartOptions/MultiSelectCheckbox'
import { ATErrorState, ATLocation } from '@/pages/reports/active-transportation'
import { DropResult } from '@hello-pangea/dnd'
import {
  Box,
  Divider,
  FormControl,
  InputLabel,
  MenuItem,
  Paper,
  Select,
} from '@mui/material'

interface ActiveTransportationOptionsProps {
  errorState: ATErrorState
  locations: ATLocation[]
  daysOfWeek: number[]
  timeUnit: string
  startDate: Date
  endDate: Date
  phase?: number | ''
  setLocations: (locations: ATLocation[]) => void
  setDaysOfWeek: (days: number[]) => void
  setTimeUnit: (unit: string) => void
  setStartDate: (date: Date) => void
  setEndDate: (date: Date) => void
  setPhase: (phase: number | '') => void
  onLocationDelete: (location: ATLocation) => void
  onReorderLocations: (dropResult: DropResult) => void
  onUpdateLocation: (updatedLocation: ATLocation) => void
}

const daysOfWeekList = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
]

export const ActiveTransportationOptions = ({
  locations,
  daysOfWeek,
  timeUnit,
  startDate,
  endDate,
  phase,
  setLocations,
  setDaysOfWeek,
  setTimeUnit,
  setStartDate,
  setEndDate,
  setPhase,
  onLocationDelete,
  onUpdateLocation,
}: ActiveTransportationOptionsProps) => {
  return (
    <Box>
      <Box sx={{ display: 'flex', flexDirection: 'row', gap: 2 }}>
        <Paper sx={{ p: 3, display: 'flex', flexDirection: 'row' }}>
          <Box sx={{ width: '400px' }}>
            <MultipleLocationsSelect
              selectedLocations={locations}
              setLocations={setLocations}
              removeRouteSelect
            />
          </Box>
          <Divider orientation="vertical" sx={{ mx: 2 }} />
          <Box>
            <LocationsDisplay
              locations={locations}
              onLocationDelete={onLocationDelete}
              onDeleteAllLocations={() => setLocations([])}
              onUpdateLocation={onUpdateLocation}
              phase={phase}
              setPhase={setPhase}
            />
          </Box>
        </Paper>

        <StyledPaper sx={{ padding: 3, maxWidth: '350px' }}>
          <SelectDateTime
            dateFormat={'MMM dd, yyyy'}
            startDateTime={startDate}
            endDateTime={endDate}
            views={['year', 'month', 'day']}
            changeStartDate={setStartDate}
            changeEndDate={setEndDate}
            noCalendar
          />

          <FormControl fullWidth>
            <InputLabel htmlFor="time-unit-input">Time Unit</InputLabel>
            <Select
              value={timeUnit}
              label="Time Unit"
              onChange={(e) => setTimeUnit(e.target.value)}
              inputProps={{ id: 'time-unit-input' }}
            >
              <MenuItem value="Hour">Hour</MenuItem>
              <MenuItem value="Day">Day</MenuItem>
              <MenuItem value="Week">Week</MenuItem>
              <MenuItem value="Month">Month</MenuItem>
              <MenuItem value="Year">Year</MenuItem>
            </Select>
          </FormControl>
        </StyledPaper>

        <Paper sx={{ maxWidth: '390px' }}>
          <MultiSelectCheckbox
            itemList={daysOfWeekList}
            selectedItems={daysOfWeek}
            setSelectedItems={setDaysOfWeek}
            header="Days"
          />
        </Paper>
      </Box>
    </Box>
  )
}
