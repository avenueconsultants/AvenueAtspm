import {
  Approach,
  SearchLocation as Location,
} from '@/api/config/aTSPMConfigurationApi.schemas'
import MultipleLocationsDisplay from '@/components/MultipleLocationsSelect/MultipleLocationsDisplay'
import MultipleLocationsSelect from '@/components/MultipleLocationsSelect/MultipleLocationsSelect'
import { ResponsivePageLayout } from '@/components/ResponsivePage'
import SelectDateTime from '@/components/selectTimeSpan'
import { StyledPaper } from '@/components/StyledPaper'
import { MultiSelectCheckbox } from '@/features/aggregateData/components/chartOptions/MultiSelectCheckbox'
import { DropResult } from '@hello-pangea/dnd'
import PlayArrowIcon from '@mui/icons-material/PlayArrow'
import { LoadingButton } from '@mui/lab'
import {
  Alert,
  Box,
  Divider,
  FormControl,
  InputLabel,
  MenuItem,
  Paper,
  Select,
} from '@mui/material'
import { startOfDay, startOfYesterday, subDays } from 'date-fns'
import { useState } from 'react'

const savedReportsMock = [
  {
    id: 1,
    name: 'Report 1',
    start: new Date(),
    end: new Date(),
    locations: [
      { id: 1, name: 'Location 1' },
      { id: 2, name: 'Location 2' },
    ],
  },
  {
    id: 2,
    name: 'Report 2',
    start: new Date('2021-10-01'),
    end: new Date('2021-10-31'),
    locations: [
      { id: 3, name: 'Location 3' },
      { id: 4, name: 'Location 4' },
    ],
  },
]

const daysOfWeekList = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
]

export interface TspLocation extends Location {
  approaches: Approach[]
  designatedPhases: number[]
}

export const getPhases = (location: TspLocation) => {
  return Array.from(
    new Set(location.approaches?.map((a) => a.protectedPhaseNumber) || [])
  ).sort((a, b) => a - b)
}

export type TspErrorState =
  | { type: 'NONE' }
  | { type: 'NO_LOCATIONS' }
  | { type: 'MISSING_PHASES'; locationIDs: Set<string> }
  | { type: '400' }
  | { type: 'UNKNOWN'; message: string }

interface TspReportOptions {
  selectedDays: Date[]
  locations: TspLocation[]
}

