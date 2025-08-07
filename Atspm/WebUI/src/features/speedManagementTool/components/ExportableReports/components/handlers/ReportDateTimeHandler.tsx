import { DateTimeProps } from '@/types/TimeProps'
import { format, isValid, lastDayOfMonth, parse, set, subDays } from 'date-fns'
import { useState } from 'react'

export interface ReportDateTimeHandler extends DateTimeProps {
  changeStartMonth(date: Date | null): void
  changeEndMonth(date: Date | null): void
  parsedStartMonth: Date | null
  parsedEndMonth: Date | null
}

export const useReportDateTimeHandler = () => {
  const yesterday = subDays(new Date(), 1)

  const [startDateTime, setStartDateTime] = useState(
    set(yesterday, { hours: 16, minutes: 0 })
  )
  const [endDateTime, setEndDateTime] = useState(
    set(yesterday, { hours: 16, minutes: 20 })
  )

  const [startMonthDateString, setStartMonthDateString] =
    useState<string>('2023-01-01')
  const [endMonthDateString, setEndMonthDateString] =
    useState<string>('2023-02-01')

  const parsedStartMonthDate = startDateTime
    ? parse(startMonthDateString, 'yyyy-MM-dd', new Date())
    : null
  const parsedEndMonthDate = endDateTime
    ? parse(endMonthDateString, 'yyyy-MM-dd', new Date())
    : null

  const handleStartMonth = (date: Date | null) => {
    if (date && isValid(date)) {
      const formattedDate = format(date, 'yyyy-MM-01') // Set to the first day of the month
      setStartMonthDateString(formattedDate)
    } else {
      setStartMonthDateString('')
    }
  }

  const handleEndMonth = (date: Date | null) => {
    if (date && isValid(date)) {
      const lastDay = lastDayOfMonth(date)
      const formattedDate = format(lastDay, 'yyyy-MM-dd') // Set to the first day of the month
      setEndMonthDateString(formattedDate)
    } else {
      setEndMonthDateString('')
    }
  }

  const component: ReportDateTimeHandler = {
    startDateTime,
    endDateTime,
    parsedStartMonth: parsedStartMonthDate,
    parsedEndMonth: parsedEndMonthDate,
    changeStartDate(date: Date) {
      setStartDateTime(date)
    },
    changeEndDate(date: Date) {
      setEndDateTime(date)
    },
    changeStartMonth(date: Date | null) {
      handleStartMonth(date)
    },
    changeEndMonth(date: Date | null) {
      handleEndMonth(date)
    },
  }

  return component
}
