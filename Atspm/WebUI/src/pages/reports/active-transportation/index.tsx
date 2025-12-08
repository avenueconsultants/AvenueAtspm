import { useGetPedestrianAggregationLocationData } from '@/api/reports'
import { ResponsivePageLayout } from '@/components/ResponsivePage'
import { ActiveTransportationOptions } from '@/features/activeTransportation/components/ActiveTransportationOptions'
import PedatChartsContainer from '@/features/activeTransportation/components/PedatChartsContainer'
import { dateToTimestamp } from '@/utils/dateTime'
import { roundTo } from '@/utils/numberFormat'
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
      locationIdentifier: z.string(),
    })
  ),
  daysOfWeek: z.array(z.number()),
  timeUnit: z.string(),
  startDate: z.date(),
  endDate: z.date(),
  phase: z.number().nullable(),
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
  const { mutateAsync: fetchPedestrianData, isLoading } =
    useGetPedestrianAggregationLocationData()

  const form = useForm<ActiveTransportationForm>({
    resolver: zodResolver(activeTransportationSchema),
    defaultValues: {
      locations: [],
      daysOfWeek: [0],
      timeUnit: 'Hour',
      startDate: startOfDay(subYears(new Date(), 1)),
      endDate: startOfDay(new Date()),
      phase: null,
    },
  })

  const { watch, setValue } = form
  const [errorState, setErrorState] = useState<ATErrorState>({ type: 'NONE' })
  const [data, setData] = useState<boolean>(false)

  const locations = watch('locations')
  const daysOfWeek = watch('daysOfWeek')
  const timeUnit = watch('timeUnit')
  const startDate = watch('startDate')
  const endDate = watch('endDate')
  const phase = watch('phase')

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
        locationIdentifiers: formData.locations.map(
          (l) => l.locationIdentifier
        ),
        startDate: dateToTimestamp(formData.startDate),
        endDate: dateToTimestamp(formData.endDate),
        timeUnit: 0,
      },
    })

    charts.forEach((location) => {
      location.averageDailyVolume = roundTo(location.averageDailyVolume, 0)

      location.averageVolumeByHourOfDay.forEach((item) => {
        item.volume = roundTo(item.volume, 0)
      })

      location.averageVolumeByDayOfWeek.forEach((item) => {
        item.volume = roundTo(item.volume, 0)
      })

      location.averageVolumeByMonthOfYear.forEach((item) => {
        item.volume = roundTo(item.volume, 0)
      })

      location.rawData?.forEach((item) => {
        item.pedestrianCount = roundTo(item.pedestrianCount, 0)
      })
    })

    setData(charts)
  }

  return (
    <ResponsivePageLayout title="Active Transportation">
      <ActiveTransportationOptions
        errorState={errorState}
        locations={locations}
        daysOfWeek={daysOfWeek}
        timeUnit={timeUnit}
        startDate={startDate}
        endDate={endDate}
        phase={phase}
        setLocations={setLocations}
        setDaysOfWeek={(days) => setValue('daysOfWeek', days)}
        setTimeUnit={(unit) => setValue('timeUnit', unit)}
        setStartDate={(date) => setValue('startDate', date)}
        setEndDate={(date) => setValue('endDate', date)}
        setPhase={(phase) => setValue('phase', phase)}
        onLocationDelete={handleLocationDelete}
        onReorderLocations={handleReorderLocations}
        onUpdateLocation={handleUpdateLocation}
      />
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mt: 2 }}>
        <LoadingButton
          loading={isLoading}
          loadingPosition="start"
          startIcon={<PlayArrowIcon />}
          variant="contained"
          sx={{ padding: '10px', mb: 2 }}
          onClick={handleGenerateReport}
        >
          Generate Report
        </LoadingButton>
        {renderErrorAlert()}
      </Box>
      {data && <PedatChartsContainer data={data} />}
    </ResponsivePageLayout>
  )
}

export default ActiveTransportation
