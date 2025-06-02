// ActiveTransportation.tsx
import { ResponsivePageLayout } from '@/components/ResponsivePage'
import { ActiveTransportationOptions } from '@/features/activeTransportation/components/activeTransportationOptions'
import PedatChartsContainer from '@/features/activeTransportation/components/pedatChartsContainer'
import { DropResult } from '@hello-pangea/dnd'
import { zodResolver } from '@hookform/resolvers/zod'
import PlayArrowIcon from '@mui/icons-material/PlayArrow'
import { LoadingButton } from '@mui/lab'
import { Alert, Box } from '@mui/material'
import { startOfDay, subYears } from 'date-fns'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'

const activeTransportationSchema = z.object({
  locations: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
      approaches: z.array(z.any()),
      designatedPhases: z.array(z.number()),
    })
  ),
  daysOfWeek: z.array(z.number()),
  startTime: z.date(),
  endTime: z.date(),
  timeUnit: z.string(),
  startDate: z.date(),
  endDate: z.date(),
})

type ActiveTransportationForm = z.infer<typeof activeTransportationSchema>

export interface ATLocation {
  id: string
  name: string
  approaches: any[]
  designatedPhases: number[]
}

export const getPhases = (location: ATLocation) => {
  return Array.from(
    new Set(location.approaches?.map((a) => a.protectedPhaseNumber) || [2])
  ).sort((a, b) => a - b)
}

export type ATErrorState =
  | { type: 'NONE' }
  | { type: 'NO_LOCATIONS' }
  | { type: 'MISSING_PHASES'; locationIDs: Set<string> }
  | { type: '400' }
  | { type: 'UNKNOWN'; message: string }

const ActiveTransportation = () => {
  const form = useForm<ActiveTransportationForm>({
    resolver: zodResolver(activeTransportationSchema),
    defaultValues: {
      locations: [],
      daysOfWeek: [0],
      startTime: new Date(new Date().setHours(8, 0, 0, 0)),
      endTime: new Date(new Date().setHours(9, 0, 0, 0)),
      timeUnit: 'Hour',
      startDate: startOfDay(subYears(new Date(), 1)),
      endDate: startOfDay(new Date()),
    },
  })

  const { watch, setValue } = form
  const [errorState, setErrorState] = useState<ATErrorState>({ type: 'NONE' })
  const [mockData, setMockData] = useState<boolean>(false)
  const [mockdataIsLoaded, setMockDataIsLoading] = useState<boolean>(false)

  const locations = watch('locations')
  const daysOfWeek = watch('daysOfWeek')
  const startTime = watch('startTime')
  const endTime = watch('endTime')
  const timeUnit = watch('timeUnit')
  const startDate = watch('startDate')
  const endDate = watch('endDate')

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

  const getMockData = () => {
    setMockDataIsLoading(true)
    setTimeout(() => {
      setMockDataIsLoading(false)
      setMockData(true)
    }, 3000)
  }
  const setLocations = (newLocations: ATLocation[]) => {
    const hadNoLocations = errorState.type === 'NO_LOCATIONS'
    newLocations.forEach((loc) => {
      const phases = getPhases(loc)
      if (phases.includes(2) && phases.includes(6)) {
        loc.designatedPhases = [2, 6]
      }
    })

    setValue('locations', newLocations)

    if (hadNoLocations && newLocations.length > 0) {
      setErrorState({ type: 'NONE' })
    }
  }

  const handleLocationDelete = (location: ATLocation) => {
    const newLocations = locations.filter((loc) => loc.id !== location.id)
    setValue('locations', newLocations)
  }

  const handleReorderLocations = (dropResult: DropResult) => {
    if (!dropResult.destination) return
    const newLocations = Array.from(locations)
    const [reorderedItem] = newLocations.splice(dropResult.source.index, 1)
    newLocations.splice(dropResult.destination.index, 0, reorderedItem)
    setValue('locations', newLocations)
  }

  const handleUpdateLocation = (updatedLocation: ATLocation) => {
    const updatedLocations = locations.map((loc) =>
      loc.id === updatedLocation.id ? updatedLocation : loc
    )
    setValue('locations', updatedLocations)

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

  const handleGenerateReport = () => {
    const formData = form.getValues()
    if (formData.locations.length === 0) {
      setErrorState({ type: 'NO_LOCATIONS' })
      return
    }
    const missingPhases = formData.locations.filter(
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
    console.log('Generate report with:', formData)
    // TODO: Add API call here with formData
  }

  return (
    <ResponsivePageLayout title="Active Transportation">
      <Box>
        <ActiveTransportationOptions
          errorState={errorState}
          locations={locations}
          daysOfWeek={daysOfWeek}
          startTime={startTime}
          endTime={endTime}
          timeUnit={timeUnit}
          startDate={startDate}
          endDate={endDate}
          setLocations={setLocations}
          setDaysOfWeek={(days) => setValue('daysOfWeek', days)}
          setStartTime={(time) => setValue('startTime', time)}
          setEndTime={(time) => setValue('endTime', time)}
          setTimeUnit={(unit) => setValue('timeUnit', unit)}
          setStartDate={(date) => setValue('startDate', date)}
          setEndDate={(date) => setValue('endDate', date)}
          onLocationDelete={handleLocationDelete}
          onReorderLocations={handleReorderLocations}
          onUpdateLocation={handleUpdateLocation}
        />
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mt: 2 }}>
          <LoadingButton
            loading={mockdataIsLoaded}
            loadingPosition="start"
            startIcon={<PlayArrowIcon />}
            variant="contained"
            sx={{ padding: '10px', mb: 2 }}
            onClick={getMockData}
          >
            Generate Report
          </LoadingButton>
          {renderErrorAlert()}
        </Box>
        {mockData && <PedatChartsContainer />}
      </Box>
    </ResponsivePageLayout>
  )
}

export default ActiveTransportation
