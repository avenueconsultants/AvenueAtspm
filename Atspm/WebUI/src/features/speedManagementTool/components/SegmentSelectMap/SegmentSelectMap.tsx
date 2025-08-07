import { Segment } from '@/api/speedManagement/aTSPMSpeedManagementApi.schemas'
import { ROUTE_COLORS } from '@/features/speedManagementTool/components/SegmentEditor/SegmentEditorMap/utils/colors'
import { useSegmentEditorStore } from '@/features/speedManagementTool/components/SegmentEditor/segmentEditorStore'
import { getEnv } from '@/utils/getEnv'
import {
  Alert,
  Box,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableRow,
} from '@mui/material'
import L, { Map as LeafletMap } from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { useRouter } from 'next/router'
import React, { memo, useCallback, useEffect, useMemo, useState } from 'react'
import { MapContainer, Polyline, TileLayer } from 'react-leaflet'

interface SegmentPolylinesProps {
  segments: Segment[]
  selectedSegmentIds: string[]
  onSegmentSelect: (segment: Segment) => void
  zoomLevel: number
  setHoveredSegment: (segment: Segment | null) => void
}

const getPolylineWeight = (zoom: number) => {
  if (zoom >= 18) return 5
  if (zoom >= 15) return 3
  if (zoom >= 12) return 2
  if (zoom >= 10) return 1
  return 2
}

const SegmentPolylines: React.FC<SegmentPolylinesProps> = memo(
  function SegmentPolylines({
    segments,
    onSegmentSelect,
    zoomLevel,
    setHoveredSegment,
  }) {
    const baseWeight = getPolylineWeight(zoomLevel)

    return (
      <>
        {segments.map((segment, index) => {
          if (!segment.geometry?.coordinates) return null
          return (
            <React.Fragment key={`segment-${segment.id}-${index}`}>
              <Polyline
                key={`segment-${segment.id}-main${segment.properties.udotRouteNumber}`}
                pathOptions={{
                  color: ROUTE_COLORS.Draft.main,
                  weight: baseWeight,
                  lineCap: 'round',
                  opacity: 1,
                }}
                smoothFactor={0}
                positions={segment.geometry.coordinates}
                eventHandlers={{
                  click: () => onSegmentSelect(segment),
                  mouseover: (e) => {
                    setHoveredSegment(segment)
                    e.target.bringToFront()
                    e.target.setStyle({
                      weight: getPolylineWeight(zoomLevel) + 3,
                      color: ROUTE_COLORS.Draft.hover,
                    })
                  },
                  mouseout: (e) => {
                    setHoveredSegment(null)
                    e.target.setStyle({
                      weight: getPolylineWeight(zoomLevel),
                      color: ROUTE_COLORS.Draft.main,
                    })
                  },
                }}
              />
            </React.Fragment>
          )
        })}
      </>
    )
  }
)

