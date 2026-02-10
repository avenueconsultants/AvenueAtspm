// components/aggTest/AlertSummaryRow.tsx
import ChevronRightIcon from '@mui/icons-material/ChevronRight'
import { Box, IconButton, ListItem, Typography } from '@mui/material'

export default function AlertSummaryRow({
  label,
  type,
  count,
  color,
  onExpand,
}: {
  label: string
  type: string
  count: number
  color: string
  onExpand?: () => void
}) {
  return (
    <ListItem
      disablePadding
      sx={{
        display: 'flex',
        alignItems: 'center',
        px: 2,
        py: 1.25,
        '& + &': { borderTop: '1px solid', borderTopColor: 'divider' },
      }}
    >
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography fontWeight={800} sx={{ lineHeight: 1.2 }} noWrap>
          {label}
        </Typography>
        <Typography variant="body2" sx={{ opacity: 0.85, mt: 0.25 }}>
          {count} total
        </Typography>
      </Box>

      <IconButton
        size="small"
        onClick={onExpand}
        disabled={!onExpand}
        aria-label={`View ${label}`}
      >
        <ChevronRightIcon fontSize="small" />
      </IconButton>
    </ListItem>
  )
}
