// components/aggTest/TotalsLayer.tsx
import L from 'leaflet'
import { memo, useMemo } from 'react'
import { Marker, Pane } from 'react-leaflet'

type Loc = { id: string; lat: number; lng: number }
type Dir = 'Northbound' | 'Southbound' | 'Eastbound' | 'Westbound'

const fmt = (n?: number) =>
  Number.isFinite(n!) ? Math.round(n!).toString() : '—'

function makeHtml(total?: number, dirs?: Partial<Record<Dir, number>>) {
  const N = fmt(dirs?.Northbound)
  const S = fmt(dirs?.Southbound)
  const E = fmt(dirs?.Eastbound)
  const W = fmt(dirs?.Westbound)
  const T = fmt(total)

  return `
  <div class="vol-card">
    <div class="vol-grid">
      <div class="cell n" title="Northbound">${N}</div>
      <div class="cell t" title="Total">${T}</div>
      <div class="cell s" title="Southbound">${S}</div>
      <div class="cell w" title="Westbound">${W}</div>
      <div class="cell e" title="Eastbound">${E}</div>
    </div>
  </div>`
}

function TotalsLayerBase({
  locations,
  volumes,
  dirVolumes,
}: {
  locations: Loc[]
  volumes: Record<string, number>
  dirVolumes: Record<string, Partial<Record<Dir, number>>>
}) {
  const items = useMemo(
    () =>
      locations.map((l) => ({
        ...l,
        total: volumes[l.id],
        dirs: dirVolumes[l.id],
      })),
    [locations, volumes, dirVolumes]
  )

  return (
    <>
      <style>{`
        /* Reset Leaflet's default marker box so our HTML controls the visuals */
        .leaflet-marker-icon.vol-icon {
          background: transparent !important;
          border: 0 !important;
          box-shadow: none !important;
        }

        .vol-card {
          pointer-events: none;
          transform: translate(-50%, -50%);
          background: #fff;                 /* solid white */
          border: 1px solid rgba(0,0,0,0.15);
          border-radius: 10px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.15);
          padding: 6px 8px;
        }

        .vol-grid {
          display: grid;
          grid-template-areas:
            " .  n  . "
            " w  t  e "
            " .  s  . ";
          gap: 2px 8px;
          align-items: center;
          justify-items: center;
          min-width: 84px;
        }

        .cell {
          font: 600 12px/1.1 ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif;
          color: #111;
          text-shadow: 0 1px 0 rgba(255,255,255,0.6);
        }

        .cell.t {
          grid-area: t;
          font-weight: 800;
          font-size: 14px;
          padding: 2px 6px;
          border-radius: 6px;
          background: rgba(0,0,0,0.05);
          border: 1px solid rgba(0,0,0,0.08);
        }
        .cell.n { grid-area: n; }
        .cell.s { grid-area: s; }
        .cell.e { grid-area: e; }
        .cell.w { grid-area: w; }
      `}</style>

      <Pane name="totals" style={{ zIndex: 650 }}>
        {items.map(({ id, lat, lng, total, dirs }) => (
          <Marker
            key={id}
            position={[lat, lng]}
            icon={L.divIcon({
              className: 'vol-icon', // important: resets default marker box
              html: makeHtml(total, dirs),
              iconSize: undefined, // let content size the box
              iconAnchor: [0, 0], // we center via CSS translate
            })}
            interactive={false}
            keyboard={false}
          />
        ))}
      </Pane>
    </>
  )
}

const TotalsLayer = memo(TotalsLayerBase)
export default TotalsLayer
