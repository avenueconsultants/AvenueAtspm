// components/aggTest/alertPins.tsx
import { Color } from '@/features/charts/utils'

export const alertTypeMap: Record<string, { color: string; size?: number }> = {
  'intersection.red-light': { color: Color.BrightRed, size: 12 },
  'intersection.near-miss': { color: Color.Orange, size: 12 },
  'intersection.illegal-movement': { color: Color.Purple, size: 12 },
  'object.wrong-way': { color: Color.BrightRed, size: 12 },
  Default: { color: Color.Grey, size: 12 },
}

export function getAlertTypeConfig(type: string) {
  return alertTypeMap[type] || alertTypeMap.Default
}

export async function createDotIcon({
  color,
  size = 12,
}: {
  color: string
  size?: number
}) {
  const Leaflet = await import('leaflet')
  const L: any = (Leaflet as any).default ?? Leaflet

  return L.divIcon({
    html: `
      <div
        style="
          width:${size}px;
          height:${size}px;
          border-radius:9999px;
          background:${color};
        "
      ></div>
    `,
    className: '', // no Leaflet default styles
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2], // center on lat/lng
  })
}

export async function generateAlertDot(type: string) {
  const cfg = getAlertTypeConfig(type)
  return createDotIcon({
    color: cfg.color,
    size: cfg.size ?? 12,
  })
}
