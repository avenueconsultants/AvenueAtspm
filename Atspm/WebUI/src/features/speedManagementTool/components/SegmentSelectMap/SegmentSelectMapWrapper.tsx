import { Box } from '@mui/material'
import 'leaflet/dist/leaflet.css'
import dynamic from 'next/dynamic'
import { memo } from 'react'

const SegmentSelectMap = dynamic(() => import('./SegmentSelectMap'), {
  ssr: false,
})

const SegmentSelectMapWrapper: React.FC = () => {
  return (
    <Box sx={{ height: '100%', width: '100%' }}>
      <SegmentSelectMap />
    </Box>
  )
}

SegmentSelectMapWrapper.displayName = 'SegmentSelectMapWrapper'

export default memo(SegmentSelectMapWrapper)
