import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import { Box, Stack, Tooltip, Typography } from '@mui/material'
import { useTheme } from '@mui/material/styles'
import React from 'react'
import DiscrepancyButton from './DiscrepancyButton'

export interface DiscrepancyItem {
  id: string | number
  label: string | number
  kind?: string
}

export type ItemStatus = 'pending' | 'ignored' | 'added' | 'deleted' | 'unsaved'

export interface DiscrepancyRowProps {
  title: string
  items: DiscrepancyItem[]
  itemStatuses: Record<string, ItemStatus>
  onButtonClick: (
    item: DiscrepancyItem,
    e: React.MouseEvent<HTMLButtonElement>
  ) => void
}

const DiscrepancyRow = ({
  title,
  items,
  itemStatuses,
  onButtonClick,
}: DiscrepancyRowProps) => {
  const theme = useTheme()
  const displayItems = items.filter((item) => {
    const status = itemStatuses[item.id.toString()] || 'pending'
    return status === 'pending' || status === 'unsaved'
  })

  if (!displayItems.length) {
    return (
      <Box mb={1}>
        <Box display="flex" alignItems="center">
          <Typography variant="subtitle1">{title}</Typography>
          <Tooltip title="Looks good!" arrow placement="top">
            <CheckCircleIcon
              fontSize="small"
              sx={{ ml: 1, color: theme.palette.success.main }}
            />
          </Tooltip>
        </Box>
      </Box>
    )
  }

  return (
    <Box mb={1}>
      <Typography variant="subtitle1">{title}</Typography>
      <Stack direction="row" spacing={1} mt={1} flexWrap="wrap" rowGap={1}>
        {displayItems.map((item) => (
          <DiscrepancyButton
            key={item.id}
            item={item}
            status={itemStatuses[item.id.toString()] || 'pending'}
            onClick={(e) => onButtonClick(item, e)}
          />
        ))}
      </Stack>
    </Box>
  )
}

export default DiscrepancyRow
