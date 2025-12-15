import { List } from '@mui/material'
import AlertSummaryRow from './AlertSummaryRow'

export type AlertSummaryListItem = {
  type: string
  label: string
  count: number
  color: string
}

export default function AlertSummaryList({
  items,
  onSelectType,
}: {
  items: AlertSummaryListItem[]
  onSelectType: (type: string) => void
}) {
  return (
    <List disablePadding>
      {items.map((s) => (
        <AlertSummaryRow
          key={s.type}
          label={s.label}
          type={s.type}
          count={s.count}
          color={s.color}
          onExpand={() => onSelectType(s.type)}
        />
      ))}
    </List>
  )
}
