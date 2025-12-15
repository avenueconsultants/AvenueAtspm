// components/aggTest/useAlertPins.ts
import { useEffect, useState } from 'react'
import { generateAlertDot } from './alertPins'

type PinMap = Partial<Record<string, any>> // L.DivIcon, but keeps this file non-leaflet typed

export function useAlertPins(types: string[]) {
  const [pins, setPins] = useState<PinMap>({})

  useEffect(() => {
    let cancelled = false

    ;(async () => {
      const unique = Array.from(new Set(types))
      const pairs = await Promise.all(
        unique.map(async (t) => [t, await generateAlertDot(t)] as const)
      )
      if (cancelled) return

      const next: PinMap = {}
      for (const [t, icon] of pairs) next[t] = icon
      setPins(next)
    })()

    return () => {
      cancelled = true
    }
  }, [types.join('|')])

  return pins
}
