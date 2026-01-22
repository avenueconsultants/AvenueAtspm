import { useOverheadDigitalSigns } from '@/components/aggTest/hooks/useOverheadDigitalSigns'
import { CircleMarker } from 'react-leaflet'

function OverheadSignLayer() {
  const { data: overheadSigns } = useOverheadDigitalSigns()

  return (
    <>
      {overheadSigns?.map((sign) => (
        <CircleMarker
          key={`overheadSign-${sign.Id}`}
          center={[sign.Latitude, sign.Longitude]}
          radius={3}
          color="green"
          fillColor="green"
        />
      ))}
    </>
  )
}

export default OverheadSignLayer
