import {
  useDeleteApiV1ImpactId,
  useGetApiV1Impact,
  usePostApiV1Impact,
  usePutApiV1ImpactId,
} from '@/api/speedManagement/aTSPMSpeedManagementApi'
import {
  Impact,
  ImpactType,
} from '@/api/speedManagement/aTSPMSpeedManagementApi.schemas'
import GenericAdminChart, {
  pageNameToHeaders,
} from '@/components/GenericAdminChart'
import { ResponsivePageLayout } from '@/components/ResponsivePage'
import {
  PageNames,
  useUserHasClaim,
  useViewPage,
} from '@/features/identity/pagesCheck'
import { useTransformedSegments } from '@/features/speedManagementTool/api/getSegments'
import ImpactEditorModal from '@/features/speedManagementTool/components/ImpactEditor/ImpactEditorModal'
import { useNotificationStore } from '@/stores/notifications'
import { Backdrop, CircularProgress } from '@mui/material'
import { GridColDef } from '@mui/x-data-grid'
import { useState } from 'react'

const ImpactAdmin = () => {
  useViewPage(PageNames.Impacts)

  const headers: GridColDef[] = pageNameToHeaders.get(
    PageNames.Impacts
  ) as GridColDef[]

  const { addNotification } = useNotificationStore()

  const { mutateAsync: createImpact } = usePostApiV1Impact()
  const { mutateAsync: deleteImpact } = useDeleteApiV1ImpactId()
  const { mutateAsync: editImpact } = usePutApiV1ImpactId()

  const hasEditClaim = useUserHasClaim('GeneralConfiguration:Edit')
  const hasDeleteClaim = useUserHasClaim('GeneralConfiguration:Delete')

  const {
    data: impacts,
    isLoading,
    refetch: refetchImpacts,
  } = useGetApiV1Impact<Impact[]>()

  const { data: segments, isLoading: isSegmentsLoading } =
    useTransformedSegments()

  // State to force re-render of GenericAdminChart
  const [dataVersion, setDataVersion] = useState(0)

  const handleCreateImpact = async (impactData: Impact) => {
    const {
      description,
      start,
      end,
      startMile,
      endMile,
      impactTypeIds,
      impactTypes,
      segmentIds,
    } = impactData

    try {
      await createImpact({
        data: {
          description,
          start,
          end,
          startMile,
          endMile,
          impactTypeIds,
          impactTypes,
          segmentIds,
        },
      })
      // Refetch the impacts after successful creation
      await refetchImpacts()
      // Update the data version to force re-render
      setDataVersion((prev) => prev + 1)
      addNotification({
        title: 'Impact Created',
        type: 'success',
      })
    } catch (error) {
      console.error('Mutation Error:', error)
      addNotification({
        title: 'Error Creating Impact',
        type: 'error',
      })
    }
  }

  const handleDeleteImpact = async (impactData: Impact) => {
    if (!impactData?.id) return
    const { id } = impactData
    try {
      await deleteImpact({ id })
      // Refetch the impacts after successful deletion
      await refetchImpacts()
      // Update the data version to force re-render
      setDataVersion((prev) => prev + 1)
      addNotification({
        title: 'Impact Deleted',
        type: 'success',
      })
    } catch (error) {
      console.error('Delete Mutation Error:', error)
      addNotification({
        title: 'Error Deleting Impact',
        type: 'error',
      })
    }
  }

  const handleEditImpact = async (impactData: Impact) => {
    const {
      id,
      description,
      start,
      end,
      startMile,
      endMile,
      impactTypeIds,
      impactTypes,
      segmentIds,
    } = impactData
    try {
      await editImpact({
        data: {
          description,
          start,
          end,
          startMile,
          endMile,
          impactTypeIds,
          impactTypes,
          segmentIds,
        },
        id,
      })
      // Refetch the impacts after successful update
      await refetchImpacts()
      // Update the data version to force re-render
      setDataVersion((prev) => prev + 1)
      addNotification({
        title: 'Impact Updated',
        type: 'info',
      })
    } catch (error) {
      console.error('Edit Mutation Error:', error)
      addNotification({
        title: 'Error Updating Impact',
        type: 'error',
      })
    }
  }

  if (isLoading) {
    return (
      <Backdrop open>
        <CircularProgress color="inherit" />
      </Backdrop>
    )
  }

  if (!impacts) {
    return <div>Error returning data</div>
  }
  let impactTypeNames = ''

  const filteredImpacts = impacts.map((impact) => {
    impactTypeNames =
      impact?.impactTypes
        ?.map((impactType: ImpactType) => impactType?.name)
        .join(', ') || 'none'

    return {
      ...impact,
      impactTypes: impact.impactTypes || [],
      impactTypesNames: impactTypeNames,
    }
  })

  const baseType = {
    description: '',
    start: '',
    end: '',
    startMile: '',
    endMile: '',
    impactTypes: [],
    impactTypesNames: '',
  }

  return (
    <ResponsivePageLayout title={'Impacts'} noBottomMargin>
      <GenericAdminChart
        key={dataVersion} // Force re-render when dataVersion changes
        pageName={PageNames.Impacts}
        headers={headers}
        data={filteredImpacts}
        baseRowType={baseType}
        onDelete={handleDeleteImpact}
        onEdit={handleEditImpact}
        onCreate={handleCreateImpact}
        hasEditPrivileges={hasEditClaim}
        hasDeletePrivileges={hasDeleteClaim}
        customModal={
          <ImpactEditorModal
            onCreate={handleCreateImpact}
            onEdit={handleEditImpact}
            onDelete={handleDeleteImpact}
            segments={segments}
            isSegmentsLoading={isSegmentsLoading}
          />
        }
      />
    </ResponsivePageLayout>
  )
}

export default ImpactAdmin
