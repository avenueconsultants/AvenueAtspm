import { PedatLocationData } from '@/api/reports'
import BoxPlotByLocationChart from '@/features/activeTransportation/components/charts/BoxPlotByLocationChart'
import { Box, Button, Container, Tab, Tabs } from '@mui/material'
import { useState } from 'react'
import AverageDailyPedVolByLocationChart from './charts/AverageDailyPedVolByLocationChart'
import DailyPedVolByMonthChart from './charts/DailyPedVolByMonthChart'
import HourlyPedVolByDayOfWeekChart from './charts/HourlyPedVolByDayOfWeekChart'
import HourlyPedVolByHourOfDayChart from './charts/HourlyPedVolByHourOfDayChart'
import TimeSeriesByHourByLocationChart from './charts/TimeSeriesByHourByLocationChart'
import TotalPedVolByLocationCharts from './charts/TotalPedVolByLocationCharts'
import DescriptiveStatsByHourByLocationChart from './DescriptiveStatsByHourByLocationChart'
import PedatMapContainer from './PedatMapContainer'
import PedestrianVolumeTimeSeriesTable from './PedestrianVolumeTimeSeriesTable'

export interface PedatChartsContainerProps {
  data?: PedatLocationData[]
}

const PedatChartsContainer = ({ data }: PedatChartsContainerProps) => {
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
          <AverageDailyPedVolByLocationChart data={data} />
          <HourlyPedVolByHourOfDayChart data={data} />
          <HourlyPedVolByDayOfWeekChart data={data} />
          <DailyPedVolByMonthChart data={data} />
        </Box>
      )}

      {tabIndex === 1 && (
        <Box sx={{ mb: 4 }}>
          <TotalPedVolByLocationCharts data={data} />
          <TimeSeriesByHourByLocationChart data={data} />
          <BoxPlotByLocationChart data={data} />
        </Box>
      )}

      {tabIndex === 2 && (
        <Box sx={{ mb: 4 }}>
          <PedatMapContainer />
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
