// speedManagementStore.ts
import {
  RouteSpeedOptions,
  TimePeriodFilter,
} from '@/api/speedManagement/aTSPMSpeedManagementApi.schemas'
import {
  DataSource,
  RouteRenderOption,
} from '@/features/speedManagementTool/enums'
import { Map as LeafletMap } from 'leaflet'
import { create } from 'zustand'

interface StoreState {
  routeRenderOption: RouteRenderOption
  setRouteRenderOption: (option: RouteRenderOption) => void

  routeSpeedRequest: RouteSpeedOptions
  setRouteSpeedRequest: (request: RouteSpeedOptions) => void

  submittedRouteSpeedRequest: RouteSpeedOptions
  setSubmittedRouteSpeedRequest: (request: RouteSpeedOptions) => void

  mediumMin: number
  setMediumMin: (min: number) => void
  mediumMax: number
  setMediumMax: (max: number) => void
  sliderMax: number
  setSliderMax: (max: number) => void
  sliderMin: number
  setSliderMin: (min: number) => void

  multiselect: boolean
  setMultiselect: (multiselect: boolean) => void

  hotspotRoutes: any[]
  setHotspotRoutes: (routes: any[]) => void

  hoveredHotspot: any
  setHoveredHotspot: (hotspot: any) => void

  // NEW: Map ref and setter
  mapRef: LeafletMap | null
  setMapRef: (map: LeafletMap) => void
  zoomToHotspot: (coordinates: any, zoomLevel?: number) => void
}

const useSpeedManagementStore = create<StoreState>((set, get) => ({
  routeRenderOption: RouteRenderOption.Average_Speed,
  setRouteRenderOption: (option: RouteRenderOption) =>
    set({ routeRenderOption: option }),

  routeSpeedRequest: {
    sourceId: [DataSource.PeMS],
    timePeriod: TimePeriodFilter.AllDay,
    excludeSourceId: false,
    category: null,
    startDate: '2023-01-01',
    endDate: '2023-02-28',
    startTime: '1970-01-01T00:00:00.000Z',
    endTime: '1970-01-01T23:59:59.000Z',
    violationThreshold: 5,
    region: null,
    excludeRegion: false,
    county: null,
    excludeCounty: false,
    city: null,
    excludeCity: false,
    accessCategory: null,
    excludeAccessCategory: false,
    functionalType: [
      'Blank',
      'Collector Distributer',
      'Interstate',
      'Major Collector',
      'Minor Arterial',
      'Other Principal Arterial',
      'Proposed Major Collector',
      'System To System',
    ],
    excludeFunctionalType: false,
    aggClassification: 'Weekday',
  },
  submittedRouteSpeedRequest: {
    sourceId: [DataSource.PeMS],
    timePeriod: TimePeriodFilter.AllDay,
    excludeSourceId: false,
    category: null,
    startDate: '2023-01-01',
    endDate: '2023-02-28',
    startTime: '1970-01-01T00:00:00.000Z',
    endTime: '1970-01-01T23:59:59.000Z',
    violationThreshold: 5,
    region: null,
    excludeRegion: false,
    county: null,
    excludeCounty: false,
    city: null,
    excludeCity: false,
    accessCategory: null,
    excludeAccessCategory: false,
    functionalType: [
      'Blank',
      'Collector Distributer',
      'Interstate',
      'Major Collector',
      'Minor Arterial',
      'Other Principal Arterial',
      'Proposed Major Collector',
      'System To System',
    ],
    excludeFunctionalType: false,
    aggClassification: 'Weekday',
  },
  setRouteSpeedRequest: (request: RouteSpeedOptions) => {
    set({ routeSpeedRequest: request })
  },
  setSubmittedRouteSpeedRequest: (request: RouteSpeedOptions) => {
    set({ submittedRouteSpeedRequest: request })
  },

  mediumMin: 30,
  setMediumMin: (min: number) => set({ mediumMin: min }),
  mediumMax: 60,
  setMediumMax: (max: number) => set({ mediumMax: max }),
  sliderMax: 100,
  setSliderMax: (max: number) => set({ sliderMax: max }),
  sliderMin: 0,
  setSliderMin: (min: number) => set({ sliderMin: min }),

  multiselect: false,
  setMultiselect: (multiselect: boolean) => set({ multiselect }),

  hotspotRoutes: [],
  setHotspotRoutes: (routes: any[]) => set({ hotspotRoutes: routes }),

  hoveredHotspot: null,
  setHoveredHotspot: (hotspot: any) => set({ hoveredHotspot: hotspot }),

  mapRef: null,
  setMapRef: (map: LeafletMap) => set({ mapRef: map }),
  zoomToHotspot: (coordinates: any, zoomLevel?: number) => {
    const { mapRef } = get()
    if (mapRef) {
      mapRef.fitBounds(coordinates, {
        padding: [50, 50],
        maxZoom: zoomLevel ?? 10,
      })
    }
  },
}))

export default useSpeedManagementStore
