import { useGetLocationLocationsForSearch } from '@/api/config'
import { useAlertsHub } from '@/components/aggTest/useAlertsHub'
import dynamic from 'next/dynamic'
import { useMemo, useState } from 'react'

const ClientMap = dynamic(() => import('@/components/aggTest/ClientMap'), {
  ssr: false,
})

export default function DemoWsMapPage() {
  const { data: locationsData } = useGetLocationLocationsForSearch()

  const allLocations = useMemo(() => {
    const arr: any[] = (locationsData as any)?.value ?? []
    return arr
      .filter(Boolean)
      .map((l) => ({
        id: String(
          l.value ?? l.locationIdentifier ?? l.id ?? l.LocationIdentifier
        ),
        x: l.id,
        lat: Number(l.latitude ?? l.lat ?? l.Latitude),
        lng: Number(l.longitude ?? l.lon ?? l.lng ?? l.Longitude),
        raw: l,
      }))
      .filter((l) => Number.isFinite(l.lat) && Number.isFinite(l.lng))
  }, [locationsData])

  const locations = useMemo(() => allLocations, [allLocations])

  const [volumes, setVolumes] = useState<Record<string, number>>({})
  const [dirVolumes, setDirVolumes] = useState<
    Record<
      string,
      Partial<
        Record<'Northbound' | 'Southbound' | 'Eastbound' | 'Westbound', number>
      >
    >
  >({})

  const { state, alerts } = useAlertsHub({
    tenantId: 'default',
  })

  // useEffect(() => {
  //   if (!batch || Object.keys(batch).length === 0) return
  //   setVolumes((prev) => ({ ...prev, ...batch }))
  // }, [batch])

  // useEffect(() => {
  //   if (!dirBatch || Object.keys(dirBatch).length === 0) return
  //   setDirVolumes((prev) => {
  //     const next = { ...prev }
  //     for (const [id, dirs] of Object.entries(dirBatch)) {
  //       next[id] = { ...(prev[id] ?? {}), ...dirs }
  //     }
  //     return next
  //   })
  // }, [dirBatch])

  console.log('alerts:', alerts)

  const center = useMemo(() => {
    return [39.3, -111.7] as [number, number]
  }, [])

  return (
    <div
      style={{ display: 'grid', gridTemplateRows: 'auto 1fr', height: '100vh' }}
    >
      <header style={{ padding: '12px 16px', borderBottom: '1px solid #ddd' }}>
        <strong>Live Volumes</strong>
        <span style={{ marginLeft: 8 }}>{state}</span>
      </header>
      <ClientMap
        alerts={alerts}
        center={center}
        locations={locations}
        volumes={volumes}
        dirVolumes={dirVolumes}
      />
    </div>
  )
}
