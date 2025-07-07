import { getEnv } from '@/utils/getEnv'
import ClearIcon from '@mui/icons-material/Clear'
import {
  Box,
  Button,
  ButtonGroup,
  ClickAwayListener,
  FormControl,
  InputLabel,
  MenuItem,
  Paper,
  Popper,
  Select,
  Slider,
  Typography,
} from '@mui/material'
import L, { Map as LeafletMap } from 'leaflet'
import 'leaflet/dist/leaflet.css'
import React, { memo, useCallback, useEffect, useRef, useState } from 'react'
import { MapContainer, TileLayer } from 'react-leaflet'

const PedatMap: React.FC = () => {
  const [mapRef, setMapRef] = useState<LeafletMap | null>(null)
  const [isFiltersOpen, setIsFiltersOpen] = useState(false)
  const [mapCoords, setMapCoords] = useState<{
    lat: number
    lng: number
    zoom: number
  }>({
    lat: 40.7608,
    lng: -111.891,
    zoom: 10,
  })
  const [dateRange, setDateRange] = useState<number[]>([1, 30])
  const [hourRange, setHourRange] = useState<number[]>([0, 23])
  const [aggregation, setAggregation] = useState('Average Hour')
  const filtersButtonRef = useRef(null)

  // Fallback coordinates if env is not set

  useEffect(() => {
    const fetchEnv = async () => {
      const env = await getEnv()

      const lat = parseFloat(env?.MAP_DEFAULT_LATITUDE || '')
      const lng = parseFloat(env?.MAP_DEFAULT_LONGITUDE || '')
      const zoom = parseInt(env?.MAP_DEFAULT_ZOOM || '', 10)

      if (!isNaN(lat) && !isNaN(lng) && !isNaN(zoom)) {
        setMapCoords({ lat, lng, zoom })
      }
    }

    fetchEnv()
  }, [])

  // Invalidate map size on mount and resize
  useEffect(() => {
    if (mapRef) {
      mapRef.invalidateSize()
      const mapContainer = mapRef.getContainer()
      const resizeObserver = new ResizeObserver(() => {
        mapRef.invalidateSize()
      })
      resizeObserver.observe(mapContainer)
      return () => {
        resizeObserver.disconnect()
      }
    }
  }, [mapRef])

  const handleFiltersClick = useCallback(() => {
    setIsFiltersOpen((prev) => !prev)
  }, [])

  const handleFiltersClearClick = useCallback(() => {
    console.log('clear filters')
  }, [])

  const handleClosePopper = useCallback(() => {
    // setIsFiltersOpen(false)
  }, [])

  return (
    <Box sx={{ height: '100%', width: '100%', position: 'relative' }}>
      <MapContainer
        center={[mapCoords.lat, mapCoords.lng]}
        zoom={mapCoords.zoom}
        scrollWheelZoom={true}
        style={{
          height: '100%',
          width: '100%',
        }}
        renderer={L.canvas({ tolerance: 5 })}
        ref={setMapRef}
        doubleClickZoom={false}
      >
        <ClickAwayListener onClickAway={handleClosePopper}>
          <Box>
            <ButtonGroup
              variant="contained"
              size="small"
              disableElevation
              sx={{
                position: 'absolute',
                right: '10px',
                top: '10px',
                zIndex: 1000,
              }}
            >
              <Button variant="contained" onClick={handleFiltersClick}>
                Filters
              </Button>
              <Button
                ref={filtersButtonRef}
                variant="contained"
                size="small"
                aria-label="Clear filters"
                onClick={handleFiltersClearClick}
                // disabled={
                //   !Object.values(filters).some((value) => value != null)
                // }
                // sx={{
                //   '&:disabled': { backgroundColor: theme.palette.grey[300] },
                // }}
              >
                <ClearIcon fontSize="small" sx={{ p: 0 }} />
              </Button>
            </ButtonGroup>
            <Popper
              open={isFiltersOpen}
              anchorEl={filtersButtonRef.current}
              container={mapRef?.getContainer() ?? undefined}
              placement="bottom-end"
              style={{ zIndex: 1000 }}
            >
              <Paper
                sx={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 2,
                  padding: 2,
                  minWidth: '250px',
                  zIndex: 1001,
                }}
              >
                {/* Dropdown */}

                <FormControl>
                  <InputLabel>Aggregation</InputLabel>
                  <Select
                    value={aggregation}
                    label="Aggregation"
                    onChange={(e) => setAggregation(e.target.value)}
                  >
                    <MenuItem value="Average Hour">Average Hour</MenuItem>
                    <MenuItem value="Average Daily">Average Daily</MenuItem>
                    <MenuItem value="Total">Total</MenuItem>
                  </Select>
                </FormControl>

                {/* Date Range Slider */}
                <Box>
                  <Typography gutterBottom>Date Range</Typography>
                  <Slider
                    value={dateRange}
                    onChange={(e, newValue) =>
                      setDateRange(newValue as number[])
                    }
                    onMouseDown={(e) => {
                      e.stopPropagation()
                      mapRef?.dragging.disable()
                    }}
                    onMouseUp={() => mapRef?.dragging.enable()}
                    onTouchStart={(e) => {
                      e.stopPropagation()
                      mapRef?.dragging.disable()
                    }}
                    onTouchEnd={() => mapRef?.dragging.enable()}
                    valueLabelDisplay="auto"
                    min={1}
                    max={31}
                    size="small"
                  />
                </Box>

                {/* Hour Range Slider */}
                <Box>
                  <Typography gutterBottom>Hour Range</Typography>
                  <Slider
                    value={hourRange}
                    onChange={(_, newValue) =>
                      setHourRange(newValue as number[])
                    }
                    onMouseDown={(e) => {
                      e.stopPropagation()
                      mapRef?.dragging.disable()
                    }}
                    onMouseUp={() => mapRef?.dragging.enable()}
                    onTouchStart={(e) => {
                      e.stopPropagation()
                      mapRef?.dragging.disable()
                    }}
                    onTouchEnd={() => mapRef?.dragging.enable()}
                    valueLabelDisplay="auto"
                    min={0}
                    max={23}
                    size="small"
                  />
                </Box>
              </Paper>
            </Popper>
          </Box>
        </ClickAwayListener>
        <TileLayer
          attribution='&copy; <a href="https://www.openaip.net/">openAIP Data</a> (<a href="https://creativecommons.org/licenses/by-sa/3.0/">CC-BY-NC-SA</a>)'
          url="https://tiles.stadiamaps.com/tiles/alidade_smooth/{z}/{x}/{y}{r}.png"
        />
      </MapContainer>
    </Box>
  )
}

PedatMap.displayName = 'PedatMap'

export default memo(PedatMap)
