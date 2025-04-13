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
    label: 'Configure Devices',
    description:
      'We’ll automatically sync devices and confirm they are connected and reporting data correctly.',
    actionLabel: 'Sync Devices',
  },
  {
    label: 'Reconcile Approaches and Detectors',
    description:
      'We’ll validate detector configuration by comparing setup against live data from the synced devices.',
    actionLabel: 'Validate Approaches',
  },
]

export default function LocationSetupWizard() {
  const { addNotification } = useNotificationStore()
  const { activeStep, setActiveStep } = useLocationWizardStore()

  const [isComplete, setIsComplete] = React.useState(false)

  const handleNext = () => {
    if (activeStep < steps.length - 1) {
      setActiveStep(activeStep + 1)
    } else {
      // Only complete when last step is done
      setIsComplete(true)
      addNotification({
        title: 'Location setup completed! 🎉',
        type: 'success',
      })
    }
  }

  const handleBack = () => {
    if (activeStep > 0) {
      setActiveStep(activeStep - 1)
    }
  }

  const handleReset = () => {
    setActiveStep(0)
    setIsComplete(false)
  }

  if (isComplete) {
    return (
      <Box
        sx={{
          position: 'fixed',
          bottom: 20,
          right: 20,
          width: 360,
          zIndex: 1300,
          bgcolor: 'background.paper',
          p: 2,
          borderRadius: 2,
          boxShadow: 3,
        }}
      >
        <Typography variant="h6" gutterBottom>
          🎉 Setup Complete!
        </Typography>
        <Typography variant="body2" color="text.secondary">
          You’ve finished setting up this location.
        </Typography>
        <Button onClick={handleReset} sx={{ mt: 2 }}>
          Restart Setup
        </Button>
      </Box>
    )
  }

  return (
    <Box
      sx={{
        position: 'fixed',
        bottom: 20,
        right: 20,
        width: 360,
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
          <Step key={step.label}>
            <StepLabel>{step.label}</StepLabel>
            <StepContent>
              <Typography variant="body2" color="text.secondary">
                {step.description}
              </Typography>
              <Box sx={{ mt: 2 }}>
                <Button variant="contained" onClick={handleNext} sx={{ mr: 1 }}>
                  {step.actionLabel}
                </Button>
                <Button disabled={index === 0} onClick={handleBack}>
                  Back
                </Button>
              </Box>
            </StepContent>
          </Step>
        ))}
      </Stepper>
    </Box>
  )
}
