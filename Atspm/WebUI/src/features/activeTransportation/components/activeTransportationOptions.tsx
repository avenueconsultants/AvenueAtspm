// ActiveTransportationOptions.tsx
import MultipleLocationsDisplay from '@/components/MultipleLocationsSelect/MultipleLocationsDisplay'
import MultipleLocationsSelect from '@/components/MultipleLocationsSelect/MultipleLocationsSelect'
import SelectDateTime from '@/components/selectTimeSpan'
import { StyledPaper } from '@/components/StyledPaper'
import { MultiSelectCheckbox } from '@/features/aggregateData/components/chartOptions/MultiSelectCheckbox'
import { ATErrorState, ATLocation } from '@/pages/active-transportation'
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
  startTime: Date
  endTime: Date
  timeUnit: string
  startDate: Date
  endDate: Date
  setLocations: (locations: ATLocation[]) => void
  setDaysOfWeek: (days: number[]) => void
  setStartTime: (date: Date) => void
  setEndTime: (date: Date) => void
  setTimeUnit: (unit: string) => void
  setStartDate: (date: Date) => void
  setEndDate: (date: Date) => void
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
  errorState,
  locations,
  daysOfWeek,
  startTime,
  endTime,
  timeUnit,
  startDate,
  endDate,
  setLocations,
  setDaysOfWeek,
  setStartTime,
  setEndTime,
  setTimeUnit,
  setStartDate,
  setEndDate,
  onLocationDelete,
  onReorderLocations,
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
            <MultipleLocationsDisplay
              locations={locations}
              onLocationDelete={onLocationDelete}
              onDeleteAllLocations={() => setLocations([])}
              onLocationsReorder={onReorderLocations}
              onUpdateLocation={onUpdateLocation}
              errorState={errorState}
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
            startTimePeriod={startTime}
            endTimePeriod={endTime}
            changeStartTimePeriod={setStartTime}
            changeEndTimePeriod={setEndTime}
            timePeriod={true}
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
