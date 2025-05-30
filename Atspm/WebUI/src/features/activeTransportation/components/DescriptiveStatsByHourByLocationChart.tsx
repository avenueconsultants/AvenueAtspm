import { Box, Typography } from '@mui/material'
import { mockDescriptiveStatsByHourByLocation } from '../mockdata/pedatMockData'

// /features/activeTransportation/components/charts/DescriptiveStatsByHourByLocationTable.tsx
const DescriptiveStatsByHourByLocationTable = () => {
  return (
    <>
      <Box sx={{ textAlign: 'center', mb: 2 }}>
        <Typography variant="h4" sx={{ fontWeight: 'bold' }} gutterBottom>
          Descriptive Statistics By Hour by location
        </Typography>
      </Box>
      <div style={{ overflow: 'auto', maxHeight: '600px' }}>
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
      </div>
    </>
  )
}

const th = {
  padding: '8px',
  borderBottom: '2px solid #ccc',
  textAlign: 'left',
  fontWeight: 600,
}

const td = {
  padding: '8px',
  borderBottom: '1px solid #eee',
}

export default DescriptiveStatsByHourByLocationTable
