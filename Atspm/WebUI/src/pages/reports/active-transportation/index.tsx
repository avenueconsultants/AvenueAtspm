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
    totalVolume: 33800,
    averageDailyVolume: 16900,
    averageVolumeByHourOfDay: [
      { index: 0, volume: 100 },
      { index: 1, volume: 90 },
      { index: 2, volume: 80 },
      { index: 3, volume: 80 },
      { index: 4, volume: 100 },
      { index: 5, volume: 200 },
      { index: 6, volume: 400 },
      { index: 7, volume: 700 },
      { index: 8, volume: 900 },
      { index: 9, volume: 1000 },
      { index: 10, volume: 950 },
      { index: 11, volume: 850 },
      { index: 12, volume: 750 },
      { index: 13, volume: 700 },
      { index: 14, volume: 800 },
      { index: 15, volume: 1000 },
      { index: 16, volume: 1300 },
      { index: 17, volume: 1700 },
      { index: 18, volume: 1600 },
      { index: 19, volume: 1200 },
      { index: 20, volume: 900 },
      { index: 21, volume: 700 },
      { index: 22, volume: 500 },
      { index: 23, volume: 300 },
    ],
    averageVolumeByDayOfWeek: [
      { index: 0, volume: 0 },
      { index: 1, volume: 0 },
      { index: 2, volume: 16850 },
      { index: 3, volume: 16950 },
      { index: 4, volume: 0 },
      { index: 5, volume: 0 },
      { index: 6, volume: 0 },
    ],
    averageVolumeByMonthOfYear: [
      { index: 1, volume: 0 },
      { index: 2, volume: 0 },
      { index: 3, volume: 0 },
      { index: 4, volume: 0 },
      { index: 5, volume: 0 },
      { index: 6, volume: 0 },
      { index: 7, volume: 0 },
      { index: 8, volume: 0 },
      { index: 9, volume: 33800 },
      { index: 10, volume: 0 },
      { index: 11, volume: 0 },
      { index: 12, volume: 0 },
    ],
    rawData: [
      { timeStamp: '2025-09-24T00:00:00Z', pedestrianCount: 100 },
      { timeStamp: '2025-09-24T01:00:00Z', pedestrianCount: 90 },
      { timeStamp: '2025-09-24T02:00:00Z', pedestrianCount: 80 },
      { timeStamp: '2025-09-24T03:00:00Z', pedestrianCount: 80 },
      { timeStamp: '2025-09-24T04:00:00Z', pedestrianCount: 100 },
      { timeStamp: '2025-09-24T05:00:00Z', pedestrianCount: 200 },
      { timeStamp: '2025-09-24T06:00:00Z', pedestrianCount: 400 },
      { timeStamp: '2025-09-24T07:00:00Z', pedestrianCount: 700 },
      { timeStamp: '2025-09-24T08:00:00Z', pedestrianCount: 900 },
      { timeStamp: '2025-09-24T09:00:00Z', pedestrianCount: 1000 },
      { timeStamp: '2025-09-24T10:00:00Z', pedestrianCount: 950 },
      { timeStamp: '2025-09-24T11:00:00Z', pedestrianCount: 850 },
      { timeStamp: '2025-09-24T12:00:00Z', pedestrianCount: 750 },
      { timeStamp: '2025-09-24T13:00:00Z', pedestrianCount: 700 },
      { timeStamp: '2025-09-24T14:00:00Z', pedestrianCount: 800 },
      { timeStamp: '2025-09-24T15:00:00Z', pedestrianCount: 1000 },
      { timeStamp: '2025-09-24T16:00:00Z', pedestrianCount: 1300 },
      { timeStamp: '2025-09-24T17:00:00Z', pedestrianCount: 1700 },
      { timeStamp: '2025-09-24T18:00:00Z', pedestrianCount: 1600 },
      { timeStamp: '2025-09-24T19:00:00Z', pedestrianCount: 1200 },
      { timeStamp: '2025-09-24T20:00:00Z', pedestrianCount: 900 },
      { timeStamp: '2025-09-24T21:00:00Z', pedestrianCount: 700 },
      { timeStamp: '2025-09-24T22:00:00Z', pedestrianCount: 500 },
      { timeStamp: '2025-09-24T23:00:00Z', pedestrianCount: 300 },

      { timeStamp: '2025-09-25T00:00:00Z', pedestrianCount: 105 },
      { timeStamp: '2025-09-25T01:00:00Z', pedestrianCount: 95 },
      { timeStamp: '2025-09-25T02:00:00Z', pedestrianCount: 85 },
      { timeStamp: '2025-09-25T03:00:00Z', pedestrianCount: 82 },
      { timeStamp: '2025-09-25T04:00:00Z', pedestrianCount: 105 },
      { timeStamp: '2025-09-25T05:00:00Z', pedestrianCount: 210 },
      { timeStamp: '2025-09-25T06:00:00Z', pedestrianCount: 420 },
      { timeStamp: '2025-09-25T07:00:00Z', pedestrianCount: 735 },
      { timeStamp: '2025-09-25T08:00:00Z', pedestrianCount: 945 },
      { timeStamp: '2025-09-25T09:00:00Z', pedestrianCount: 1030 },
      { timeStamp: '2025-09-25T10:00:00Z', pedestrianCount: 980 },
      { timeStamp: '2025-09-25T11:00:00Z', pedestrianCount: 860 },
      { timeStamp: '2025-09-25T12:00:00Z', pedestrianCount: 760 },
      { timeStamp: '2025-09-25T13:00:00Z', pedestrianCount: 710 },
      { timeStamp: '2025-09-25T14:00:00Z', pedestrianCount: 820 },
      { timeStamp: '2025-09-25T15:00:00Z', pedestrianCount: 1040 },
      { timeStamp: '2025-09-25T16:00:00Z', pedestrianCount: 1350 },
      { timeStamp: '2025-09-25T17:00:00Z', pedestrianCount: 1750 },
      { timeStamp: '2025-09-25T18:00:00Z', pedestrianCount: 1630 },
      { timeStamp: '2025-09-25T19:00:00Z', pedestrianCount: 1220 },
      { timeStamp: '2025-09-25T20:00:00Z', pedestrianCount: 910 },
      { timeStamp: '2025-09-25T21:00:00Z', pedestrianCount: 690 },
      { timeStamp: '2025-09-25T22:00:00Z', pedestrianCount: 520 },
      { timeStamp: '2025-09-25T23:00:00Z', pedestrianCount: 305 },
    ],
    statisticData: {
      events: 48,
      count: 33800,
      mean: 704.17,
      std: 455.0,
      min: 80,
      twentyFifthPercentile: 300,
      fiftyithPercentile: 750,
      seventyFifthPercentile: 1030,
      max: 1750,
      missingCount: 0,
    },
  },
  {
    locationIdentifier: 'PRV-Center-002',
    names: 'Center St & University Ave',
    areas: 'Provo, UT',
    latitude: 40.23384,
    longitude: -111.65853,
    totalVolume: 19060,
    averageDailyVolume: 9530,
    averageVolumeByHourOfDay: [
      { index: 0, volume: 50 },
      { index: 1, volume: 40 },
      { index: 2, volume: 30 },
      { index: 3, volume: 30 },
      { index: 4, volume: 50 },
      { index: 5, volume: 150 },
      { index: 6, volume: 300 },
      { index: 7, volume: 500 },
      { index: 8, volume: 700 },
      { index: 9, volume: 800 },
      { index: 10, volume: 900 },
      { index: 11, volume: 950 },
      { index: 12, volume: 980 },
      { index: 13, volume: 960 },
      { index: 14, volume: 900 },
      { index: 15, volume: 700 },
      { index: 16, volume: 500 },
      { index: 17, volume: 300 },
      { index: 18, volume: 200 },
      { index: 19, volume: 150 },
      { index: 20, volume: 120 },
      { index: 21, volume: 90 },
      { index: 22, volume: 70 },
      { index: 23, volume: 60 },
    ],
    averageVolumeByDayOfWeek: [
      { index: 0, volume: 0 },
      { index: 1, volume: 0 },
      { index: 2, volume: 9510 },
      { index: 3, volume: 9550 },
      { index: 4, volume: 0 },
      { index: 5, volume: 0 },
      { index: 6, volume: 0 },
    ],
    averageVolumeByMonthOfYear: [
      { index: 1, volume: 0 },
      { index: 2, volume: 0 },
      { index: 3, volume: 0 },
      { index: 4, volume: 0 },
      { index: 5, volume: 0 },
      { index: 6, volume: 0 },
      { index: 7, volume: 0 },
      { index: 8, volume: 0 },
      { index: 9, volume: 19060 },
      { index: 10, volume: 0 },
      { index: 11, volume: 0 },
      { index: 12, volume: 0 },
    ],
    rawData: [
      { timeStamp: '2025-09-24T00:00:00Z', pedestrianCount: 50 },
      { timeStamp: '2025-09-24T01:00:00Z', pedestrianCount: 40 },
      { timeStamp: '2025-09-24T02:00:00Z', pedestrianCount: 30 },
      { timeStamp: '2025-09-24T03:00:00Z', pedestrianCount: 30 },
      { timeStamp: '2025-09-24T04:00:00Z', pedestrianCount: 50 },
      { timeStamp: '2025-09-24T05:00:00Z', pedestrianCount: 150 },
      { timeStamp: '2025-09-24T06:00:00Z', pedestrianCount: 300 },
      { timeStamp: '2025-09-24T07:00:00Z', pedestrianCount: 500 },
      { timeStamp: '2025-09-24T08:00:00Z', pedestrianCount: 700 },
      { timeStamp: '2025-09-24T09:00:00Z', pedestrianCount: 800 },
      { timeStamp: '2025-09-24T10:00:00Z', pedestrianCount: 900 },
      { timeStamp: '2025-09-24T11:00:00Z', pedestrianCount: 950 },
      { timeStamp: '2025-09-24T12:00:00Z', pedestrianCount: 980 },
      { timeStamp: '2025-09-24T13:00:00Z', pedestrianCount: 960 },
      { timeStamp: '2025-09-24T14:00:00Z', pedestrianCount: 900 },
      { timeStamp: '2025-09-24T15:00:00Z', pedestrianCount: 700 },
      { timeStamp: '2025-09-24T16:00:00Z', pedestrianCount: 500 },
      { timeStamp: '2025-09-24T17:00:00Z', pedestrianCount: 300 },
      { timeStamp: '2025-09-24T18:00:00Z', pedestrianCount: 200 },
      { timeStamp: '2025-09-24T19:00:00Z', pedestrianCount: 150 },
      { timeStamp: '2025-09-24T20:00:00Z', pedestrianCount: 120 },
      { timeStamp: '2025-09-24T21:00:00Z', pedestrianCount: 90 },
      { timeStamp: '2025-09-24T22:00:00Z', pedestrianCount: 70 },
      { timeStamp: '2025-09-24T23:00:00Z', pedestrianCount: 60 },

      { timeStamp: '2025-09-25T00:00:00Z', pedestrianCount: 55 },
      { timeStamp: '2025-09-25T01:00:00Z', pedestrianCount: 45 },
      { timeStamp: '2025-09-25T02:00:00Z', pedestrianCount: 35 },
      { timeStamp: '2025-09-25T03:00:00Z', pedestrianCount: 30 },
      { timeStamp: '2025-09-25T04:00:00Z', pedestrianCount: 55 },
      { timeStamp: '2025-09-25T05:00:00Z', pedestrianCount: 160 },
      { timeStamp: '2025-09-25T06:00:00Z', pedestrianCount: 310 },
      { timeStamp: '2025-09-25T07:00:00Z', pedestrianCount: 520 },
      { timeStamp: '2025-09-25T08:00:00Z', pedestrianCount: 720 },
      { timeStamp: '2025-09-25T09:00:00Z', pedestrianCount: 820 },
      { timeStamp: '2025-09-25T10:00:00Z', pedestrianCount: 910 },
      { timeStamp: '2025-09-25T11:00:00Z', pedestrianCount: 960 },
      { timeStamp: '2025-09-25T12:00:00Z', pedestrianCount: 990 },
      { timeStamp: '2025-09-25T13:00:00Z', pedestrianCount: 970 },
      { timeStamp: '2025-09-25T14:00:00Z', pedestrianCount: 910 },
      { timeStamp: '2025-09-25T15:00:00Z', pedestrianCount: 710 },
      { timeStamp: '2025-09-25T16:00:00Z', pedestrianCount: 510 },
      { timeStamp: '2025-09-25T17:00:00Z', pedestrianCount: 310 },
      { timeStamp: '2025-09-25T18:00:00Z', pedestrianCount: 210 },
      { timeStamp: '2025-09-25T19:00:00Z', pedestrianCount: 160 },
      { timeStamp: '2025-09-25T20:00:00Z', pedestrianCount: 130 },
      { timeStamp: '2025-09-25T21:00:00Z', pedestrianCount: 95 },
      { timeStamp: '2025-09-25T22:00:00Z', pedestrianCount: 75 },
      { timeStamp: '2025-09-25T23:00:00Z', pedestrianCount: 65 },
    ],
    statisticData: {
      events: 48,
      count: 19060,
      mean: 397.1,
      std: 328.0,
      min: 30,
      twentyFifthPercentile: 90,
      fiftyithPercentile: 300,
      seventyFifthPercentile: 800,
      max: 990,
      missingCount: 0,
    },
  },
  {
    locationIdentifier: 'OGD-Union-003',
    names: 'Washington Blvd & 25th St',
    areas: 'Ogden, UT',
    latitude: 41.223,
    longitude: -111.973,
    totalVolume: 18440,
    averageDailyVolume: 9220,
    averageVolumeByHourOfDay: [
      { index: 0, volume: 60 },
      { index: 1, volume: 50 },
      { index: 2, volume: 40 },
      { index: 3, volume: 40 },
      { index: 4, volume: 60 },
      { index: 5, volume: 120 },
      { index: 6, volume: 250 },
      { index: 7, volume: 400 },
      { index: 8, volume: 550 },
      { index: 9, volume: 600 },
      { index: 10, volume: 550 },
      { index: 11, volume: 500 },
      { index: 12, volume: 480 },
      { index: 13, volume: 500 },
      { index: 14, volume: 550 },
      { index: 15, volume: 600 },
      { index: 16, volume: 700 },
      { index: 17, volume: 800 },
      { index: 18, volume: 700 },
      { index: 19, volume: 600 },
      { index: 20, volume: 450 },
      { index: 21, volume: 300 },
      { index: 22, volume: 200 },
      { index: 23, volume: 120 },
    ],
    averageVolumeByDayOfWeek: [
      { index: 0, volume: 0 },
      { index: 1, volume: 0 },
      { index: 2, volume: 9200 },
      { index: 3, volume: 9240 },
      { index: 4, volume: 0 },
      { index: 5, volume: 0 },
      { index: 6, volume: 0 },
    ],
    averageVolumeByMonthOfYear: [
      { index: 1, volume: 0 },
      { index: 2, volume: 0 },
      { index: 3, volume: 0 },
      { index: 4, volume: 0 },
      { index: 5, volume: 0 },
      { index: 6, volume: 0 },
      { index: 7, volume: 0 },
      { index: 8, volume: 0 },
      { index: 9, volume: 18440 },
      { index: 10, volume: 0 },
      { index: 11, volume: 0 },
      { index: 12, volume: 0 },
    ],
    rawData: [
      { timeStamp: '2025-09-24T00:00:00Z', pedestrianCount: 60 },
      { timeStamp: '2025-09-24T01:00:00Z', pedestrianCount: 50 },
      { timeStamp: '2025-09-24T02:00:00Z', pedestrianCount: 40 },
      { timeStamp: '2025-09-24T03:00:00Z', pedestrianCount: 40 },
      { timeStamp: '2025-09-24T04:00:00Z', pedestrianCount: 60 },
      { timeStamp: '2025-09-24T05:00:00Z', pedestrianCount: 120 },
      { timeStamp: '2025-09-24T06:00:00Z', pedestrianCount: 250 },
      { timeStamp: '2025-09-24T07:00:00Z', pedestrianCount: 400 },
      { timeStamp: '2025-09-24T08:00:00Z', pedestrianCount: 550 },
      { timeStamp: '2025-09-24T09:00:00Z', pedestrianCount: 600 },
      { timeStamp: '2025-09-24T10:00:00Z', pedestrianCount: 550 },
      { timeStamp: '2025-09-24T11:00:00Z', pedestrianCount: 500 },
      { timeStamp: '2025-09-24T12:00:00Z', pedestrianCount: 480 },
      { timeStamp: '2025-09-24T13:00:00Z', pedestrianCount: 500 },
      { timeStamp: '2025-09-24T14:00:00Z', pedestrianCount: 550 },
      { timeStamp: '2025-09-24T15:00:00Z', pedestrianCount: 600 },
      { timeStamp: '2025-09-24T16:00:00Z', pedestrianCount: 700 },
      { timeStamp: '2025-09-24T17:00:00Z', pedestrianCount: 800 },
      { timeStamp: '2025-09-24T18:00:00Z', pedestrianCount: 700 },
      { timeStamp: '2025-09-24T19:00:00Z', pedestrianCount: 600 },
      { timeStamp: '2025-09-24T20:00:00Z', pedestrianCount: 450 },
      { timeStamp: '2025-09-24T21:00:00Z', pedestrianCount: 300 },
      { timeStamp: '2025-09-24T22:00:00Z', pedestrianCount: 200 },
      { timeStamp: '2025-09-24T23:00:00Z', pedestrianCount: 120 },

      { timeStamp: '2025-09-25T00:00:00Z', pedestrianCount: 62 },
      { timeStamp: '2025-09-25T01:00:00Z', pedestrianCount: 52 },
      { timeStamp: '2025-09-25T02:00:00Z', pedestrianCount: 42 },
      { timeStamp: '2025-09-25T03:00:00Z', pedestrianCount: 41 },
      { timeStamp: '2025-09-25T04:00:00Z', pedestrianCount: 62 },
      { timeStamp: '2025-09-25T05:00:00Z', pedestrianCount: 125 },
      { timeStamp: '2025-09-25T06:00:00Z', pedestrianCount: 260 },
      { timeStamp: '2025-09-25T07:00:00Z', pedestrianCount: 410 },
      { timeStamp: '2025-09-25T08:00:00Z', pedestrianCount: 560 },
      { timeStamp: '2025-09-25T09:00:00Z', pedestrianCount: 610 },
      { timeStamp: '2025-09-25T10:00:00Z', pedestrianCount: 560 },
      { timeStamp: '2025-09-25T11:00:00Z', pedestrianCount: 505 },
      { timeStamp: '2025-09-25T12:00:00Z', pedestrianCount: 485 },
      { timeStamp: '2025-09-25T13:00:00Z', pedestrianCount: 505 },
      { timeStamp: '2025-09-25T14:00:00Z', pedestrianCount: 560 },
      { timeStamp: '2025-09-25T15:00:00Z', pedestrianCount: 610 },
      { timeStamp: '2025-09-25T16:00:00Z', pedestrianCount: 710 },
      { timeStamp: '2025-09-25T17:00:00Z', pedestrianCount: 810 },
      { timeStamp: '2025-09-25T18:00:00Z', pedestrianCount: 710 },
      { timeStamp: '2025-09-25T19:00:00Z', pedestrianCount: 610 },
      { timeStamp: '2025-09-25T20:00:00Z', pedestrianCount: 455 },
      { timeStamp: '2025-09-25T21:00:00Z', pedestrianCount: 305 },
      { timeStamp: '2025-09-25T22:00:00Z', pedestrianCount: 205 },
      { timeStamp: '2025-09-25T23:00:00Z', pedestrianCount: 125 },
    ],
    statisticData: {
      events: 48,
      count: 18440,
      mean: 384.17,
      std: 250.0,
      min: 40,
      twentyFifthPercentile: 120,
      fiftyithPercentile: 500,
      seventyFifthPercentile: 600,
      max: 810,
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
    </ResponsivePageLayout>
  )
}

export default ActiveTransportation
