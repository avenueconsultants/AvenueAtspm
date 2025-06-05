import { Box, Button, Container, Tab, Tabs } from '@mui/material'
import { useState } from 'react'
import AverageDailyPedVolByLocationChart from './charts/AverageDailyPedVolByLocationChart'
import BoxPlotByLocationChart from './charts/BoxPlotByLocationChart'
import DailyPedVolByMonthChart from './charts/DailyPedVolByMonthChart'
import HourlyPedVolByDayOfWeekChart from './charts/HourlyPedVolByDayOfWeekChart'
import HourlyPedVolByHourOfDayChart from './charts/HourlyPedVolByHourOfDayChart'
import TimeSeriesByHourByLocationChart from './charts/TimeSeriesByHourByLocationChart'
import TotalPedVolByLocationCharts from './charts/TotalPedVolByLocationCharts'
import DescriptiveStatsByHourByLocationChart from './DescriptiveStatsByHourByLocationChart'
import PedestrianVolumeTimeSeriesTable from './PedestrianVolumeTimeSeriesTable'

const PedatChartsContainer: React.FC = () => {
  const [tabIndex, setTabIndex] = useState(0)
  return (
    <Container sx={{ py: 4, minWidth: '1530px', ml: '-15px' }}>
      <Tabs
        value={tabIndex}
        onChange={(_, val) => setTabIndex(val)}
        sx={{ mb: 4 }}
      >
        <Tab label="Averages" />
        <Tab label="Figures" />
        <Tab label="Map" />
        <Tab label="Data" />
      </Tabs>

      {tabIndex === 0 && (
        <Box sx={{ mb: 10 }}>
          <AverageDailyPedVolByLocationChart />
          <HourlyPedVolByHourOfDayChart />
          <HourlyPedVolByDayOfWeekChart />
          <DailyPedVolByMonthChart />
        </Box>
      )}

      {tabIndex === 1 && (
        <Box sx={{ mb: 4 }}>
          <TotalPedVolByLocationCharts />
          <TimeSeriesByHourByLocationChart />
          <BoxPlotByLocationChart />
        </Box>
      )}

      {tabIndex === 2 && (
        <Box sx={{ mb: 4 }}>
          <Box sx={{ height: 400, backgroundColor: '#e0e0e0', mb: 3 }} />
        </Box>
      )}

      {tabIndex === 3 && (
        <Box sx={{ mb: 4 }}>
          <PedestrianVolumeTimeSeriesTable />
          <DescriptiveStatsByHourByLocationChart />
        </Box>
      )}

      <Box sx={{ display: 'flex', gap: 2, mt: 4 }}>
        <Button variant="contained">Download Data</Button>
        <Button variant="contained">Generate Report</Button>
      </Box>
    </Container>
  )
}

export default PedatChartsContainer
