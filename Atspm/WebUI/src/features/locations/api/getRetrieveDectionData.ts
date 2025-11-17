import { DeviceTypes } from '@/api/config/aTSPMConfigurationApi.schemas'
import { configAxios } from '@/lib/axios'
import { ExtractFnReturnType } from '@/lib/react-query'
import { useQuery } from 'react-query'

interface DetectionParams {
  IpAddress: string | null | undefined
  port: number | undefined
  detectionType: DeviceTypes | undefined
}

const getRetrieveDectionData = async (
  params: DetectionParams
): Promise<any> => {
  const response = await configAxios.post('Detector/retrieveDetctiondata', {
    IpAddress: params.IpAddress,
    port: params.port,
    detectionType: params.detectionType,
  })
  return response
}

type QueryFnType = typeof getRetrieveDectionData

export const useGetRetrieveDectionData = (params: DetectionParams) => {
  return useQuery<ExtractFnReturnType<QueryFnType>>({
    queryKey: ['retrieveDectionData', params],
    queryFn: () => getRetrieveDectionData(params),
  })
}
