import GenericAdminChart, {
  pageNameToHeaders,
} from '@/components/GenericAdminChart'
import { ResponsivePageLayout } from '@/components/ResponsivePage'
import {
  PageNames,
  useUserHasClaim,
  useViewPage,
} from '@/features/identity/pagesCheck'
import { TabContext, TabList, TabPanel } from '@mui/lab'
import { Tab } from '@mui/material'
import { GridColDef } from '@mui/x-data-grid'
import { useState } from 'react'

type MapLayer = {
  id: number
  name: string
  mapURL: string
  showByDefault: boolean
  blob: Blob
}

const mapLayersMockData: MapLayer[] = [
  {
    id: 1,
    name: 'Traffic Signals',
    mapURL: 'https://example.com/traffic-signals',
    showByDefault: true,
    blob: new Blob(), // No data added
  },
  {
    id: 2,
    name: 'Road Construction',
    mapURL: 'https://example.com/road-construction',
    showByDefault: false,
    blob: new Blob(),
  },
  {
    id: 3,
    name: 'Accident Hotspots',
    mapURL: 'https://example.com/accident-hotspots',
    showByDefault: true,
    blob: new Blob(),
  },
  {
    id: 4,
    name: 'Traffic Density',
    mapURL: 'https://example.com/traffic-density',
    showByDefault: false,
    blob: new Blob(),
  },
  {
    id: 5,
    name: 'Weather Conditions',
    mapURL: 'https://example.com/weather-conditions',
    showByDefault: true,
    blob: new Blob(),
  },
]

const Admin = () => {
  const pageAccess = useViewPage(PageNames.MapLayerHeaders)
  const [currentTab, setCurrentTab] = useState('1')
  const [data, setData] = useState<any>(null)
  const headers: GridColDef[] = pageNameToHeaders.get(
    PageNames.MapLayerHeaders
  ) as GridColDef[]

  const hasLocationsEditClaim = useUserHasClaim('LocationConfiguration:Edit')
  const hasLocationsDelteClaim = useUserHasClaim('LocationConfiguration:Delete')

  //   const { data: mapLayerData, isLoading } = useGetApiGetMapLayers()

  //   useEffect(() => {
  //     if (mapLayerData) {
  //       setData(mapLayerData)
  //     }
  //   }, [mapLayerData])

  //   if (pageAccess.isLoading) {
  //     return
  //   }

  const handleChange = (_: React.SyntheticEvent, newValue: string) => {
    setCurrentTab(newValue)
  }

  const HandleCreateMapLayer = async (mapLayerData: MapLayer) => {
    // const { id, name, mapURL,showByDefault,blob } = mapLayerData
    // try {
    //   await createMutation.mutateAsync({ id, name })
    // } catch (error) {
    //   console.error('Mutation Error:', error)
    // }
  }

  const HandleDeleteMapLayer = async (mapLayerData: MapLayer) => {
    const { id } = mapLayerData
    // try {
    //   await deleteMutation.mutateAsync(id)
    // } catch (error) {
    //   console.error('Mutation Error:', error)
    // }
  }

  const HandleEditMapLayer = async (mapLayerData: MapLayer) => {
    const { id, name } = mapLayerData
    // try {
    //   await editMutation.mutateAsync({ data: { name }, id })
    // } catch (error) {
    //   console.error('Mutation Error:', error)
    // }
  }

  const deleteMapLayer = (data: MapLayer) => {
    HandleDeleteMapLayer(data)
  }

  const editMapLayer = (data: MapLayer) => {
    HandleEditMapLayer(data)
  }

  const createMapLayer = (data: MapLayer) => {
    HandleCreateMapLayer(data)
  }

  //   if (isLoading) {
  //     return (
  //       <Backdrop open>
  //         <CircularProgress color="inherit" />
  //       </Backdrop>
  //     )
  //   }

  //   if (!data) {
  //     return <div>Error returning data</div>
  //   }

  const filteredData = mapLayersMockData.map((obj: any) => {
    return {
      id: obj.id,
      name: obj.name,
      mapURL: obj.mapURL,
      showByDefault: obj.showByDefault,
    }
  })

  const baseType = {
    name: '',
    mapURL: '',
    showByDefault: '',
  }

  return (
    <ResponsivePageLayout title={'Manage Areas'} noBottomMargin>
      <TabContext value={currentTab}>
        <TabList
          onChange={handleChange}
          aria-label="Maps"
          textColor="primary"
          indicatorColor="primary"
        >
          <Tab label="Map" value="1" />
        </TabList>
        <TabPanel value="1" sx={{ padding: '0px' }}>
          <GenericAdminChart
            pageName={PageNames.MapLayerHeaders}
            headers={headers}
            data={filteredData}
            baseRowType={baseType}
            onDelete={deleteMapLayer}
            onEdit={editMapLayer}
            onCreate={createMapLayer}
            hasEditPrivileges={hasLocationsEditClaim}
            hasDeletePrivileges={hasLocationsDelteClaim}
          />
        </TabPanel>
      </TabContext>
    </ResponsivePageLayout>
  )
}

export default Admin