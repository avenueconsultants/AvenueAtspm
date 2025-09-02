import { useSidebarStore } from '@/stores/sidebar'
import { Drawer, useTheme } from '@mui/material'
import { PropsWithChildren } from 'react'

export default function RightSidebar({
  children,
  width = 420,
}: PropsWithChildren<{ width?: number }>) {
  const theme = useTheme()
  const { isRightSidebarOpen, closeRightSidebar } = useSidebarStore()

  return (
    <Drawer
      anchor="right"
      variant="persistent"
      open={isRightSidebarOpen}
      onClose={closeRightSidebar}
      PaperProps={{
        sx: {
          height: `calc(100%)`,
          width,
          border: 'none',
          boxShadow: 3,
          backgroundColor: theme.palette.background.paper,
          display: 'flex',
          flexDirection: 'column',
        },
      }}
      ModalProps={{ keepMounted: true }}
    >
      {children}
    </Drawer>
  )
}