const ActiveTransportation = () => {
  const [reportOptions, setReportOptions] = useState<TspReportOptions>({
    selectedDays: [subDays(startOfYesterday(), 1), startOfYesterday()],
    locations: [],
  })
  const [selectedReport, setSelectedReport] = useState(0)
  const [selectedDays, setSelectedDays] = useState([])
  const [startTime, setStartTime] = useState(
    new Date(new Date().setHours(8, 0, 0, 0))
  )
  const [endTime, setEndTime] = useState(
    new Date(new Date().setHours(9, 0, 0, 0))
  )
  const [timeUnit, setTimeUnit] = useState('Hour')
  const [startDate, setStartDate] = useState(startOfDay(new Date()))
  const [endDate, setEndDate] = useState(startOfDay(new Date()))
  const [errorState, setErrorState] = useState<TspErrorState>({ type: 'NONE' })

  function renderErrorAlert() {
    if (errorState.type === 'NO_LOCATIONS') {
      return (
        <Alert severity="error">Please select one or more locations.</Alert>
      )
    }
    if (errorState.type === 'MISSING_PHASES') {
      return (
        <Alert severity="error">
          Please select phases for the highlighted locations.
        </Alert>
      )
    }
    if (errorState.type === '400') {
      return (
        <Alert severity="error">
          400: The requested resource was not found.
        </Alert>
      )
    }
    if (errorState.type === 'UNKNOWN') {
      return (
        <Alert severity="error">
          Something went wrong: {errorState.message}
        </Alert>
      )
    }
    return null
  }

  function setLocations(locations: TspLocation[]) {
    const hadNoLocations = errorState.type === 'NO_LOCATIONS'
    // check each location, and set it's designated phases to 2 and 6 if available.
    locations.forEach((loc) => {
      const phases = getPhases(loc)
      if (phases.includes(2) && phases.includes(6)) {
        loc.designatedPhases = [2, 6]
      }
    })

    setReportOptions((prev) => ({ ...prev, locations }))

    if (hadNoLocations && locations.length > 0) {
      setErrorState({ type: 'NONE' })
    }
  }

  function handleLocationDelete(location: TspLocation) {
    setLocations(
      reportOptions.locations.filter((loc) => loc.id !== location.id)
    )
  }

  function handleReorderLocations(dropResult: DropResult) {
    if (!dropResult.destination) return
    const items = Array.from(reportOptions.locations)
    const [reorderedItem] = items.splice(dropResult.source.index, 1)
    items.splice(dropResult.destination.index, 0, reorderedItem)
    setLocations(items)
  }

  function handleSavedReportChange(e: React.ChangeEvent<{ value: unknown }>) {
    const found = savedReportsMock.find((r) => r.id === e.target.value)
    if (found) {
      setSelectedReport(found.id)
      setLocations(found.locations as TspLocation[])
    } else {
      setSelectedReport(0)
      setLocations([])
    }
  }

  function handleUpdateLocation(updatedLocation: TspLocation) {
    const updatedLocations = reportOptions.locations.map((loc) =>
      loc.id === updatedLocation.id ? updatedLocation : loc
    )
    setReportOptions((prev) => ({ ...prev, locations: updatedLocations }))

    if (errorState.type === 'MISSING_PHASES') {
      const newIDs = new Set(errorState.locationIDs)
      if (
        updatedLocation.designatedPhases &&
        updatedLocation.designatedPhases.length > 0
      ) {
        newIDs.delete(String(updatedLocation.id))
      }
      if (newIDs.size === 0) {
        setErrorState({ type: 'NONE' })
      } else {
        setErrorState({ type: 'MISSING_PHASES', locationIDs: newIDs })
      }
    }
  }

  async function generateReport() {
    if (reportOptions.locations.length === 0) {
      setErrorState({ type: 'NO_LOCATIONS' })
      return
    }
    const missingPhases = reportOptions.locations.filter(
      (loc) => !loc.designatedPhases || loc.designatedPhases.length === 0
    )
    if (missingPhases.length > 0) {
      setErrorState({
        type: 'MISSING_PHASES',
        locationIDs: new Set(missingPhases.map((loc) => String(loc.id))),
      })
      return
    }
    setErrorState({ type: 'NONE' })
    try {
      //console log
    } catch (err: unknown) {
      //console log
    }
  }

  return (
    <ResponsivePageLayout title="Active Transportation">
      <Box>
        <Box sx={{ display: 'flex', flexDirection: 'row', gap: 2 }}>
          <Paper sx={{ p: 3, display: 'flex', flexDirection: 'row' }}>
            <Box sx={{ width: '400px' }}>
              <MultipleLocationsSelect
                selectedLocations={reportOptions.locations}
                setLocations={setLocations}
                removeRouteSelect
              />
            </Box>
            <Divider orientation="vertical" sx={{ mx: 2 }} />
            <Box>
              <MultipleLocationsDisplay
                locations={reportOptions.locations}
                onLocationDelete={handleLocationDelete}
                onDeleteAllLocations={() => setLocations([])}
                onLocationsReorder={handleReorderLocations}
                onUpdateLocation={handleUpdateLocation}
                errorState={errorState}
              />
            </Box>
          </Paper>

          <StyledPaper
            sx={{
              padding: 3,
              maxWidth: '350px',
            }}
          >
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

          <Box sx={{ maxWidth: '390px' }}>
            <MultiSelectCheckbox
              itemList={daysOfWeekList}
              selectedItems={selectedDays}
              setSelectedItems={(days: number[]) =>
                setParams((prev: any) => ({ ...prev, selectedDays: days }))
              }
              header="Days"
              // direction="horizontal"
            />
          </Box>
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mt: 2 }}>
          <LoadingButton
            startIcon={<PlayArrowIcon />}
            loading={false}
            variant="contained"
            sx={{ padding: '10px', mb: 2 }}
            onClick={generateReport}
          >
            Generate Report
          </LoadingButton>
          {renderErrorAlert()}
        </Box>
        {/* {reportResponse && <TspReport report={reportResponse} />} */}
      </Box>
    </ResponsivePageLayout>
  )
}
export default ActiveTransportation
