import { create } from 'zustand'

type Status = 'NOT_STARTED' | 'READY_TO_RUN' | 'DONE'

interface LocationWizardStore {
  // Current step in the wizard (0 = placeholder, 1 = verify devices, 2 = verify approaches)
  activeStep: number
  setActiveStep: (step: number) => void

  // Step 1 - Device verification status
  deviceVerificationStatus: Status
  setDeviceVerificationStatus: (status: Status) => void

  // Step 2 - Approach verification status
  approachVerificationStatus: Status
  setApproachVerificationStatus: (status: Status) => void

  // Optional details we may use later
  badApproaches: string[]
  badDetectors: string[]
  setBadApproaches: (approaches: number[]) => void
  setBadDetectors: (detectors: string[]) => void

  // Reset to defaults
  resetStore: () => void
}

export const useLocationWizardStore = create<LocationWizardStore>(
  (set, get) => ({
    activeStep: 0,

    deviceVerificationStatus: 'NOT_STARTED',
    approachVerificationStatus: 'NOT_STARTED',

    badApproaches: [],
    badDetectors: [],

    setActiveStep: (step) => {
      set({ activeStep: step })

      const { deviceVerificationStatus, approachVerificationStatus } = get()

      if (step === 1 && deviceVerificationStatus === 'NOT_STARTED') {
        set({ deviceVerificationStatus: 'READY_TO_RUN' })
      }

      if (step === 2 && approachVerificationStatus === 'NOT_STARTED') {
        set({ approachVerificationStatus: 'READY_TO_RUN' })
      }
    },

    setDeviceVerificationStatus: (status) =>
      set({ deviceVerificationStatus: status }),
    setApproachVerificationStatus: (status) =>
      set({ approachVerificationStatus: status }),

    setBadApproaches: (approaches) => set({ badApproaches: approaches }),
    setBadDetectors: (detectors) => set({ badDetectors: detectors }),

    resetStore: () =>
      set({
        activeStep: 0,
        deviceVerificationStatus: 'NOT_STARTED',
        approachVerificationStatus: 'NOT_STARTED',
        badApproaches: [],
        badDetectors: [],
      }),
  })
)
