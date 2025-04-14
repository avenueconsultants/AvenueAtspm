import { useLocationWizardStore } from '@/features/locations/components/LocationSetupWizard/locationSetupWizardStore'
import { useNotificationStore } from '@/stores/notifications'
import {
  Box,
  Button,
  Step,
  StepContent,
  StepLabel,
  Stepper,
  Typography,
} from '@mui/material'
import * as React from 'react'

const steps = [
  {
    label: 'Verify Devices',
    description:
      'Confirm device IPs and ensure data is being downloaded successfully.',
  },
  {
    label: 'Reconcile Detectors & Approaches',
    description:
      'Compare discovered data with your current configuration to ensure no missing or extra detectors/approaches.',
  },
]

export default function LocationSetupWizard() {
  const { addNotification } = useNotificationStore()
  const {
    activeStep,
    setActiveStep,
    setDeviceVerificationStatus,
    setApproachVerificationStatus,
  } = useLocationWizardStore()

  const [isComplete, setIsComplete] = React.useState(false)

  const handleFinish = () => {
    setIsComplete(true)
    addNotification({
      title: 'Location setup completed! 🎉',
      type: 'success',
    })
  }

  const handleReset = () => {
    setIsComplete(false)
    setActiveStep(0)
    setDeviceVerificationStatus?.('NOT_STARTED')
    setApproachVerificationStatus?.('NOT_STARTED')
  }

  const handleNextStep = () => {
    setActiveStep(activeStep + 1)
  }

  const handlePrevStep = () => {
    if (activeStep > 0) {
      setActiveStep(activeStep - 1)
    }
  }

  // STEP 0: "Verify Devices"
  const handleVerifyDevices = () => {
    if (activeStep !== 0) {
      setActiveStep(0)
    }
    // Tells <EditDevices> to open the IP checker modal
    setDeviceVerificationStatus?.('READY_TO_RUN')
  }

  // STEP 1: "Reconcile Detectors & Approaches"
  const handleReconcileApproaches = () => {
    if (activeStep !== 1) {
      setActiveStep(1)
    }
    // Tells <ApproachOptions> to run the reconciliation
    setApproachVerificationStatus?.('READY_TO_RUN')
  }

  return (
    <Box
      sx={{
        position: 'fixed',
        bottom: 20,
        right: 20,
        width: 350,
        zIndex: 1300,
        maxHeight: '80vh',
        overflowY: 'auto',
        bgcolor: 'background.paper',
        p: 2,
        borderRadius: 2,
        boxShadow: 3,
      }}
    >
      <Typography variant="h6" gutterBottom>
        Guided Setup
      </Typography>

      <Stepper activeStep={activeStep} orientation="vertical">
        {steps.map((step, index) => (
          <Step key={step.label} completed={activeStep > index}>
            <StepLabel>{step.label}</StepLabel>
            <StepContent>
              <Typography variant="body2" color="text.secondary">
                {step.description}
              </Typography>

              <Box sx={{ mt: 2, display: 'flex', gap: 1 }}>
                {/* Step 0 => Verify Devices */}
                {index === 0 && (
                  <>
                    <Button variant="contained" onClick={handleVerifyDevices}>
                      Run Verification
                    </Button>
                    <Button variant="outlined" onClick={handleNextStep}>
                      Next
                    </Button>
                  </>
                )}

                {/* Step 1 => Reconcile Detectors & Approaches */}
                {index === 1 && (
                  <>
                    <Button
                      variant="contained"
                      onClick={handleReconcileApproaches}
                    >
                      Run Reconciliation
                    </Button>
                    <Button variant="outlined" onClick={handlePrevStep}>
                      Back
                    </Button>
                    {/* <Button onClick={handleFinish} color="success">
                      Finish Setup
                    </Button> */}
                  </>
                )}
              </Box>
            </StepContent>
          </Step>
        ))}
      </Stepper>

      {isComplete && (
        <Box mt={2}>
          <Typography variant="body2" color="success.main">
            All steps completed!
          </Typography>
          <Button onClick={handleReset} sx={{ mt: 1 }} size="small">
            Reset Wizard
          </Button>
        </Box>
      )}
    </Box>
  )
}