const SegmentSelectMap: React.FC = () => {
  const {
    allSegments,
    associatedEntityIds,
    setAssociatedEntityIds,
    reset,
    isLoadingSegments,
    mapCenter,
    setMapCenter,
  } = useSegmentEditorStore()
  const router = useRouter()
  const [mapRef, setMapRef] = useState<LeafletMap | null>(null)
  const [hoveredSegment, setHoveredSegment] = useState<Segment | null>(null)

  // Fallback coordinates if env is not set
  const FALLBACK_CENTER: { lat: number; lng: number; zoom: number } = {
    lat: 40.7608,
    lng: -111.891,
    zoom: 10,
  }

  const handleSegmentClick = useCallback(
    (segment: Segment) => {
      reset()
      router.push({
        pathname: `/admin/segments/${segment.id}`,
      })
    },
    [router, setAssociatedEntityIds, reset]
  )

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

  // Update zoom level when the map zooms
  useEffect(() => {
    if (mapRef) {
      const updateMapState = () => {
        const center = mapRef.getCenter()
        setMapCenter({
          lat: center.lat,
          lng: center.lng,
          zoom: mapRef.getZoom(),
        })
      }
      mapRef.on('zoomend', updateMapState)
      return () => {
        if (mapRef) {
          mapRef.off('zoomend', updateMapState)
        }
      }
    }
  }, [mapRef, setMapCenter])

  // Initialize initialLatLong and fit bounds
  useEffect(() => {
    const initializeMap = async () => {
      if (
        associatedEntityIds.length > 0 &&
        allSegments &&
        allSegments.length > 0 &&
        mapCenter !== null
      ) {
        const bounds = L.latLngBounds([])
        associatedEntityIds.forEach((id) => {
          const segment = allSegments.find((segment) => segment.id === id)
          if (segment?.geometry?.coordinates) {
            segment.geometry.coordinates.forEach((coord: [number, number]) => {
              bounds.extend(coord)
            })
          }
        })
        if (bounds.isValid() && mapRef) {
          mapRef.fitBounds(bounds, { padding: [100, 100] })
          const center = bounds.getCenter()
          setMapCenter({
            lat: center.lat,
            lng: center.lng,
            zoom: mapRef.getZoom(),
          })
        }
      } else if (!mapCenter) {
        try {
          const env = await getEnv()
          const newCenter: { lat: number; lng: number; zoom: number } = {
            lat: parseFloat(env?.MAP_DEFAULT_LATITUDE),
            lng: parseFloat(env?.MAP_DEFAULT_LONGITUDE),
            zoom:
              parseInt(env?.MAP_DEFAULT_ZOOM_LEVEL, 10) || FALLBACK_CENTER.zoom,
          }
          setMapCenter(newCenter)
        } catch (error) {
          console.error('Failed to fetch env:', error)
          setMapCenter(FALLBACK_CENTER)
        }
      }
    }
    initializeMap()
  }, [allSegments, mapRef])

  const memoizedSegmentPolylines = useMemo(
    () => (
      <SegmentPolylines
        segments={allSegments || []}
        onSegmentSelect={handleSegmentClick}
        zoomLevel={mapCenter?.zoom || FALLBACK_CENTER.zoom}
        setHoveredSegment={setHoveredSegment}
      />
    ),
    [allSegments, handleSegmentClick, mapCenter?.zoom, FALLBACK_CENTER.zoom]
  )

  if (!mapCenter) {
    console.log('Initial coordinates not set yet.')
    return null
  }

  return (
    <Box sx={{ height: '100%', width: '100%', position: 'relative' }}>
      {isLoadingSegments && (
        <Alert
          sx={{
            position: 'absolute',
            top: 16,
            right: 16,
            zIndex: 1000,
            maxWidth: '300px',
          }}
          severity="info"
        >
          Segments are loading...
        </Alert>
      )}
      <MapContainer
        center={[mapCenter.lat, mapCenter.lng]}
        zoom={mapCenter.zoom}
        scrollWheelZoom={true}
        style={{
          height: '100%',
          width: '100%',
        }}
        renderer={L.canvas({ tolerance: 5 })}
        ref={setMapRef}
        doubleClickZoom={false}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openaip.net/">openAIP Data</a> (<a href="https://creativecommons.org/licenses/by-sa/3.0/">CC-BY-NC-SA</a>)'
          url="https://tiles.stadiamaps.com/tiles/alidade_smooth/{z}/{x}/{y}{r}.png"
        />
        {memoizedSegmentPolylines}
      </MapContainer>
      {hoveredSegment && (
        <Paper
          elevation={3}
          sx={{
            position: 'absolute',
            bottom: '20px',
            left: '20px',
            padding: '8px 12px',
            backgroundColor: 'rgba(255, 255, 255, 0.9)',
            zIndex: 1000,
            pointerEvents: 'none',
          }}
        >
          <TableContainer>
            <Table size="small">
              <TableBody>
                <TableRow>
                  <TableCell sx={{ fontWeight: 'bold' }}>
                    Segment Name:
                  </TableCell>
                  <TableCell align="right">
                    {hoveredSegment.properties.name}
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell sx={{ fontWeight: 'bold' }}>
                    Speed Limit:
                  </TableCell>
                  <TableCell align="right">
                    {hoveredSegment.properties.speedLimit} mph
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      )}
    </Box>
  )
}

SegmentSelectMap.displayName = 'SegmentSelectMap'

export default memo(SegmentSelectMap)
