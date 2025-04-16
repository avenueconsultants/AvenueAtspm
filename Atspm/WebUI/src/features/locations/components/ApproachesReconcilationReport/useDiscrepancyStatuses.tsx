// useDiscrepancyStatuses.ts
import { useEffect, useState } from 'react'

export type ItemStatus = 'pending' | 'ignored' | 'added' | 'deleted' | 'unsaved'

interface Categories {
  notFoundApproaches: { id: number; [key: string]: any }[]
  notFoundDetectorChannels: string[]
  foundPhaseNumbers: number[]
  foundDetectorChannels: string[]
}

interface Approach {
  id: number
  protectedPhaseNumber: number
  isNew?: boolean
  detectors: {
    detectorChannel?: string | number
    isNew?: boolean
  }[]
}

const useDiscrepancyStatuses = (
  categories: Categories,
  approaches: Approach[]
) => {
  const [itemStatuses, setItemStatuses] = useState<Record<string, ItemStatus>>(
    {}
  )

  const updateStatus = (id: string, status: ItemStatus) => {
    console.log(`Updating status for ${id} to ${status}`)
    setItemStatuses((prev) => ({ ...prev, [id]: status }))
  }

  useEffect(() => {
    categories.notFoundApproaches.forEach((approach) => {
      const key = `notfound_app_${approach.id}`
      const exists = approaches.some((a) => a.id === approach.id)
      if (!exists && itemStatuses[key] !== 'deleted') {
        setItemStatuses((prev) => ({ ...prev, [key]: 'deleted' }))
      }
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [approaches, categories.notFoundApproaches])

  // Update statuses for not-found detector channels.
  useEffect(() => {
    const storeDetectorChannels = approaches.flatMap((a) =>
      a.detectors.map((d) => d.detectorChannel?.toString())
    )
    categories.notFoundDetectorChannels.forEach((det) => {
      const key = `notfound_det_${det}`
      const exists = storeDetectorChannels.includes(det)
      if (!exists && itemStatuses[key] !== 'deleted') {
        setItemStatuses((prev) => ({ ...prev, [key]: 'deleted' }))
      }
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [approaches, categories.notFoundDetectorChannels])

  // Update statuses for found phase numbers.
  useEffect(() => {
    categories.foundPhaseNumbers.forEach((phase) => {
      const key = `found_phase_${phase}`
      const matchingApproaches = approaches.filter(
        (a) => a.protectedPhaseNumber === phase
      )
      if (matchingApproaches.length > 0) {
        const existsNonNew = matchingApproaches.some((a) => !a.isNew)
        if (existsNonNew && (itemStatuses[key] || 'pending') === 'pending') {
          setItemStatuses((prev) => ({ ...prev, [key]: 'added' }))
        } else if (
          !existsNonNew &&
          (itemStatuses[key] || 'pending') === 'pending'
        ) {
          setItemStatuses((prev) => ({ ...prev, [key]: 'unsaved' }))
        }
      }
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [approaches, categories.foundPhaseNumbers])

  // Update statuses for found detector channels.
  useEffect(() => {
    categories.foundDetectorChannels.forEach((det) => {
      const key = `found_det_${det}`
      const matchingDetectors = approaches
        .flatMap((a) => a.detectors)
        .filter((d) => d.detectorChannel?.toString() === det.toString())
      if (matchingDetectors.length > 0) {
        const existsNonNew = matchingDetectors.some((d) => !d.isNew)
        if (existsNonNew && (itemStatuses[key] || 'pending') === 'pending') {
          setItemStatuses((prev) => ({ ...prev, [key]: 'added' }))
        } else if (
          !existsNonNew &&
          (itemStatuses[key] || 'pending') === 'pending'
        ) {
          setItemStatuses((prev) => ({ ...prev, [key]: 'unsaved' }))
        }
      }
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [approaches, categories.foundDetectorChannels])

  return { itemStatuses, updateStatus }
}

export default useDiscrepancyStatuses
