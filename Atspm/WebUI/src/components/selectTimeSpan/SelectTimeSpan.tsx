import {
  Alert,
  Badge,
  Box,
  Button,
  Divider,
  FormControl,
  FormControlLabel,
  FormLabel,
  Radio,
  RadioGroup,
  Skeleton,
  Tooltip,
  Typography,
} from '@mui/material'
import {
  DateCalendar,
  DateOrTimeView,
  DatePicker,
  DateTimePicker,
  PickersDay,
  PickersDayProps,
  TimePicker,
} from '@mui/x-date-pickers'
import { add, isSameDay, isValid, set, startOfToday } from 'date-fns'
import { useEffect, useId, useState } from 'react'
import { loopingTimeViewRenderers } from './LoopingTimeView'

export interface SelectDateTimeProps {
  startDateTime: Date | null
  endDateTime: Date | null
  changeStartDate(date: Date): void
  changeEndDate(date: Date): void
  views?: DateOrTimeView[]
  dateFormat?: string
  noCalendar?: boolean
  calendarLocation?: 'bottom' | 'right'
  startDateOnly?: boolean
  singleDay?: boolean
  timePeriod?: boolean
  startTimePeriod?: Date
  endTimePeriod?: Date
  changeStartTimePeriod?(date: Date): void
  changeEndTimePeriod?(date: Date): void
  markDays?: Date[]
  onMonthChange?(date: Date): void
  onChange?(date: Date): void
  warning?: string | null
}

