import { useGetPedestrianAggregationLocationData } from '@/api/reports'
import { ResponsivePageLayout } from '@/components/ResponsivePage'
import { ActiveTransportationOptions } from '@/features/activeTransportation/components/activeTransportationOptions'
import PedatChartsContainer from '@/features/activeTransportation/components/pedatChartsContainer'
import { dateToTimestamp } from '@/utils/dateTime'
import { DropResult } from '@hello-pangea/dnd'
import { zodResolver } from '@hookform/resolvers/zod'
import PlayArrowIcon from '@mui/icons-material/PlayArrow'
import { LoadingButton } from '@mui/lab'
import { Alert, Box } from '@mui/material'
import { startOfDay, subYears } from 'date-fns'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'

const mockDataZ = [
  {
    locationIdentifier: 'SL-Downtown-001',
    names: 'Main St & 200 S / Gallivan',
    areas: 'Salt Lake City, UT',
    latitude: 40.76487,
    longitude: -111.89073,
    totalVolume: 4380000,
    averageDailyVolume: 12000,
    averageVolumeByHourOfDay: [
      { index: 0, volume: 170 },
      { index: 1, volume: 128 },
      { index: 2, volume: 102 },
      { index: 3, volume: 85 },
      { index: 4, volume: 77 },
      { index: 5, volume: 170 },
      { index: 6, volume: 425 },
      { index: 7, volume: 680 },
      { index: 8, volume: 765 },
      { index: 9, volume: 722 },
      { index: 10, volume: 595 },
      { index: 11, volume: 510 },
      { index: 12, volume: 468 },
      { index: 13, volume: 510 },
      { index: 14, volume: 553 },
      { index: 15, volume: 680 },
      { index: 16, volume: 807 },
      { index: 17, volume: 935 },
      { index: 18, volume: 1020 },
      { index: 19, volume: 850 },
      { index: 20, volume: 680 },
      { index: 21, volume: 510 },
      { index: 22, volume: 340 },
      { index: 23, volume: 213 },
    ],
    averageVolumeByDayOfWeek: [
      { index: 0, volume: 10200 },
      { index: 1, volume: 10800 },
      { index: 2, volume: 11400 },
      { index: 3, volume: 12000 },
      { index: 4, volume: 12600 },
      { index: 5, volume: 13200 },
      { index: 6, volume: 9600 },
    ],
    averageVolumeByMonthOfYear: [
      { index: 1, volume: 288000 },
      { index: 2, volume: 306000 },
      { index: 3, volume: 324000 },
      { index: 4, volume: 342000 },
      { index: 5, volume: 360000 },
      { index: 6, volume: 378000 },
      { index: 7, volume: 396000 },
      { index: 8, volume: 396000 },
      { index: 9, volume: 360000 },
      { index: 10, volume: 342000 },
      { index: 11, volume: 324000 },
      { index: 12, volume: 306000 },
    ],
    rawData: [
      { timeStamp: '2025-09-25T08:27:29.358Z', pedestrianCount: 24 },
      { timeStamp: '2025-09-25T09:27:29.358Z', pedestrianCount: 48 },
      { timeStamp: '2025-09-25T10:27:29.358Z', pedestrianCount: 26 },
      { timeStamp: '2025-09-25T11:27:29.358Z', pedestrianCount: 2 },
      { timeStamp: '2025-09-25T12:27:29.358Z', pedestrianCount: 16 },
      { timeStamp: '2025-09-25T13:27:29.358Z', pedestrianCount: 32 },
      { timeStamp: '2025-09-25T14:27:29.358Z', pedestrianCount: 31 },
      { timeStamp: '2025-09-25T15:27:29.358Z', pedestrianCount: 25 },
      { timeStamp: '2025-09-25T16:27:29.358Z', pedestrianCount: 50 },
      { timeStamp: '2025-09-25T17:27:29.358Z', pedestrianCount: 2 },
    ],
    statisticData: {
      events: 10,
      count: 256,
      mean: 25.6,
      std: 15.68,
      min: 2,
      twentyFifthPercentile: 16,
      fiftyithPercentile: 26,
      seventyFifthPercentile: 32,
      max: 56,
      missingCount: 0,
    },
  },
  {
    locationIdentifier: 'PRV-Center-002',
    names: 'Center St & University Ave',
    areas: 'Provo, UT',
    latitude: 40.23384,
    longitude: -111.65853,
    totalVolume: 3285000,
    averageDailyVolume: 9000,
    averageVolumeByHourOfDay: [
      { index: 0, volume: 128 },
      { index: 1, volume: 96 },
      { index: 2, volume: 77 },
      { index: 3, volume: 64 },
      { index: 4, volume: 58 },
      { index: 5, volume: 128 },
      { index: 6, volume: 319 },
      { index: 7, volume: 510 },
      { index: 8, volume: 574 },
      { index: 9, volume: 542 },
      { index: 10, volume: 447 },
      { index: 11, volume: 383 },
      { index: 12, volume: 351 },
      { index: 13, volume: 383 },
      { index: 14, volume: 415 },
      { index: 15, volume: 510 },
      { index: 16, volume: 606 },
      { index: 17, volume: 702 },
      { index: 18, volume: 766 },
      { index: 19, volume: 638 },
      { index: 20, volume: 510 },
      { index: 21, volume: 383 },
      { index: 22, volume: 255 },
      { index: 23, volume: 160 },
    ],
    averageVolumeByDayOfWeek: [
      { index: 0, volume: 7650 },
      { index: 1, volume: 8100 },
      { index: 2, volume: 8550 },
      { index: 3, volume: 9000 },
      { index: 4, volume: 9450 },
      { index: 5, volume: 9900 },
      { index: 6, volume: 7200 },
    ],
    averageVolumeByMonthOfYear: [
      { index: 1, volume: 216000 },
      { index: 2, volume: 229500 },
      { index: 3, volume: 243000 },
      { index: 4, volume: 256500 },
      { index: 5, volume: 270000 },
      { index: 6, volume: 283500 },
      { index: 7, volume: 297000 },
      { index: 8, volume: 297000 },
      { index: 9, volume: 270000 },
      { index: 10, volume: 256500 },
      { index: 11, volume: 243000 },
      { index: 12, volume: 229500 },
    ],
    rawData: [
      { timeStamp: '2025-09-25T08:27:29.358Z', pedestrianCount: 24 },
      { timeStamp: '2025-09-25T09:27:29.358Z', pedestrianCount: 48 },
      { timeStamp: '2025-09-25T10:27:29.358Z', pedestrianCount: 26 },
      { timeStamp: '2025-09-25T11:27:29.358Z', pedestrianCount: 2 },
      { timeStamp: '2025-09-25T12:27:29.358Z', pedestrianCount: 16 },
      { timeStamp: '2025-09-25T13:27:29.358Z', pedestrianCount: 32 },
      { timeStamp: '2025-09-25T14:27:29.358Z', pedestrianCount: 31 },
      { timeStamp: '2025-09-25T15:27:29.358Z', pedestrianCount: 25 },
      { timeStamp: '2025-09-25T16:27:29.358Z', pedestrianCount: 50 },
      { timeStamp: '2025-09-25T17:27:29.358Z', pedestrianCount: 2 },
    ],
    statisticData: {
      events: 10,
      count: 256,
      mean: 25.6,
      std: 15.68,
      min: 8,
      twentyFifthPercentile: 16,
      fiftyithPercentile: 26,
      seventyFifthPercentile: 32,
      max: 50,
      missingCount: 0,
    },
  },
  {
    locationIdentifier: 'OGD-Union-003',
    names: 'Washington Blvd & 25th St',
    areas: 'Ogden, UT',
    latitude: 41.223,
    longitude: -111.973,
    totalVolume: 2920000,
    averageDailyVolume: 8000,
    averageVolumeByHourOfDay: [
      { index: 0, volume: 114 },
      { index: 1, volume: 86 },
      { index: 2, volume: 69 },
      { index: 3, volume: 57 },
      { index: 4, volume: 52 },
      { index: 5, volume: 114 },
      { index: 6, volume: 284 },
      { index: 7, volume: 454 },
      { index: 8, volume: 511 },
      { index: 9, volume: 483 },
      { index: 10, volume: 398 },
      { index: 11, volume: 341 },
      { index: 12, volume: 313 },
      { index: 13, volume: 341 },
      { index: 14, volume: 370 },
      { index: 15, volume: 454 },
      { index: 16, volume: 540 },
      { index: 17, volume: 625 },
      { index: 18, volume: 683 },
      { index: 19, volume: 568 },
      { index: 20, volume: 454 },
      { index: 21, volume: 341 },
      { index: 22, volume: 227 },
      { index: 23, volume: 143 },
    ],
    averageVolumeByDayOfWeek: [
      { index: 0, volume: 6800 },
      { index: 1, volume: 7200 },
      { index: 2, volume: 7600 },
      { index: 3, volume: 8000 },
      { index: 4, volume: 8400 },
      { index: 5, volume: 8800 },
      { index: 6, volume: 6400 },
    ],
    averageVolumeByMonthOfYear: [
      { index: 1, volume: 192000 },
      { index: 2, volume: 204000 },
      { index: 3, volume: 216000 },
      { index: 4, volume: 228000 },
      { index: 5, volume: 240000 },
      { index: 6, volume: 252000 },
      { index: 7, volume: 264000 },
      { index: 8, volume: 264000 },
      { index: 9, volume: 240000 },
      { index: 10, volume: 228000 },
      { index: 11, volume: 216000 },
      { index: 12, volume: 204000 },
    ],
    rawData: [
      { timeStamp: '2025-09-25T08:27:29.358Z', pedestrianCount: 24 },
      { timeStamp: '2025-09-25T09:27:29.358Z', pedestrianCount: 48 },
      { timeStamp: '2025-09-25T10:27:29.358Z', pedestrianCount: 26 },
      { timeStamp: '2025-09-25T11:27:29.358Z', pedestrianCount: 2 },
      { timeStamp: '2025-09-25T12:27:29.358Z', pedestrianCount: 16 },
      { timeStamp: '2025-09-25T13:27:29.358Z', pedestrianCount: 32 },
      { timeStamp: '2025-09-25T14:27:29.358Z', pedestrianCount: 31 },
      { timeStamp: '2025-09-25T15:27:29.358Z', pedestrianCount: 25 },
      { timeStamp: '2025-09-25T16:27:29.358Z', pedestrianCount: 50 },
      { timeStamp: '2025-09-25T17:27:29.358Z', pedestrianCount: 2 },
    ],
    statisticData: {
      events: 10,
      count: 256,
      mean: 25.6,
      std: 15.68,
      min: 2,
      twentyFifthPercentile: 16,
      fiftyithPercentile: 26,
      seventyFifthPercentile: 32,
      max: 50,
      missingCount: 0,
    },
  },
]

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
  const { mutateAsync: fetchPedestrianData } =
    useGetPedestrianAggregationLocationData()

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

  const handleGenerateReport = async () => {
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

    const charts = await fetchPedestrianData({
      data: {
        locationIdentifiers: formData.locations.map((l) => l.id),
        startDate: dateToTimestamp(formData.startDate),
        endDate: dateToTimestamp(formData.endDate),
        timeUnit: 0,
        // startTime: formData.startTime,
        // endTime: formData.endTime,
        // daysOfWeek: formData.daysOfWeek,
      },
    })

    // setMockData(charts)
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
        {mockData && <PedatChartsContainer data={mockDataZ} />}
      </Box>
    </ResponsivePageLayout>
  )
}

export default ActiveTransportation
