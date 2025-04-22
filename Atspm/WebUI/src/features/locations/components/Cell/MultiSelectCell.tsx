import { Box, TableCell, Tooltip, alpha, useTheme } from '@mui/material'
import Checkbox from '@mui/material/Checkbox'
import MenuItem from '@mui/material/MenuItem'
import Select from '@mui/material/Select'
import React, { KeyboardEvent, useEffect, useRef } from 'react'
import { useCellNavigation } from './CellNavigation'

interface MultiSelectCellProps<T> {
  row: number
  col: number
  rowCount: number
  colCount: number
  value: T[] // the array of selected values
  onUpdate: (newVals: T[]) => void
  options: { value: T; label: string }[]
  renderValue: (selected: T[]) => React.ReactNode
  error?: string
  warning?: string
}

export function MultiSelectCell<T>({
  row,
  col,
  rowCount,
  colCount,
  value,
  onUpdate,
  options,
  renderValue,
  error,
  warning,
}: MultiSelectCellProps<T>) {
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
  const selectRef = useRef<HTMLDivElement>(null)
  const isFocused = tabIndex === 0 && !isEditing

  // when we navigate to the cell, focus it
  useEffect(() => {
    if (isFocused) cellRef.current?.focus()
  }, [isFocused])

  // click or initial keypress opens the editor
  const handleCellClick = () => !isEditing && openEditor()

  const handleCellKeyDown = (e: KeyboardEvent<HTMLElement>) => {
    if (isEditing && (e.key === 'ArrowLeft' || e.key === 'ArrowRight')) {
      e.stopPropagation()
      e.preventDefault()
      return
    }
    if (isEditing) return
    if (e.key === 'Backspace') {
      e.preventDefault()
      openEditor()
      onUpdate([])
      return
    }
    if (
      e.key.length === 1 &&
      !e.ctrlKey &&
      !e.metaKey &&
      !e.key.startsWith('Arrow')
    ) {
      e.preventDefault()
      openEditor()
      onUpdate([...value, e.key as any])
      return
    }
    navKeyDown(e)
  }

  const handleSelectKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      closeEditor()
      setTimeout(() => cellRef.current?.focus())
    }
  }

  const outlineColor = theme.palette.primary.main
  const innerColor = alpha(outlineColor, 0.15)

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
      onClick={handleCellClick}
      sx={{
        height: 48,
        width: 140,
        p: 0,
        bgcolor: isEditing ? innerColor : 'inherit',
        position: 'relative',
        outline: 'none',
        borderRight: '0.5px solid lightgrey',
        caretColor: isEditing ? theme.palette.text.primary : 'transparent',
        '&:focus-visible': { outline: 'none' },
      }}
    >
      <Tooltip title={error ?? warning ?? ''}>
        <>
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
          <Box sx={{ width: '100%', height: '100%' }}>
            {isEditing ? (
              <Select
                ref={selectRef}
                multiple
                open
                value={value}
                onChange={(e) => {
                  const newVals = e.target.value as T[]
                  onUpdate(newVals)
                  closeEditor()
                  setTimeout(() => cellRef.current?.focus())
                }}
                onClose={() => closeEditor()}
                onKeyDown={handleSelectKeyDown}
                variant="standard"
                disableUnderline
                renderValue={renderValue}
                sx={{
                  height: '100%',
                  width: '100%',
                  px: 1,
                  boxSizing: 'border-box',
                  '& .MuiSelect-select': {
                    display: 'flex',
                    alignItems: 'center',
                    height: '100%',
                    lineHeight: '44px',
                    p: 0,
                  },
                }}
              >
                {options.map((opt) => (
                  <MenuItem key={opt.value as any} value={opt.value}>
                    <Checkbox checked={value.includes(opt.value)} />
                    {opt.label}
                  </MenuItem>
                ))}
              </Select>
            ) : (
              <Box
                onDoubleClick={openEditor}
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  height: '100%',
                  lineHeight: '44px',
                  px: 1,
                  cursor: 'pointer',
                }}
              >
                {renderValue(value as T[])}
              </Box>
            )}
          </Box>
        </>
      </Tooltip>
    </TableCell>
  )
}
