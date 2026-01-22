import { Color } from '@/features/charts/utils'
import { SvgIconComponent } from '@mui/icons-material'
import QuestionMarkIcon from '@mui/icons-material/QuestionMark'
import RampRightOutlinedIcon from '@mui/icons-material/RampRightOutlined'
import TrafficIcon from '@mui/icons-material/Traffic'
import ReactDOMServer from 'react-dom/server'

export const locationTypeMap: Record<
  string,
  { color: string; MuiIcon: SvgIconComponent }
> = {
  // 1 = "Intersection"
  '1': {
    color: Color.BrightRed,
    MuiIcon: TrafficIcon,
  },
  // 2 = "Ramp Meter"
  '2': {
    color: Color.Blue,
    MuiIcon: RampRightOutlinedIcon,
  },
  // Default / fallback
  Default: {
    color: Color.Grey,
    MuiIcon: QuestionMarkIcon,
  },
}

/**
 * Getter function to retrieve the { color, MuiIcon } pair
 * for a given locationTypeId. Falls back to Default if none is found.
 */
export function getLocationTypeConfig(locationTypeId: number) {
  // locationTypeId is a number, but our keys are strings: convert it
  return locationTypeMap[`${locationTypeId}`] || locationTypeMap.Default
}

/**
 * Dynamically imports Leaflet and constructs a DivIcon using the pin SVG,
 * plus a white circle "badge" with a given MUI icon on top.
 */
export async function createPinWithIcon({
  color,
  MuiIcon,
  iconSize = 17,
  offset = -1,
  scale = 1,
}: {
  color: string
  MuiIcon: SvgIconComponent
  iconSize?: number
  offset?: number
  scale?: number
}): Promise<L.DivIcon> {
  const L = await import('leaflet')

  const pinW = 25
  const pinH = 60
  const badge = 19
  const badgeTop = 13
  const badgeLeft = 3

  const w = pinW * scale
  const h = pinH * scale
  const badgeSize = badge * scale

  return L.divIcon({
    html: ReactDOMServer.renderToString(
      <div
        style={{
          position: 'relative',
          width: `${w}px`,
          height: `${h}px`,
        }}
      >
        <svg
          width={w}
          height={h}
          viewBox="0 0 902 1444"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            fill={color}
            d="
              M451 0
              C201.541 0 0 201.652 0 451.25
              C0 700.848 225.5 1037.88 451 1444
              C676.5 1037.88 902 700.848 902 451.25
              C902 201.652 700.459 0 451 0
              Z
            "
          />
        </svg>

        <div
          style={{
            position: 'absolute',
            top: `${badgeTop * scale}px`,
            left: `${badgeLeft * scale}px`,
            width: `${badgeSize}px`,
            height: `${badgeSize}px`,
            backgroundColor: 'white',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <MuiIcon
            style={{
              fontSize: iconSize * scale,
              color: 'black',
              marginLeft: offset * scale,
            }}
          />
        </div>
      </div>
    ),
    className: '',
    iconSize: [pinW * scale, 40 * scale],
    iconAnchor: [13 * scale, 48 * scale],
  })
}

/**
 * Builds and returns a Leaflet DivIcon for a given locationTypeId.
 */
export async function generatePin(locationTypeId: number): Promise<L.DivIcon> {
  const { color, MuiIcon } = getLocationTypeConfig(locationTypeId)

  switch (locationTypeId) {
    case 1:
      return createPinWithIcon({
        color,
        MuiIcon,
        offset: 0,
      })

    case 2:
      return createPinWithIcon({
        color,
        MuiIcon,
        iconSize: 19,
        offset: 1,
      })

    default:
      return createPinWithIcon({
        color,
        MuiIcon,
        offset: -1,
      })
  }
}
