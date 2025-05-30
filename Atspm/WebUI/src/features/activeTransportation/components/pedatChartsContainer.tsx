import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Box,
  Button,
  Container,
  Typography,
} from '@mui/material'
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
  return (
    <Container sx={{ py: 4 }}>
      {/* Averages Section */}
      <Accordion defaultExpanded>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography variant="h4">Averages</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Box sx={{ mb: 4 }}>
            <AverageDailyPedVolByLocationChart />
            <HourlyPedVolByHourOfDayChart />
            <HourlyPedVolByDayOfWeekChart />
            <DailyPedVolByMonthChart />
          </Box>
        </AccordionDetails>
      </Accordion>

      {/* Figures Section */}
      <Accordion defaultExpanded>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography variant="h4">Figures</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Box sx={{ mb: 4 }}>
            <TotalPedVolByLocationCharts />
            <TimeSeriesByHourByLocationChart />
            <BoxPlotByLocationChart />
          </Box>
        </AccordionDetails>
      </Accordion>

      {/* Map Section */}
      <Accordion defaultExpanded>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography variant="h4">Map</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Box sx={{ mb: 4 }}>
            <Typography variant="h5" gutterBottom>
              Heat Map
            </Typography>
            <Box sx={{ height: 400, backgroundColor: '#e0e0e0', mb: 3 }} />
          </Box>
        </AccordionDetails>
      </Accordion>

      {/* Data Section */}
      <Accordion defaultExpanded>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography variant="h4">Data</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Box sx={{ mb: 4, gap: 2 }}>
            <Box></Box>
            <PedestrianVolumeTimeSeriesTable />
          </Box>
          <Box>
            <DescriptiveStatsByHourByLocationChart />
          </Box>
        </AccordionDetails>
      </Accordion>

      {/* Action Buttons */}
      <Box sx={{ display: 'flex', gap: 2, mt: 4 }}>
        <Button variant="contained">Download Data</Button>
        <Button variant="contained">Generate Report</Button>
      </Box>
    </Container>
  )
}

export default PedatChartsContainer
