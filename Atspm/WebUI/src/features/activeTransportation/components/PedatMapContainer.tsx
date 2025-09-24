import { Box, Paper } from '@mui/material'
import PedatMapWrapper from './pedatMap/pedatMapWrapper'

const PedatMapContainer = () => {
  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        height: '77vh',
      }}
    >
      <Paper
        sx={{
          flexGrow: 1,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          height: 'auto',
        }}
      >
        <PedatMapWrapper />
      </Paper>
    </Box>
  )
}

export default PedatMapContainer
