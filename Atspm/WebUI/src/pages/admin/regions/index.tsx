import { Region } from '@/features/regions/types/index'

import {
  useDeleteRegionFromKey,
  useGetLocationLatestVersionOfAllLocations,
  useGetRegion,
  usePatchRegionFromKey,
  usePostRegion,
} from '@/api/config/aTSPMConfigurationApi'
import AdminTable from '@/components/AdminTable/AdminTable'
import DeleteModal from '@/components/AdminTable/DeleteModal'
import { ResponsivePageLayout } from '@/components/ResponsivePage'
import {
  PageNames,
  useUserHasClaim,
  useViewPage,
} from '@/features/identity/pagesCheck'
import RegionEditorModal from '@/features/regions/components/RegionEditorModal'
import { useNotificationStore } from '@/stores/notifications'
import { Backdrop, CircularProgress } from '@mui/material'

const RegionsAdmin = () => {
  const pageAccess = useViewPage(PageNames.Region)
  const hasLocationsEditClaim = useUserHasClaim('LocationConfiguration:Edit')
  const hasLocationsDeleteClaim = useUserHasClaim(
    'LocationConfiguration:Delete'
  )

  const { mutateAsync: createMutation } = usePostRegion()
  const { mutateAsync: deleteMutation } = useDeleteRegionFromKey()
  const { mutateAsync: editMutation } = usePatchRegionFromKey()
  const { addNotification } = useNotificationStore()

  const { data: locationsData } = useGetLocationLatestVersionOfAllLocations()
  const locations = locationsData?.value

  const {
    data: regionData,
    isLoading,
    refetch: refetchRegions,
  } = useGetRegion()

  const regions = regionData?.value

  if (pageAccess.isLoading) {
    return null
  }
  const HandleCreateRegion = async (regionData: Region) => {
    const { id, description } = regionData

    try {
      await createMutation({ data: { id, description } })
      refetchRegions()
      addNotification({
        type: 'success',
        title: 'Region created',
      })
    } catch (error) {
      console.error('Mutation Error:', error)
      addNotification({
        type: 'error',
        title: 'Failed to create product',
      })
    }
  }

  const HandleDeleteRegion = async (id: number) => {
    try {
      await deleteMutation({ key: id })
      refetchRegions()
      addNotification({
        type: 'success',
        title: 'Region deleted',
      })
    } catch (error) {
      console.error('Mutation Error:', error)
      addNotification({
        type: 'error',
        title: 'Failed to delete region',
      })
    }
  }

  const HandleEditRegion = async (regionData: Region) => {
    const { id, description } = regionData
    try {
      await editMutation({
        data: { id, description },
        key: id,
      })
      refetchRegions()
      addNotification({
        type: 'success',
        title: 'Region updated',
      })
    } catch (error) {
      console.error('Mutation Error:', error)
      addNotification({
        type: 'error',
        title: 'Failed to update region',
      })
    }
  }

  const onModalClose = () => {
    //do something?? potentially just delete
  }

  const filterAssociatedObjects = (
    regionId: number,
    objects: Location[]
  ): { id: number; name: string }[] => {
    const associatedLocations = objects.filter((object) => {
      return object.regionId === regionId
    })

    return associatedLocations.map((location) => ({
      id: location.id,
      name: `${location.primaryName} & ${location.secondaryName}`,
    }))
  }

  if (isLoading) {
    return (
      <Backdrop open>
        <CircularProgress color="inherit" />
      </Backdrop>
    )
  }

  if (!regions) {
    return <div>Error returning data</div>
  }

  const filteredData = regions.map((obj: Region) => {
    return {
      id: obj.id,
      description: obj.description,
    }
  })

  const headers = ['Description']
  const headerKeys = ['description']

  return (
    <ResponsivePageLayout title="Manage Regions" noBottomMargin>
      <AdminTable
        pageName="Region"
        headers={headers}
        headerKeys={headerKeys}
        data={filteredData}
        hasEditPrivileges={hasLocationsEditClaim}
        hasDeletePrivileges={hasLocationsDeleteClaim}
        editModal={
          <RegionEditorModal
            isOpen={true}
            onSave={HandleEditRegion}
            onClose={onModalClose}
          />
        }
        createModal={
          <RegionEditorModal
            isOpen={true}
            onSave={HandleCreateRegion}
            onClose={onModalClose}
          />
        }
        deleteModal={
          <DeleteModal
            id={0}
            name={''}
            objectType="Region"
            deleteLabel={(selectedRow: (typeof filteredData)[number]) =>
              selectedRow.description
            }
            open={false}
            onClose={() => {}}
            onConfirm={HandleDeleteRegion}
            associatedObjects={locations}
            associatedObjectsLabel="locations"
            filterFunction={filterAssociatedObjects}
          />
        }
      />
    </ResponsivePageLayout>
  )
}

export default RegionsAdmin
