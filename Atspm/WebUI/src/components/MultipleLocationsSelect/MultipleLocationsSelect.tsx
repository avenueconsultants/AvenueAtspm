import { useGetLocationLocationsForSearch } from '@/api/config/aTSPMConfigurationApi'
import {
  SearchLocation as Location,
  Route,
} from '@/api/config/aTSPMConfigurationApi.schemas'
import { Filters } from '@/features/locations/components/selectLocation'
import LocationInput from '@/features/locations/components/selectLocation/LocationInput'
import SelectLocationMap from '@/features/locations/components/selectLocationMap'
import { useGetRoutes } from '@/features/routes/api'
import AddIcon from '@mui/icons-material/Add'
import {
  Box,
  Button,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  SelectChangeEvent,
} from '@mui/material'
import { useCallback, useMemo, useState } from 'react'

interface MultipleLocationsSelectProps {
  selectedLocations: Location[]
  setLocations: (locations: Location[]) => void
  center?: [number, number]
  zoom?: number
  mapHeight?: number | string
  route?: number[][]
}

const MultipleLocationsSelect = ({
  selectedLocations,
  setLocations,
}: MultipleLocationsSelectProps) => {
  const { data: routesData } = useGetRoutes()
  const { data: locationsData } = useGetLocationLocationsForSearch()

  const routes = useMemo(() => routesData?.value || [], [routesData])
  const locations = useMemo(
    () => locationsData?.value || [],
    [locationsData]
  ) as Location[]

  const [selectedLocation, setSelectedLocation] = useState<Location>()
  const [selectedRoute, setSelectedRoute] = useState<Route>()
  const [filters, setFilters] = useState<Filters>({})

  const updateFilters = useCallback((newFilters: Partial<Filters>) => {
    setFilters((prevFilters) => ({ ...prevFilters, ...newFilters }))
  }, [])

  const filteredLocations = useMemo(() => {
    return locations.filter(
      (loc) =>
        (!filters.areaId || loc.areas?.includes(filters.areaId)) &&
        (!filters.regionId || loc.regionId === filters.regionId) &&
        (!filters.locationTypeId ||
          loc.locationTypeId === filters.locationTypeId) &&
        (!filters.measureTypeId ||
          loc.charts?.includes(filters.measureTypeId)) &&
        (!filters.jurisdictionId ||
          loc.jurisdictionId === filters.jurisdictionId)
    )
  }, [locations, filters])

  const onRouteChange = (e: SelectChangeEvent<number>) => {
    const route = routes?.find((r) => r.id === e.target.value)
    setSelectedRoute(route)
  }

  const onAddRoute = () => {
    if (!selectedRoute?.routeLocations) return

    const routeLocs = selectedRoute.routeLocations
      .map((rl) =>
        locations.find((l) => l.locationIdentifier === rl.locationIdentifier)
      )
      .filter((l): l is Location => Boolean(l))
    const newLocations = routeLocs.filter(
      (loc) => !selectedLocations.some((sel) => sel.id === loc.id)
    )
    if (newLocations.length > 0) {
      setLocations([...selectedLocations, ...newLocations])
    }
  }

  const onAddLocation = () => {
    if (
      selectedLocation &&
      !selectedLocations.some((loc) => loc.id === selectedLocation.id)
    ) {
      setLocations([...selectedLocations, selectedLocation])
    }
  }

  const handleLocationInputChange = (
    _: React.SyntheticEvent,
    value: Location | null
  ) => {
    if (value) {
      setSelectedLocation(value)
    }
  }

  return (
    <Box>
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'row',
          alignItems: 'center',
          mb: 2,
        }}
      >
        <FormControl fullWidth>
          <InputLabel htmlFor="route-select">Route</InputLabel>
          <Select
            label="Route"
            variant="outlined"
            fullWidth
            value={selectedRoute?.id || ''}
            onChange={onRouteChange}
            inputProps={{ id: 'route-select' }}
          >
            {routes?.map((route) => (
              <MenuItem key={route.id} value={route.id}>
                {route.name}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={onAddRoute}
          sx={{ ml: 2, width: 100 }}
        >
          Add
        </Button>
      </Box>
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'row',
          alignItems: 'center',
          mb: 2,
        }}
      >
        <Box sx={{ flex: 1 }}>
          <LocationInput
            location={selectedLocation}
            locations={filteredLocations}
            handleChange={handleLocationInputChange}
            filters={filters}
          />
        </Box>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={onAddLocation}
          sx={{ ml: 2 }}
        >
          Add
        </Button>
      </Box>
      <Box>
        <SelectLocationMap
          location={selectedLocation || null}
          setLocation={setSelectedLocation}
          locations={locations}
          filteredLocations={filteredLocations}
          mapHeight={300}
          filters={filters}
          updateFilters={updateFilters}
        />
      </Box>
    </Box>
  )
}

export default MultipleLocationsSelect
