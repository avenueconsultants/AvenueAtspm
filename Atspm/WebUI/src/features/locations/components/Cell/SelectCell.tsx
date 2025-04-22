import { useCellNavigation } from '@/features/locations/components/Cell/CellNavigation'
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline'
import WarningAmberOutlinedIcon from '@mui/icons-material/WarningAmberOutlined'
import {
  alpha,
  Box,
  MenuItem,
  TableCell,
  Tooltip,
  Typography,
  useTheme,
} from '@mui/material'
import Select from '@mui/material/Select'
import { KeyboardEvent, ReactElement, useEffect, useRef } from 'react'

interface SelectCellProps {
  row: number
  col: number
  rowCount: number
  colCount: number
  value: string
  onUpdate: (v: string) => void
  options: { value: string; label: string; icon?: ReactElement }[]
  error?: string
  warning?: string
}

const SelectCell = ({
  row,
  col,
  rowCount,
  colCount,
  value,
  onUpdate,
  options,
  error,
  warning,
}: SelectCellProps) => {
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
  const isFocused = tabIndex === 0 && !isEditing

  useEffect(() => {
    if (isFocused) cellRef.current?.focus()
  }, [isFocused])

  const handleCellClick = () => {
    if (!isEditing) openEditor()
  }

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
      onUpdate('')
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
      onUpdate(value + e.key)
      return
    }
    navKeyDown(e)
  }

  const handleSelectKeyDown = (
    e: KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
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
      data-row={row}
      data-col={col}
      sx={{
        height: 48,
        width: 140,
        boxSizing: 'border-box',
        borderRight: '0.5px solid lightgrey',
        p: 0,
        position: 'relative',
        outline: 'none',
        caretColor: isEditing ? theme.palette.text.primary : 'transparent',
        '&:focus, &:focus-visible': { outline: 'none' },
        ...(isEditing && { bgcolor: innerColor }),
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
          <Box sx={{ position: 'relative', width: '100%', height: '100%' }}>
            {isEditing ? (
              <Select
                open={isEditing}
                onClose={() => {
                  closeEditor()
                  setTimeout(() => cellRef.current?.focus())
                }}
                value={value}
                onChange={(e) => {
                  onUpdate(e.target.value)
                  closeEditor()
                  setTimeout(() => cellRef.current?.focus())
                }}
                onKeyDown={handleSelectKeyDown}
                variant="standard"
                disableUnderline
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
                    padding: 0,
                  },
                }}
                IconComponent={() =>
                  error ? (
                    <ErrorOutlineIcon role="img" aria-label={error} />
                  ) : warning ? (
                    <WarningAmberOutlinedIcon role="img" aria-label={warning} />
                  ) : null
                }
              >
                {options.map((opt) => (
                  <MenuItem
                    key={opt.value}
                    value={opt.value}
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 1,
                    }}
                  >
                    {opt.icon}
                    {opt.label}
                  </MenuItem>
                ))}
              </Select>
            ) : (
              <Typography
                onDoubleClick={openEditor}
                noWrap
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1,
                  height: '100%',
                  lineHeight: '44px',
                  px: 1,
                  cursor: 'pointer',
                }}
              >
                {options.find((opt) => opt.value === value)?.icon}
                {options.find((opt) => opt.value === value)?.label ?? value}
              </Typography>
            )}
          </Box>
        </>
      </Tooltip>
    </TableCell>
  )
}

export default SelectCell
