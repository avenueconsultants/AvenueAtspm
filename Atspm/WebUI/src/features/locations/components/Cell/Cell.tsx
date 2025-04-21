import { useCellNavigation } from '@/features/locations/components/Cell/CellNavigation'
import { TableCell } from '@mui/material'
import React, { useEffect, useRef } from 'react'

interface CellProps<T> {
  row: number
  col: number
  rowCount: number
  colCount: number
  value: T
  onUpdate: (v: T) => void
  children: (args: {
    value: T
    onUpdate: (v: T) => void
    isEditing: boolean
    openEditor: () => void
    closeEditor: () => void
    cellProps: {
      tabIndex: number
      onFocus: React.FocusEventHandler<HTMLElement>
      onKeyDown: React.KeyboardEventHandler<HTMLElement>
      'data-row': number
      'data-col': number
    }
  }) => React.ReactNode
}

export function Cell<T>({
  row,
  col,
  rowCount,
  colCount,
  value,
  onUpdate,
  children,
}: CellProps<T>) {
  const { tabIndex, onFocus, onKeyDown, isEditing, openEditor, closeEditor } =
    useCellNavigation(row, col, rowCount, colCount)
  const cellRef = useRef<HTMLElement>(null)
  const isFocused = tabIndex === 0 && !isEditing

  useEffect(() => {
    if (isFocused) {
      cellRef.current?.focus()
    }
  }, [isFocused])

  const cellProps = {
    tabIndex,
    onFocus,
    onKeyDown,
    'data-row': row,
    'data-col': col,
  } as const

  return (
    <TableCell
      ref={cellRef}
      role="gridcell"
      aria-rowindex={row + 1}
      aria-colindex={col + 1}
      aria-selected={isFocused}
      {...cellProps}
    >
      {children({
        value,
        onUpdate,
        isEditing,
        openEditor,
        closeEditor,
        cellProps,
      })}
    </TableCell>
  )
}
