import { SpeedOverTimeOptions } from '@/api/speedManagement/aTSPMSpeedManagementApi.schemas'
import { TimeOptions } from '@/features/speedManagementTool/enums'
import useSpeedManagementStore from '@/features/speedManagementTool/speedManagementStore'
import { toUTCDateStamp } from '@/utils/dateTime'
import {
  Box,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  SelectChangeEvent,
} from '@mui/material'
import { DatePicker } from '@mui/x-date-pickers'
import { endOfMonth, isValid, parse } from 'date-fns'
import { useEffect, useState } from 'react'

interface SpeedOverTimeOptionsProps {
  onOptionsChange: (options: Partial<SpeedOverTimeOptions>) => void
  sourceId: number
}

const SpeedOverTimeChartOptions = ({
  onOptionsChange,
}: SpeedOverTimeOptionsProps) => {
  const { submittedRouteSpeedRequest } = useSpeedManagementStore()

  const [startDate, setStartDate] = useState(
    submittedRouteSpeedRequest?.startDate
      ? parse(submittedRouteSpeedRequest.startDate, 'yyyy-MM-dd', new Date())
      : null
  )
  const [endDate, setEndDate] = useState(
    submittedRouteSpeedRequest?.endDate
      ? endOfMonth(
          parse(submittedRouteSpeedRequest.endDate, 'yyyy-MM-dd', new Date())
        )
      : null
  )

  const [selectedTimeOptions, setSelectedTimeOptions] = useState<TimeOptions>(
    TimeOptions.Hour
  )

  useEffect(() => {
    if (startDate && endDate && startTime && endTime) {
      onOptionsChange({
        startDate: toUTCDateStamp(startDate),
        endDate: toUTCDateStamp(endDate),
        timeOptions: selectedTimeOptions,
      })
    } else {
      // Handle invalid dates by sending empty strings
      onOptionsChange({
        startDate: '',
        endDate: '',
        timeOptions: selectedTimeOptions,
      })
    }
  }, [startDate, endDate, selectedTimeOptions, onOptionsChange])

  const handleStartDateChange = (date: Date | null) => {
    if (date && isValid(date)) {
      setStartDate(date)
    } else {
      setStartDate(null)
    }
  }

  const handleEndDateChange = (date: Date | null) => {
    if (date && isValid(date)) {
      setEndDate(date)
    } else {
      setEndDate(null)
    }
  }

  const handleTimeOptionsChange = (event: SelectChangeEvent<TimeOptions>) => {
    setSelectedTimeOptions(event.target.value as TimeOptions)
  }

  return (
    <Box display="flex" flexDirection="column" gap={2}>
      {/* Row 1: Start Date and End Date */}
      <Box display="flex" gap={2}>
        <DatePicker
          label="Start Date"
          value={startDate}
          onChange={handleStartDateChange}
          maxDate={endDate ?? undefined}
        />
        <DatePicker
          label="End Date"
          value={endDate}
          onChange={handleEndDateChange}
          minDate={startDate ?? undefined}
        />
      </Box>

      {/* Row 3: Time Options and Source Select */}
      <Box display="flex" gap={2}>
        <FormControl sx={{ width: '150px' }}>
          <InputLabel htmlFor="time-options-select-label">Bin Size</InputLabel>
          <Select
            inputProps={{ id: 'time-options-select-label' }}
            value={selectedTimeOptions}
            label="Bin Size"
            onChange={handleTimeOptionsChange}
          >
            <MenuItem value={TimeOptions.Hour}>Hour</MenuItem>
            <MenuItem value={TimeOptions.Week}>Week</MenuItem>
            <MenuItem value={TimeOptions.Month}>Month</MenuItem>
          </Select>
        </FormControl>
      </Box>
    </Box>
  )
}

export default SpeedOverTimeChartOptions
