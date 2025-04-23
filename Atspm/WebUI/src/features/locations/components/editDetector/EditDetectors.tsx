import {
  useGetDetectionType,
  useGetLocationType,
} from '@/api/config/aTSPMConfigurationApi'
import { NavigationProvider } from '@/features/locations/components/Cell/CellNavigation'
import CommentCell from '@/features/locations/components/Cell/CommentCell'
import { MultiSelectCell } from '@/features/locations/components/Cell/MultiSelectCell'
import SelectCell from '@/features/locations/components/Cell/SelectCell'
import { TextCell } from '@/features/locations/components/Cell/TextCell'
import {
  hardwareTypeOptions,
  laneTypeOptions,
  movementTypeOptions,
} from '@/features/locations/components/editDetector/selectOptions'
import {
  ConfigApproach,
  useLocationStore,
} from '@/features/locations/components/editLocation/locationStore'
import { DetectionType } from '@/features/locations/types'
import {
  Avatar,
  AvatarGroup,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tooltip,
  Typography,
  useTheme,
} from '@mui/material'
import { useMemo } from 'react'

interface EditDetectorsProps {
  approach: ConfigApproach
}

const EditDetectors = ({ approach }: EditDetectorsProps) => {
  const location = useLocationStore((s) => s.location)
  const updateDetector = useLocationStore((s) => s.updateDetector)
  const { data: dtData } = useGetDetectionType()
  const { data: ltData } = useGetLocationType()
  const theme = useTheme()

  const locationType = ltData?.value?.find(
    (type) => type.id === location?.locationTypeId
  )

  const detectionTypes = useMemo(
    () => (dtData?.value ?? []) as DetectionType[],
    [dtData]
  )

  const detectionOptions = useMemo(
    () =>
      detectionTypes
        .filter((d) => {
          if (locationType?.name === 'Intersection') {
            return ['AC', 'AS', 'LLC', 'LLS', 'SBP', 'AP'].includes(
              d.abbreviation
            )
          } else if (locationType?.name === 'Ramp') {
            return ['P', 'D', 'IQ', 'EQ'].includes(d.abbreviation)
          }
          return true
        })
        .map((d) => ({ value: d.abbreviation, label: d.description })),
    [detectionTypes, locationType]
  )

  const detectors = [...approach.detectors]

  const rowCount = detectors.length
  const colCount = 13

  return (
    <NavigationProvider>
      <TableContainer component={Paper}>
        <Table stickyHeader>
          <TableHead>
            <TableRow>
              <TableCell colSpan={9} sx={{ paddingY: 1 }} />
              <TableCell colSpan={2} align="center" sx={{ paddingY: 1 }}>
                <Typography variant="caption" fontStyle="italic">
                  Advanced Count Only
                </Typography>
              </TableCell>
              <TableCell colSpan={2} align="center" sx={{ paddingY: 1 }}>
                <Typography variant="caption" fontStyle="italic">
                  Advanced Speed Only
                </Typography>
              </TableCell>
            </TableRow>
            <TableRow>
              <TableCell sx={{ paddingY: 1, paddingLeft: 1, fontSize: '12px' }}>
                Channel
              </TableCell>
              <TableCell sx={{ paddingY: 1, fontSize: '12px' }}>
                Detection Types
              </TableCell>
              <TableCell sx={{ paddingY: 1, fontSize: '12px' }}>
                Hardware
              </TableCell>
              <TableCell sx={{ paddingY: 1, fontSize: '12px' }}>
                Latency Correction
              </TableCell>
              <TableCell sx={{ paddingY: 1, fontSize: '12px' }}>
                Lane Number
              </TableCell>
              <TableCell sx={{ paddingY: 1, fontSize: '12px' }}>
                Movement Type
              </TableCell>
              <TableCell sx={{ paddingY: 1, fontSize: '12px' }}>
                Lane Type
              </TableCell>
              <TableCell sx={{ paddingY: 1, fontSize: '12px' }}>
                Date Added
              </TableCell>
              <TableCell sx={{ paddingY: 1, fontSize: '12px' }}>
                Comments
              </TableCell>
              <TableCell sx={{ paddingY: 1, fontSize: '12px' }}>
                Distance to Stop Bar
              </TableCell>
              <TableCell sx={{ paddingY: 1, fontSize: '12px' }}>
                Decision Point
              </TableCell>
              <TableCell sx={{ paddingY: 1, fontSize: '12px' }}>
                Minimum Speed Filter
              </TableCell>
              <TableCell sx={{ paddingY: 1, fontSize: '12px' }}>
                Movement Delay
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {detectors.map((det, rowIdx) => (
              <TableRow key={det.id}>
                <TextCell
                  row={rowIdx}
                  col={0}
                  rowCount={rowCount}
                  colCount={colCount}
                  value={det.detectorChannel}
                  onUpdate={(val) =>
                    updateDetector(det.id, 'detectorChannel', val)
                  }
                />
                <MultiSelectCell<string>
                  row={rowIdx}
                  col={1}
                  rowCount={rowCount}
                  colCount={colCount}
                  value={det?.detectionTypes?.map((dt) => dt.abbreviation)}
                  options={detectionOptions}
                  onUpdate={(newAbbrs) => {
                    const newTypes = detectionTypes.filter((d) =>
                      newAbbrs.includes(d.abbreviation)
                    )
                    updateDetector(det.id, 'detectionTypes', newTypes)
                  }}
                  renderValue={(selected) => (
                    <AvatarGroup max={12}>
                      {detectionOptions.map((d) => {
                        return selected.includes(d.value) ? (
                          <Tooltip key={d.value} title={d.label}>
                            <Avatar
                              sx={{
                                bgcolor: theme.palette.primary.main,
                                width: 26,
                                height: 26,
                                fontSize: '11px',
                                WebkitPrintColorAdjust: 'exact',
                                printColorAdjust: 'exact',
                              }}
                            >
                              {d.value}
                            </Avatar>
                          </Tooltip>
                        ) : (
                          <Avatar
                            key={d.value}
                            sx={{
                              bgcolor: theme.palette.grey[400],
                              width: 26,
                              height: 26,
                              fontSize: '11px',
                              WebkitPrintColorAdjust: 'exact',
                              printColorAdjust: 'exact',
                            }}
                          >
                            {d.value}
                          </Avatar>
                        )
                      })}
                    </AvatarGroup>
                  )}
                />
                <SelectCell
                  row={rowIdx}
                  col={2}
                  rowCount={rowCount}
                  colCount={colCount}
                  options={hardwareTypeOptions}
                  value={det.detectionHardware}
                  onUpdate={(val) =>
                    updateDetector(det.id, 'detectionHardware', val)
                  }
                />
                <TextCell
                  row={rowIdx}
                  col={3}
                  rowCount={rowCount}
                  colCount={colCount}
                  value={det.latencyCorrection}
                  onUpdate={(val) =>
                    updateDetector(det.id, 'latencyCorrection', val)
                  }
                />
                <TextCell
                  row={rowIdx}
                  col={4}
                  rowCount={rowCount}
                  colCount={colCount}
                  value={det.laneNumber}
                  onUpdate={(val) => updateDetector(det.id, 'laneNumber', val)}
                />
                <SelectCell
                  row={rowIdx}
                  col={5}
                  rowCount={rowCount}
                  colCount={colCount}
                  options={movementTypeOptions}
                  value={det.movementType}
                  onUpdate={(val) =>
                    updateDetector(det.id, 'movementType', val)
                  }
                />
                <SelectCell
                  row={rowIdx}
                  col={6}
                  rowCount={rowCount}
                  colCount={colCount}
                  options={laneTypeOptions}
                  value={det.laneType}
                  onUpdate={(val) => updateDetector(det.id, 'laneType', val)}
                />
                <TextCell
                  row={rowIdx}
                  col={7}
                  rowCount={rowCount}
                  colCount={colCount}
                  value={det.dateAdded}
                  onUpdate={(val) => updateDetector(det.id, 'dateAdded', val)}
                />
                <CommentCell
                  detector={det}
                  row={rowIdx}
                  col={8}
                  rowCount={rowCount}
                  colCount={colCount}
                />
                <TextCell
                  row={rowIdx}
                  col={9}
                  rowCount={rowCount}
                  colCount={colCount}
                  value={det.distanceToStopBar}
                  onUpdate={(val) =>
                    updateDetector(det.id, 'distanceToStopBar', val)
                  }
                />
                <TextCell
                  row={rowIdx}
                  col={10}
                  rowCount={rowCount}
                  colCount={colCount}
                  value={det.decisionPoint}
                  onUpdate={(val) =>
                    updateDetector(det.id, 'decisionPoint', val)
                  }
                />
                <TextCell
                  row={rowIdx}
                  col={11}
                  rowCount={rowCount}
                  colCount={colCount}
                  value={det.minimumSpeedFilter}
                  onUpdate={(val) =>
                    updateDetector(det.id, 'minimumSpeedFilter', val)
                  }
                />
                <TextCell
                  row={rowIdx}
                  col={12}
                  rowCount={rowCount}
                  colCount={colCount}
                  value={det.movementDelay}
                  onUpdate={(val) =>
                    updateDetector(det.id, 'movementDelay', val)
                  }
                />
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </NavigationProvider>
  )
}

export default EditDetectors
