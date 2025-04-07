import { create } from 'zustand'

/** A simple enum-like type to represent each step's status. */
type Status = 'NOT_STARTED' | 'READY_TO_RUN' | 'DONE'

interface LocationWizardStore {
  // Which step is currently active in the wizard
  activeStep: number
  setActiveStep: (step: number) => void

  // Device-related “download” step status
  deviceDownloadStatus: Status
  setDeviceDownloadStatus: (status: Status) => void

  // Approach-related “sync” step status
  approachSyncStatus: Status
  setApproachSyncStatus: (status: Status) => void

  // We’ll ignore the “badApproaches” and “badDetectors” details for now
  badApproaches: string[]
  badDetectors: string[]
  setBadApproaches: (approaches: number[]) => void
  setBadDetectors: (detectors: string[]) => void

  // Resets everything to initial defaults
  resetStore: () => void
}

export const useLocationWizardStore = create<LocationWizardStore>(
  (set, get) => ({
    activeStep: 0,

    // Start both statuses at 'NOT_STARTED' until the user reaches those steps
    deviceDownloadStatus: 'NOT_STARTED',
    approachSyncStatus: 'NOT_STARTED',

    badApproaches: [],
    badDetectors: [],

    setActiveStep: (step) => {
      set({ activeStep: step })

      const { deviceDownloadStatus, approachSyncStatus } = get()

      // If your device download logic is triggered at step 1
      if (step === 1 && deviceDownloadStatus === 'NOT_STARTED') {
        set({ deviceDownloadStatus: 'READY_TO_RUN' })
      }

      // If your approach sync logic is triggered at step 2
      if (step === 2 && approachSyncStatus === 'NOT_STARTED') {
        set({ approachSyncStatus: 'READY_TO_RUN' })
      }
    },

    setDeviceDownloadStatus: (status) => set({ deviceDownloadStatus: status }),
    setApproachSyncStatus: (status) => set({ approachSyncStatus: status }),

    setBadApproaches: (approaches) => set({ badApproaches: approaches }),
    setBadDetectors: (detectors) => set({ badDetectors: detectors }),

    resetStore: () => {
      set({
        activeStep: 0,
        deviceDownloadStatus: 'NOT_STARTED',
        approachSyncStatus: 'NOT_STARTED',
        badApproaches: [],
        badDetectors: [],
      })
    },
  })
)
