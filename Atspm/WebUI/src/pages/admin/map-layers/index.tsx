import {
  useDeleteMapLayerFromKey,
  useGetMapLayer,
  usePatchMapLayerFromKey,
  usePostMapLayer,
} from '@/api/config/aTSPMConfigurationApi'
import { MapLayer } from '@/api/config/aTSPMConfigurationApi.schemas'
import AdminTable from '@/components/AdminTable'
import DeleteModal from '@/components/AdminTable/DeleteModal'
import { ResponsivePageLayout } from '@/components/ResponsivePage'
import {
  PageNames,
  useUserHasClaim,
  useViewPage,
} from '@/features/identity/pagesCheck'
import MapLayerCreateEditModal from '@/features/mapLayers/MapLayerEditorModal'
import { useNotificationStore } from '@/stores/notifications'
import { Backdrop, Checkbox, CircularProgress } from '@mui/material'

const MapLayers = () => {
  const pageAccess = useViewPage(PageNames.MapLayers)

  const { addNotification } = useNotificationStore()

  const hasLocationsEditClaim = useUserHasClaim('LocationConfiguration:Edit')
  const hasLocationsDeleteClaim = useUserHasClaim(
    'LocationConfiguration:Delete'
  )

  const {
    data: mapLayerData,
    isLoading,
    refetch: fetchMapLayers,
  } = useGetMapLayer()
  const { mutateAsync: addMapLayer } = usePostMapLayer()
  const { mutateAsync: updateMapLayer } = usePatchMapLayerFromKey()
  const { mutateAsync: removeMapLayer } = useDeleteMapLayerFromKey()

  const mapLayers = mapLayerData?.value as MapLayer[]

  if (pageAccess.isLoading) {
    return
  }

  const handleCreateMapLayer = async (mapLayerData: MapLayer) => {
    try {
      await addMapLayer({ data: mapLayerData })
      addNotification({
        title: 'Map Layer created successfully',
        type: 'success',
      })
      fetchMapLayers()
    } catch (error) {
      console.error('Mutation Error:', error)
      addNotification({
        title: 'Error creating Map Layer',
        type: 'error',
      })
    }
  }

  const handleDeleteMapLayer = async (id: number) => {
    try {
      await removeMapLayer({ key: id })
      addNotification({
        title: 'Map Layer deleted successfully',
        type: 'success',
      })
      fetchMapLayers()
    } catch (error) {
      console.error('Mutation Error:', error)
      addNotification({
        title: 'Error deleting Map Layer',
        type: 'error',
      })
    }
  }

  const handleEditMapLayer = async (mapLayerData: MapLayer) => {
    if (!mapLayerData.id) {
      console.error('Map Layer ID is required for editing')
      return
    }
    try {
      await updateMapLayer({
        key: mapLayerData.id,
        data: mapLayerData,
      })
      addNotification({
        title: 'Map Layer updated successfully',
        type: 'success',
      })

      fetchMapLayers()
    } catch (error) {
      console.error('Mutation Error:', error)
      addNotification({
        title: 'Error updating Map Layer',
        type: 'error',
      })
    }
  }

  const onModalClose = () => {
    //do something?? potentially just delete
  }

  if (isLoading) {
    return (
      <Backdrop open>
        <CircularProgress color="inherit" />
      </Backdrop>
    )
  }

  if (!mapLayers) {
    return <div>Error returning data</div>
  }

  const filteredData = mapLayers.map((obj: MapLayer) => {
    return {
      id: obj.id,
      name: obj.name,
      mapLayerUrl: obj.mapLayerUrl,
      showByDefault: obj.showByDefault,
      serviceType: obj.serviceType,
      refreshIntervalSeconds: obj.refreshIntervalSeconds,
    }
  })

  const headers = [
    'Name',
    'Url',
    'Show by Default?',
    'Service Type',
    'Refresh Rate (Seconds)',
  ]
  const headerKeys = [
    'name',
    'mapLayerUrl',
    'showByDefault',
    'serviceType',
    'refreshIntervalSeconds',
  ]

  const customCellRender = [
    {
      headerKey: 'showByDefault',
      component: (value: boolean) => <Checkbox checked={value} />,
    },
  ]
  return (
    <ResponsivePageLayout title="Manage Map Layers" noBottomMargin>
      <AdminTable
        pageName="Map Layer"
        headers={headers}
        headerKeys={headerKeys}
        data={filteredData}
        customCellRender={customCellRender}
        hasEditPrivileges={hasLocationsEditClaim}
        hasDeletePrivileges={hasLocationsDeleteClaim}
        editModal={
          <MapLayerCreateEditModal
            isOpen={true}
            onSave={handleEditMapLayer}
            onClose={onModalClose}
          />
        }
        createModal={
          <MapLayerCreateEditModal
            isOpen={true}
            onSave={handleCreateMapLayer}
            onClose={onModalClose}
          />
        }
        deleteModal={
          <DeleteModal
            id={0}
            name={''}
            objectType="Map Layer"
            open={false}
            onConfirm={handleDeleteMapLayer}
          />
        }
      />
    </ResponsivePageLayout>
  )
}

export default MapLayers
