import { Box, Typography } from '@mui/material'
import { mockDescriptiveStatsByHourByLocation } from '../mockdata/pedatMockData'

// /features/activeTransportation/components/charts/DescriptiveStatsByHourByLocationTable.tsx
const DescriptiveStatsByHourByLocationTable = () => {
  return (
    <Box sx={{ mb: 2 }}>
      <Box sx={{ textAlign: 'center', mb: 2 }}>
        <Typography variant="h4" sx={{ fontWeight: 'bold' }} gutterBottom>
          Descriptive Statistics By Hour by location
        </Typography>
      </Box>
      <Box
        sx={{
          overflow: 'auto',
          maxHeight: '600px',
          border: '1px solid #ccc',
          borderRadius: '8px',
        }}
      >
        <table
          style={{
            width: '100%',
            borderCollapse: 'collapse',
            fontSize: '0.875rem',
          }}
        >
          <thead>
            <tr>
              <th style={th}>Signal ID</th>
              <th style={th}>Count</th>
              <th style={th}>Mean</th>
              <th style={th}>Std Dev</th>
              <th style={th}>Min</th>
              <th style={th}>25%</th>
              <th style={th}>50%</th>
              <th style={th}>75%</th>
              <th style={th}>Max</th>
              <th style={th}>Missing</th>
            </tr>
          </thead>
          <tbody>
            {mockDescriptiveStatsByHourByLocation.map((row) => (
              <tr key={row.locationId}>
                <td style={td}>{row.locationId}</td>
                <td style={td}>{row.stats.count}</td>
                <td style={td}>{row.stats.mean}</td>
                <td style={td}>{row.stats.stdDev}</td>
                <td style={td}>{row.stats.min}</td>
                <td style={td}>{row.stats.q1}</td>
                <td style={td}>{row.stats.median}</td>
                <td style={td}>{row.stats.q3}</td>
                <td style={td}>{row.stats.max}</td>
                <td style={td}>{row.stats.missing}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Box>
    </Box>
  )
}

const th = {
  position: 'sticky',
  top: 0,
  zIndex: 1,
  backgroundColor: '#f2f2f2',
  borderBottom: '2px solid #ccc',
  textAlign: 'left',
  padding: '8px',
  fontWeight: 600,
}

const td = {
  padding: '8px',
  borderBottom: '1px solid #eee',
}

export default DescriptiveStatsByHourByLocationTable
