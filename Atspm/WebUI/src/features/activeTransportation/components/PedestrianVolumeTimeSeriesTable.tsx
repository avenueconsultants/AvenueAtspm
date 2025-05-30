import { Box, Typography } from '@mui/material'
import React from 'react'
import { mockPedestrianVolumeTimeSeries } from '../mockdata/pedatMockData'

const PedestrianVolumeTimeSeriesTable: React.FC = () => {
  return (
    <>
      <Box sx={{ textAlign: 'center', mb: 2 }}>
        <Typography variant="h4" sx={{ fontWeight: 'bold' }} gutterBottom>
          Data By Hour By Location
        </Typography>
      </Box>
      <div style={{ overflow: 'auto', maxHeight: '600px' }}>
        <table
          style={{
            width: '100%',
            borderCollapse: 'collapse',
            fontFamily: 'sans-serif',
          }}
        >
          <thead>
            <tr>
              <th style={thStyle}>Signal ID</th>
              <th style={thStyle}>Address</th>
              <th style={thStyle}>Timestamp</th>
              <th style={thStyle}>Pedestrian</th>
              <th style={thStyle}>City</th>
              <th style={thStyle}>Latitude</th>
              <th style={thStyle}>Longitude</th>
            </tr>
          </thead>
          <tbody>
            {mockPedestrianVolumeTimeSeries.map((row, idx) => (
              <tr key={idx}>
                <td style={tdStyle}>{row.signalId}</td>
                <td style={tdStyle}>{row.address}</td>
                <td style={tdStyle}>
                  {new Date(row.timestamp).toLocaleString()}
                </td>
                <td style={tdStyle}>{row.pedestrian}</td>
                <td style={tdStyle}>{row.city}</td>
                <td style={tdStyle}>{row.latitude.toFixed(6)}</td>
                <td style={tdStyle}>{row.longitude.toFixed(6)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  )
}

const thStyle: React.CSSProperties = {
  borderBottom: '2px solid #ccc',
  textAlign: 'left',
  padding: '8px',
  backgroundColor: '#f2f2f2',
}

const tdStyle: React.CSSProperties = {
  borderBottom: '1px solid #eee',
  padding: '8px',
  fontSize: '14px',
}

export default PedestrianVolumeTimeSeriesTable