export default function SelectDateTime({
  startDateTime,
  endDateTime,
  changeStartDate,
  changeEndDate,
  views,
  dateFormat = 'MMM dd, yyyy @ HH:mm',
  noCalendar,
  calendarLocation = 'bottom',
  timePeriod,
  startTimePeriod,
  endTimePeriod,
  startDateOnly,
  singleDay = false,
  changeStartTimePeriod,
  changeEndTimePeriod,
  markDays = [],
  onMonthChange,
  onChange,
  warning = null,
}: SelectDateTimeProps) {
  const [showWarning, setShowWarning] = useState(false)
  const [showCalendar, setShowCalendar] = useState(false)
  const [timeRange, setTimeRange] = useState<'allDay' | 'custom'>('allDay')
  const timeRangeLabelId = useId()

  const changeSingleDay = (date: Date | null) => {
    if (!date || !isValid(date)) return
    const allDay = timeRange === 'allDay'
    changeStartDate(
      set(date, {
        hours: allDay ? 0 : (startDateTime?.getHours() ?? 0),
        minutes: allDay ? 0 : (startDateTime?.getMinutes() ?? 0),
        seconds: 0,
        milliseconds: 0,
      })
    )
    changeEndDate(
      set(date, {
        hours: allDay ? 23 : (endDateTime?.getHours() ?? 23),
        minutes: allDay ? 59 : (endDateTime?.getMinutes() ?? 59),
        seconds: 0,
        milliseconds: 0,
      })
    )
    onChange?.(date)
  }

  useEffect(() => {
    const timer = setTimeout(() => {
      setShowCalendar(true)
    }, 0)
    return () => clearTimeout(timer)
  }, [])

  useEffect(() => {
    setShowWarning(!!warning)
  }, [warning])

  const handleCalendarChange = (newDate: Date | null) => {
    if (singleDay) {
      changeSingleDay(newDate)
      return
    }
    onChange?.(newDate as Date)
    if (!newDate) return
    if (!endDateTime || !startDateTime) return

    changeStartDate(newDate)
    const newEndDate = new Date(newDate)
    newEndDate.setHours(endDateTime.getHours())
    newEndDate.setMinutes(endDateTime.getMinutes())
    if (
      startDateTime.getMonth() === endDateTime.getMonth() &&
      startDateTime.getDate() === endDateTime.getDate()
    ) {
      changeEndDate(newEndDate)
    } else {
      changeEndDate(add(newEndDate, { days: 1 }))
    }
  }

  const handleResetDate = () => {
    const newStart = startOfToday()
    const newEnd = startOfToday()

    if (singleDay) {
      setTimeRange('allDay')
      changeStartDate(newStart)
      changeEndDate(set(newEnd, { hours: 23, minutes: 59 }))
      onChange?.(newStart)
      return
    }

    changeStartDate(newStart)
    changeEndDate(newEnd)

    if (changeStartTimePeriod) {
      changeStartTimePeriod(new Date(new Date().setHours(0, 0, 0, 0)))
    }

    if (changeEndTimePeriod) {
      changeEndTimePeriod(new Date(new Date().setHours(23, 59, 0, 0)))
    }
  }

  const displayCalendarContainer = () => {
    return showCalendar ? (
      <DateCalendar
        value={startDateTime}
        onChange={handleCalendarChange}
        onMonthChange={onMonthChange}
        onYearChange={onMonthChange}
        showDaysOutsideCurrentMonth={true}
        disableFuture={true}
        slots={{
          day: MarkedDay,
        }}
        slotProps={{
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          day: { highlightedDays: markDays } as any,
        }}
        shouldDisableDate={(date) => {
          if (!markDays) return false
          return markDays.some((missing: Date) => isSameDay(missing, date))
        }}
      />
    ) : (
      <Skeleton width={320} height={334} />
    )
  }

  const handleSameDay = () => {
    if (!startDateTime || !endDateTime) return
    const newEndDate = new Date(startDateTime)
    newEndDate.setHours(endDateTime.getHours())
    newEndDate.setMinutes(endDateTime.getMinutes())
    changeEndDate(newEndDate)
  }

  const sideBySideStyleOuterBoxStyle = {
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 2,
  }

  const sideBySideStyleInnerBoxStyle = {
    display: 'flex',
    flexDirection: 'column',
    flex: 1,
    gap: 2,
    mt: 1,
  }

  return (
    <>
      <Box
        sx={calendarLocation === 'right' ? sideBySideStyleOuterBoxStyle : {}}
      >
        <Box
          sx={
            calendarLocation === 'right'
              ? sideBySideStyleInnerBoxStyle
              : { display: 'flex', flexDirection: 'column' }
          }
        >
          {singleDay ? (
            <>
              <DatePicker
                label="Date"
                value={startDateTime}
                onChange={changeSingleDay}
                format="MMM dd, yyyy"
                disableFuture
                sx={{ width: '100%' }}
              />
              <FormControl sx={{ mt: 2 }}>
                <FormLabel id={timeRangeLabelId} sx={{ fontSize: 13 }}>
                  Time range
                </FormLabel>
                <RadioGroup
                  row
                  aria-labelledby={timeRangeLabelId}
                  value={timeRange}
                  onChange={(_, value) => {
                    setTimeRange(value as 'allDay' | 'custom')
                    if (startDateTime) {
                      changeStartDate(
                        set(startDateTime, {
                          hours: value === 'allDay' ? 0 : 12,
                          minutes: 0,
                          seconds: 0,
                          milliseconds: 0,
                        })
                      )
                      changeEndDate(
                        set(startDateTime, {
                          hours: value === 'allDay' ? 23 : 14,
                          minutes: value === 'allDay' ? 59 : 0,
                          seconds: 0,
                          milliseconds: 0,
                        })
                      )
                    }
                  }}
                >
                  <FormControlLabel
                    value="allDay"
                    control={<Radio size="small" />}
                    label="All day"
                  />
                  <FormControlLabel
                    value="custom"
                    control={<Radio size="small" />}
                    label="Custom"
                  />
                </RadioGroup>
              </FormControl>
              {timeRange === 'custom' && (
                <Box sx={{ display: 'flex', gap: 1.5, mt: 1 }}>
                  <TimePicker
                    label="Start time"
                    ampm={false}
                    format="HH:mm"
                    viewRenderers={loopingTimeViewRenderers}
                    value={startDateTime}
                    onChange={(date) => {
                      if (!date || !isValid(date) || !startDateTime) return
                      changeStartDate(
                        set(startDateTime, {
                          hours: date.getHours(),
                          minutes: date.getMinutes(),
                          seconds: 0,
                          milliseconds: 0,
                        })
                      )
                    }}
                    slotProps={{
                      textField: { size: 'small' },
                      actionBar: { actions: ['accept'] },
                    }}
                    sx={{ flex: 1, minWidth: 0 }}
                  />
                  <TimePicker
                    label="End time"
                    ampm={false}
                    format="HH:mm"
                    viewRenderers={loopingTimeViewRenderers}
                    value={endDateTime}
                    minTime={startDateTime ?? undefined}
                    onChange={(date) => {
                      if (!date || !isValid(date) || !startDateTime) return
                      changeEndDate(
                        set(startDateTime, {
                          hours: date.getHours(),
                          minutes: date.getMinutes(),
                          seconds: 0,
                          milliseconds: 0,
                        })
                      )
                    }}
                    slotProps={{
                      textField: { size: 'small' },
                      actionBar: { actions: ['accept'] },
                    }}
                    sx={{ flex: 1, minWidth: 0 }}
                  />
                </Box>
              )}
            </>
          ) : (
            <DateTimePicker
              sx={{ width: '100%' }}
              value={startDateTime}
              onChange={(date) => date && changeStartDate(date)}
              views={views}
              label="Start"
              format={dateFormat}
              ampm={false}
              disableFuture
              minutesStep={1}
            />
          )}
          {!singleDay && !startDateOnly && (
            <DateTimePicker
              sx={{ width: '100%', mt: calendarLocation === 'right' ? 0 : 3 }}
              value={endDateTime}
              onChange={(date) => date && changeEndDate(date)}
              format={dateFormat}
              views={views}
              label="End"
              ampm={false}
            />
          )}
          {timePeriod && (
            <>
              <Divider sx={{ mb: 2, margin: '15px' }}>
                <Typography sx={{ fontSize: '13px' }} variant="caption">
                  Time Period
                </Typography>
              </Divider>
              <Box sx={{ display: 'flex', gap: 2 }}>
                <TimePicker
                  label="Start Time"
                  ampm={false}
                  closeOnSelect
                  value={startTimePeriod}
                  onChange={(value) => changeStartTimePeriod?.(value as Date)}
                />
                <TimePicker
                  label="End Time"
                  ampm={false}
                  closeOnSelect
                  value={endTimePeriod}
                  onChange={(value) => changeEndTimePeriod?.(value as Date)}
                />
              </Box>
            </>
          )}
          <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
            {!singleDay && !startDateOnly && (
              <Button onClick={handleSameDay}>Same Day</Button>
            )}
            <Button onClick={handleResetDate}>Reset</Button>
          </Box>
          {!noCalendar && calendarLocation === 'bottom' && (
            <Box mx={-3}>{displayCalendarContainer()}</Box>
          )}
        </Box>
        {!noCalendar && calendarLocation === 'right' && (
          <Box sx={{ mt: -2 }}>{displayCalendarContainer()}</Box>
        )}
      </Box>
      {showWarning && warning && <Alert severity="warning">{warning}</Alert>}
    </>
  )
}

interface MarkedDayProps extends PickersDayProps<Date> {
  highlightedDays?: Date[] | undefined
}

function MarkedDay(props: MarkedDayProps) {
  const { highlightedDays, day, outsideCurrentMonth, ...other } = props

  // If there are no highlighted days, render normally.
  if (highlightedDays === undefined) {
    return (
      <PickersDay
        {...other}
        outsideCurrentMonth={outsideCurrentMonth}
        day={day}
      />
    )
  }

  // Determine if the day is marked as missing.
  const isMissing = highlightedDays.some((missing: Date) =>
    isSameDay(missing, day)
  )
  const badgeContent = isMissing ? (
    <span
      style={{
        color: 'red',
        fontSize: '0.6rem',
        transform: 'translate(-50%, 50%)',
      }}
    >
      ✖
    </span>
  ) : null

  return (
    <Tooltip title={isMissing ? 'No data available' : ''} enterDelay={500}>
      <Badge overlap="circular" badgeContent={badgeContent}>
        <PickersDay
          {...other}
          outsideCurrentMonth={outsideCurrentMonth}
          day={day}
        />
      </Badge>
    </Tooltip>
  )
}
