import { useCellNavigation } from '@/features/locations/components/Cell/CellNavigation'
import { Box, TableCell, alpha, useTheme } from '@mui/material'
import { DatePicker } from '@mui/x-date-pickers/DatePicker'
import React, { KeyboardEvent, useEffect, useRef, useState } from 'react'

interface CalendarCellProps {
  row: number
  col: number
  rowCount: number
  colCount: number
  value: string
  onUpdate: (newValue: Date) => void
}

const CalendarCell: React.FC<CalendarCellProps> = ({
  row,
  col,
  rowCount,
  colCount,
  value,
  onUpdate,
}) => {
  const theme = useTheme()
  const {
    tabIndex,
    onFocus,
    onKeyDown: navKeyDown,
    isEditing,
    openEditor,
    closeEditor,
  } = useCellNavigation(row, col, rowCount, colCount)

  const cellRef = useRef<HTMLElement>(null)
  const [selectedDate, setSelectedDate] = useState(new Date(value))
  const [pickerOpen, setPickerOpen] = useState(false)

  useEffect(() => {
    if (tabIndex === 0 && !isEditing) {
      cellRef.current?.focus()
    }
  }, [tabIndex, isEditing])

  useEffect(() => {
    setPickerOpen(isEditing)
  }, [isEditing])

  const handleCellKeyDown = (e: KeyboardEvent<HTMLElement>) => {
    if (!isEditing && e.key === 'Enter') {
      e.preventDefault()
      openEditor()
      return
    }
    if (!isEditing && e.key.startsWith('Arrow')) {
      e.preventDefault()
      navKeyDown(e)
      return
    }
    navKeyDown(e)
  }

  const handleClose = () => {
    closeEditor()
    setPickerOpen(false)
    setTimeout(() => cellRef.current?.focus())
  }

  const handleChange = (newVal: Date | null) => {
    if (!newVal) return
    setSelectedDate(newVal)
    onUpdate(newVal)
  }

  const outlineColor = theme.palette.primary.main
  const innerColor = alpha(outlineColor, 0.15)
  const isFocused = tabIndex === 0 && !isEditing

  return (
    <TableCell
      ref={cellRef}
      role="gridcell"
      aria-rowindex={row + 1}
      aria-colindex={col + 1}
      aria-selected={isFocused}
      tabIndex={tabIndex}
      onFocusCapture={onFocus}
      onKeyDown={handleCellKeyDown}
      data-row={row}
      data-col={col}
      sx={{
        minWidth: 160,
        height: 48,
        p: 0,
        position: 'relative',
        outline: 'none',
        bgcolor: isEditing ? innerColor : 'inherit',
        caretColor: isEditing ? theme.palette.text.primary : 'transparent',
        borderRight: `1px solid ${theme.palette.divider}`,
      }}
    >
      {(isEditing || isFocused) && (
        <Box
          sx={{
            pointerEvents: 'none',
            position: 'absolute',
            inset: 0,
            border: `2px solid ${outlineColor}`,
            borderRadius: 1,
            zIndex: 1,
          }}
        />
      )}
      <DatePicker
        open={pickerOpen}
        onClose={handleClose}
        value={selectedDate}
        onChange={handleChange}
        slotProps={{
          textField: {
            inputProps: { 'aria-label': 'date-added' },
          },
        }}
        sx={{
          '& fieldset': { border: 'none' },
        }}
      />
    </TableCell>
  )
}

export default CalendarCell
