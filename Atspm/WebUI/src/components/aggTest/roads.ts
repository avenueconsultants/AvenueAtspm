// lib/ugrcRoads.ts
export const UGRC_ROADS_FEATURE_URL =
  'https://opendata.gis.utah.gov/datasets/478fbef62481427f95a3510a4707b24a_0/FeatureServer/0/query' // paste the /query URL from API Explorer

export async function fetchRoadsNear(
  lat: number,
  lng: number,
  radiusMeters = 120,
  outFields = ['*']
) {
  const params = new URLSearchParams({
    f: 'geojson',
    where: '1=1',
    outFields: outFields.join(','),
    returnGeometry: 'true',
    geometryType: 'esriGeometryPoint',
    inSR: '4326',
    spatialRel: 'esriSpatialRelIntersects',
    distance: String(radiusMeters),
    units: 'esriSRUnit_Meter',
    geometry: JSON.stringify({
      x: lng,
      y: lat,
      spatialReference: { wkid: 4326 },
    }),
  })

  const res = await fetch(UGRC_ROADS_FEATURE_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8',
    },
    body: params.toString(),
  })
  if (!res.ok) throw new Error(`UGRC roads ${res.status}`)
  const gj = (await res.json()) as GeoJSON.FeatureCollection
  return (gj.features ?? []).map((f) => ({
    coordinates: ((f.geometry as any).coordinates ?? []) as [number, number][],
    properties: f.properties ?? {},
  }))
}
