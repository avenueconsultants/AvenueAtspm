import DirectionsBikeOutlinedIcon from '@mui/icons-material/DirectionsBikeOutlined'
import DirectionsBusFilledOutlinedIcon from '@mui/icons-material/DirectionsBusFilledOutlined'
import DirectionsCarFilledOutlinedIcon from '@mui/icons-material/DirectionsCarFilledOutlined'
import DirectionsWalkOutlinedIcon from '@mui/icons-material/DirectionsWalkOutlined'
import ExitToAppOutlinedIcon from '@mui/icons-material/ExitToAppOutlined'
import ForkLeftOutlinedIcon from '@mui/icons-material/ForkLeftOutlined'
import ForkRightOutlinedIcon from '@mui/icons-material/ForkRightOutlined'
import NotInterestedOutlinedIcon from '@mui/icons-material/NotInterestedOutlined'
import PeopleAltOutlinedIcon from '@mui/icons-material/PeopleAltOutlined'
import StraightOutlinedIcon from '@mui/icons-material/StraightOutlined'
import TrainOutlinedIcon from '@mui/icons-material/TrainOutlined'
import TurnLeftOutlinedIcon from '@mui/icons-material/TurnLeftOutlined'
import TurnRightOutlinedIcon from '@mui/icons-material/TurnRightOutlined'

export const movementType = [
  { id: 'NA', description: 'Unknown', icon: <NotInterestedOutlinedIcon /> },
  { id: 'L', description: 'Left', icon: <TurnLeftOutlinedIcon /> },
  { id: 'TL', description: 'Thru-Left', icon: <ForkLeftOutlinedIcon /> },
  { id: 'T', description: 'Thru', icon: <StraightOutlinedIcon /> },
  { id: 'TR', description: 'Thru-Right', icon: <ForkRightOutlinedIcon /> },
  { id: 'R', description: 'Right', icon: <TurnRightOutlinedIcon /> },
]

export const hardwareTypes = [
  { id: 'NA', description: 'Unknown' },
  { id: 'WavetronixMatrix', description: 'Wavetronix Matrix' },
  { id: 'WavetronixAdvance', description: 'Wavetronix Advance' },
  { id: 'InductiveLoops', description: 'Inductive Loops' },
  { id: 'Sensys', description: 'Sensys' },
  { id: 'Video', description: 'Video' },
  { id: 'FLIRThermalCamera', description: 'FLIR: Thermal Camera' },
  { id: 'LiDAR', description: 'LiDAR' },
]

export const laneTypes = [
  {
    id: 'NA',
    description: 'Unknown',
    abbreviation: 'NA',
    icon: <NotInterestedOutlinedIcon />,
  },
  {
    id: 'V',
    description: 'Vehicle',
    abbreviation: 'V',
    icon: <DirectionsCarFilledOutlinedIcon />,
  },
  {
    id: 'Bike',
    description: 'Bike',
    abbreviation: 'Bike',
    icon: <DirectionsBikeOutlinedIcon />,
  },
  {
    id: 'Ped',
    description: 'Pedestrian',
    abbreviation: 'Ped',
    icon: <DirectionsWalkOutlinedIcon />,
  },
  {
    id: 'E',
    description: 'Exit',
    abbreviation: 'E',
    icon: <ExitToAppOutlinedIcon />,
  },
  {
    id: 'LRT',
    description: 'Light Rail Transit',
    abbreviation: 'LRT',
    icon: <TrainOutlinedIcon />,
  },
  {
    id: 'Bus',
    description: 'Bus',
    abbreviation: 'Bus',
    icon: <DirectionsBusFilledOutlinedIcon />,
  },
  {
    id: 'HDV',
    description: 'High Occupancy Vehicle',
    abbreviation: 'HDV',
    icon: <PeopleAltOutlinedIcon />,
  },
]

export const hardwareTypeOptions = hardwareTypes.map((ht) => ({
  value: ht.id,
  label: ht.description,
}))

export const movementTypeOptions = movementType.map((mt) => ({
  value: mt.id,
  label: mt.description,
  icon: mt.icon,
}))

export const laneTypeOptions = laneTypes.map((lt) => ({
  value: lt.id,
  label: lt.description,
  icon: lt.icon,
}))
