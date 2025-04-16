import { Button, Tooltip } from '@mui/material'
import { useTheme } from '@mui/material/styles'
import React from 'react'

export interface DiscrepancyButtonProps {
  item: { id: string | number; label: string | number }
  status: 'pending' | 'ignored' | 'added' | 'deleted' | 'unsaved'
  onClick: (e: React.MouseEvent<HTMLButtonElement>) => void
}

const DiscrepancyButton = ({
  item,
  status,
  onClick,
}: DiscrepancyButtonProps) => {
  const theme = useTheme()
  if (status === 'unsaved') {
    return (
      <Tooltip title="Added but unsaved.">
        <Button
          variant="contained"
          onClick={onClick}
          size="small"
          // color="success"
          sx={{ margin: 1, backgroundColor: '#59b259' }}
          disableElevation
        >
          {item.label}
        </Button>
      </Tooltip>
    )
  }
  return (
    <Button
      variant="outlined"
      onClick={onClick}
      size="small"
      sx={{
        margin: 1,
        color: theme.palette.grey[700],
        borderColor: theme.palette.grey[700],
      }}
      disableElevation
    >
      {item.label}
    </Button>
  )
}

export default DiscrepancyButton
