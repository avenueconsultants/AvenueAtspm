import {
  TspErrorState,
  TspLocation,
} from '@/pages/reports/transit-signal-priority'
import DeleteIcon from '@mui/icons-material/Delete'
import {
  Box,
  Button,
  Divider,
  FormControl,
  IconButton,
  InputLabel,
  MenuItem,
  Select,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material'
import { useEffect, useMemo } from 'react'

interface LocationsDisplayProps {
  locations: TspLocation[]
  phase?: number | ''
  setPhase: (phase: number | '') => void
  onLocationDelete: (location: TspLocation) => void
  onDeleteAllLocations: (locations: TspLocation[]) => void
  onUpdateLocation: (updatedLocation: TspLocation) => void
  errorState: TspErrorState
}

const LocationsDisplay = ({
  locations,
  phase,
  setPhase,
  onLocationDelete,
  onDeleteAllLocations,
  onUpdateLocation,
}: LocationsDisplayProps) => {
  // All available phases across currently selected locations
  const allPhases = useMemo(() => {
    const set = new Set<number>()
    locations.forEach((loc) =>
      loc.approaches?.forEach((a) => {
        if (typeof a.protectedPhaseNumber === 'number') {
          set.add(a.protectedPhaseNumber)
        }
      })
    )
    return Array.from(set).sort((a, b) => a - b)
  }, [locations])

  // If the selected phase is no longer available (locations changed), clear it
  useEffect(() => {
    if (phase !== '' && !allPhases.includes(phase)) {
      setPhase('')
      // also clear designatedPhases on all locations so state is consistent
      locations.forEach((loc) =>
        onUpdateLocation({ ...loc, designatedPhases: [] })
      )
    }
  }, [allPhases, locations, onUpdateLocation, phase, setPhase])

  // Apply a single phase globally to all locations (if present at that site)
  function handlePhaseChange(newPhase: number | '') {
    setPhase(newPhase)

    locations.forEach((location) => {
      const siteHasPhase = location.approaches?.some(
        (a) => a.protectedPhaseNumber === newPhase
      )

      // Keep designatedPhases as an array type but enforce single value
      const designatedPhases =
        newPhase !== '' && siteHasPhase ? [newPhase as number] : []

      onUpdateLocation({ ...location, designatedPhases })
    })
  }

  if (!locations.length) {
    return (
      <Typography variant="body2" color="textSecondary" sx={{ width: '480px' }}>
        No locations selected
      </Typography>
    )
  }

  return (
    <>
      <Box
        display="flex"
        justifyContent="space-between"
        alignItems="center"
        sx={{ mb: 1 }}
      >
        <FormControl size="small" sx={{ minWidth: 220 }}>
          <InputLabel id="phase-label">Phase</InputLabel>
          <Select
            labelId="phase-label"
            label="Phase"
            value={phase}
            onChange={(e) => handlePhaseChange(e.target.value as number)}
          >
            {allPhases.length === 0 ? (
              <MenuItem disabled>No phases available</MenuItem>
            ) : (
              allPhases.map((phase) => (
                <MenuItem key={phase} value={phase}>
                  {phase}
                </MenuItem>
              ))
            )}
          </Select>
        </FormControl>

        <Button
          startIcon={<DeleteIcon />}
          variant="outlined"
          color="error"
          size="small"
          onClick={() => onDeleteAllLocations(locations)}
        >
          Remove All
        </Button>
      </Box>

      <Box
        sx={{
          maxHeight: '505px',
          minWidth: '450px',
          maxWidth: '600px',
          overflowY: 'auto',
        }}
      >
        <Table size="small" aria-label="locations table" stickyHeader>
          <TableHead>
            <TableRow>
              <TableCell>
                <Typography variant="subtitle2">Selected Locations</Typography>
              </TableCell>
              <TableCell />
            </TableRow>
          </TableHead>
          <TableBody>
            {locations.map((location) => (
              <TableRow hover key={location.id}>
                <TableCell sx={{ pl: 0.5 }}>
                  <Box display="flex" alignItems="center">
                    <Divider
                      orientation="vertical"
                      variant="fullWidth"
                      flexItem
                    />
                    <Box ml={1}>
                      {location.locationIdentifier} - {location.primaryName}{' '}
                      {location.secondaryName}
                    </Box>
                  </Box>
                </TableCell>
                <TableCell align="right">
                  <IconButton
                    color="error"
                    onClick={() => onLocationDelete(location)}
                  >
                    <DeleteIcon />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Box>
    </>
  )
}

export default LocationsDisplay
