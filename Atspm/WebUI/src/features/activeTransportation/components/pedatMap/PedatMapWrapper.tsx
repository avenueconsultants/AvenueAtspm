import { Box } from '@mui/material'
import 'leaflet/dist/leaflet.css'
import dynamic from 'next/dynamic'
import { memo } from 'react'

const PedatMap = dynamic(() => import('./pedatMap'), {
  ssr: false,
})

const PedatMapWrapper: React.FC = () => {
  return (
    <Box sx={{ height: '100%', width: '100%' }}>
      <PedatMap />
    </Box>
  )
}

PedatMapWrapper.displayName = 'PedatMapWrapper'

export default memo(PedatMapWrapper)
