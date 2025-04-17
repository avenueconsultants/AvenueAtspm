import {
  DetectionHardwareTypes,
  DetectionTypes,
  DirectionTypes,
  LaneTypes,
  MovementTypes,
} from '@/api/config/aTSPMConfigurationApi.schemas'
import { AddButton } from '@/components/addButton'
import { useEditApproach } from '@/features/locations/api/approach'
import ApproachEditorRowHeader from '@/features/locations/components/editApproach/ApproachEditorRow'
import DeleteApproachModal from '@/features/locations/components/editApproach/DeleteApproachModal'
import { hasUniqueDetectorChannels } from '@/features/locations/components/editApproach/utils/checkDetectors'
import EditApproachGrid from '@/features/locations/components/EditApproachGrid'
import EditDetectors from '@/features/locations/components/editDetector/EditDetectors'
import {
  ConfigApproach,
  useLocationStore,
} from '@/features/locations/components/editLocation/locationStore'
import { ConfigEnum, useConfigEnums } from '@/hooks/useConfigEnums'
import { useNotificationStore } from '@/stores/notifications'
import { Box, Collapse, Paper } from '@mui/material'
import React, { useCallback, useEffect, useRef, useState } from 'react'

interface ApproachAdminProps {
  approach: ConfigApproach
}

