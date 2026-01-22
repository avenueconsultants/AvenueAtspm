import { useCameras } from '@/components/aggTest/hooks/useCameras'
import { CircleMarker } from 'react-leaflet'

function CameraLayer() {
  const { data: cameras } = useCameras()

  return (
    <>
      {cameras?.map((camera) => (
        <CircleMarker
          key={`camera-${camera.Id}`}
          center={[camera.Latitude, camera.Longitude]}
          radius={1}
          color="blue"
          fillColor="blue"
        />
      ))}
    </>
  )
}

export default CameraLayer