function EditApproach({ approach }: ApproachAdminProps) {
  const locationIdentifier = useLocationStore(
    (s) => s.location?.locationIdentifier
  )
  const channelMap = useLocationStore((s) => s.channelMap)
  const setErrors = useLocationStore((s) => s.setErrors)
  const updateApproachInStore = useLocationStore((s) => s.updateApproach)
  const copyApproachInStore = useLocationStore((s) => s.copyApproach)
  const deleteApproachInStore = useLocationStore((s) => s.deleteApproach)
  const addDetectorInStore = useLocationStore((s) => s.addDetector)
  const scrollToApproach = useLocationStore((s) => s.scrollToApproach)
  const scrollToDetector = useLocationStore((s) => s.scrollToDetector)
  const setScrollToApproach = useLocationStore((s) => s.setScrollToApproach)
  const setScrollToDetector = useLocationStore((s) => s.setScrollToDetector)

  const [open, setOpen] = useState(false)
  const [openModal, setOpenModal] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  const { addNotification } = useNotificationStore()
  const { mutate: editApproach } = useEditApproach()

  const { findEnumByNameOrAbbreviation: findDetectionType } = useConfigEnums(
    ConfigEnum.DetectionTypes
  )
  const { findEnumByNameOrAbbreviation: findDirectionType } = useConfigEnums(
    ConfigEnum.DirectionTypes
  )
  const { findEnumByNameOrAbbreviation: findLaneType } = useConfigEnums(
    ConfigEnum.LaneTypes
  )
  const { findEnumByNameOrAbbreviation: findMovementType } = useConfigEnums(
    ConfigEnum.MovementTypes
  )
  const { findEnumByNameOrAbbreviation: findDetectionHardware } =
    useConfigEnums(ConfigEnum.DetectionHardwareTypes)

  const handleApproachClick = useCallback(() => {
    setOpen((prev) => !prev)
  }, [])

  const handleSaveApproach = useCallback(() => {
    const { isValid, errors: channelErrors } =
      hasUniqueDetectorChannels(channelMap)
    let newErrors: Record<string, { error: string; id: string }> = {}

    if (!isValid) {
      newErrors = { ...newErrors, ...channelErrors }
    }
    if (
      !approach.protectedPhaseNumber ||
      isNaN(approach.protectedPhaseNumber)
    ) {
      newErrors.protectedPhaseNumber = {
        error: 'Protected Phase Number is required',
        id: String(approach.id),
      }
    }
    approach.detectors.forEach((det) => {
      if (!det.detectorChannel) {
        newErrors[String(det.id)] = {
          error: 'Detector Channel is required',
          id: String(det.id),
        }
      }
    })

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      return
    }
    setErrors(null)

    const modifiedApproach = JSON.parse(
      JSON.stringify(approach)
    ) as ConfigApproach

    if (modifiedApproach.isNew) {
      delete modifiedApproach.id
      modifiedApproach.detectors.forEach((d) => delete d.approachId)
    }
    delete modifiedApproach.index
    delete modifiedApproach.open
    delete modifiedApproach.isNew

    modifiedApproach.directionTypeId =
      findDirectionType(modifiedApproach.directionTypeId)?.value ||
      DirectionTypes.NA

    modifiedApproach.detectors.forEach((det) => {
      if (det.isNew) {
        delete det.id
      }
      delete det.isNew
      delete det.approach
      delete det.detectorComments

      det.latencyCorrection =
        det.latencyCorrection == null || det.latencyCorrection === ''
          ? 0
          : Number(det.latencyCorrection)

      det.dectectorIdentifier =
        (locationIdentifier || '') + (det.detectorChannel || '')

      det.detectionTypes.forEach((dType) => {
        dType.id = findDetectionType(dType.abbreviation)?.value
      })

      det.detectionHardware = findDetectionHardware(
        det.detectionHardware
      )?.value
      det.movementType = findMovementType(det.movementType)?.value
      det.laneType = findLaneType(det.laneType)?.value
    })

    editApproach(modifiedApproach, {
      onSuccess: (saved) => {
        try {
          const detectorsArray = saved.detectors?.$values || []
          detectorsArray.forEach((detector) => {
            detector.detectionTypes = detector.detectionTypes?.$values || []
            detector.detectionTypes.forEach((dType) => {
              dType.abbreviation =
                findDetectionType(dType.abbreviation)?.name || DetectionTypes.NA
            })
            detector.detectionHardware =
              findDetectionHardware(detector.detectionHardware)?.name ||
              DetectionHardwareTypes.NA
            detector.movementType =
              findMovementType(detector.movementType)?.name || MovementTypes.NA
            detector.laneType =
              findLaneType(detector.laneType)?.name || LaneTypes.NA
          })

          const normalizedSaved: ConfigApproach = {
            ...saved,
            isNew: false,
            directionTypeId:
              findDirectionType(saved.directionTypeId)?.name ||
              DirectionTypes.NA,
            detectors: detectorsArray,
          }

          if (approach.isNew) {
            deleteApproachInStore(approach)
            updateApproachInStore(normalizedSaved)
          } else {
            updateApproachInStore(normalizedSaved)
          }

          addNotification({
            title: 'Approach saved successfully',
            type: 'success',
          })
        } catch (error) {
          console.error('Error processing saved approach:', error)
          addNotification({
            title: 'Failed to process saved approach',
            type: 'error',
            message:
              error instanceof Error
                ? error.message
                : 'An unexpected error occurred',
          })
        }
      },
      onError: (error) => {
        console.error('Failed to save approach:', error)
        addNotification({
          title: 'Failed to save approach',
          type: 'error',
          message:
            error instanceof Error
              ? error.message
              : 'An unexpected error occurred',
        })
      },
    })
  }, [
    approach,
    channelMap,
    locationIdentifier,
    editApproach,
    setErrors,
    findDirectionType,
    findMovementType,
    findLaneType,
    findDetectionHardware,
    findDetectionType,
    updateApproachInStore,
    deleteApproachInStore,
    addNotification,
  ])

  const handleDeleteApproach = useCallback(() => {
    try {
      deleteApproachInStore(approach)
      addNotification({
        title: 'Approach deleted',
        type: 'success',
      })
    } catch (error) {
      console.error('Failed to delete:', error)
      addNotification({
        title: 'Failed to delete approach',
        type: 'error',
        message:
          error instanceof Error
            ? error.message
            : 'An unexpected error occurred',
      })
      setOpenModal(false)
    }
  }, [approach, deleteApproachInStore, addNotification])

  useEffect(() => {
    if (scrollToApproach !== approach.id) return

    containerRef.current?.scrollIntoView({
      behavior: 'smooth',
      block: 'start',
    })

    setTimeout(() => {
      if (!open) setOpen(true)
    }, 500)

    setScrollToApproach(null)
  }, [scrollToApproach, approach.id, open, setScrollToApproach])

  useEffect(() => {
    if (scrollToDetector) {
      const hasDetector = approach.detectors.some(
        (det) => det.id.toString() === scrollToDetector.toString()
      )
      if (hasDetector) {
        if (!open) setOpen(true)
        // Allow time for the collapse to open.
        setTimeout(() => {
          const el = document.getElementById(`detector-${scrollToDetector}`)
          if (el) {
            el.scrollIntoView({ behavior: 'smooth', block: 'center' })
          }
          setScrollToDetector(null)
        }, 0)
      }
    }
  }, [scrollToDetector, approach.detectors, open, setScrollToDetector])

  return (
    <div id={`approach-${approach.id}`} ref={containerRef}>
      <Paper sx={{ mt: 1 }}>
        <ApproachEditorRowHeader
          open={open}
          approach={approach}
          handleApproachClick={handleApproachClick}
          handleCopyApproach={() => copyApproachInStore(approach)}
          handleSaveApproach={handleSaveApproach}
          openDeleteApproachModal={() => setOpenModal(true)}
        />
      </Paper>
      <Collapse in={open} unmountOnExit>
        <Box minHeight="600px">
          <EditApproachGrid approach={approach} />
          <br />
          <Box display="flex" justifyContent="flex-end" mb={1}>
            <AddButton
              label="New Detector"
              onClick={() => addDetectorInStore(approach.id)}
              sx={{ m: 1 }}
            />
          </Box>
          <EditDetectors approach={approach} />
        </Box>
      </Collapse>
      <DeleteApproachModal
        openModal={openModal}
        setOpenModal={setOpenModal}
        confirmDeleteApproach={handleDeleteApproach}
      />
    </div>
  )
}

export default React.memo(EditApproach)
