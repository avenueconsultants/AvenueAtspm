import {
  useDeleteApiV1RolesRoleName,
  useGetApiV1Roles,
  usePostApiV1Roles,
} from '@/api/identity/atspmAuthenticationApi'
import AdminTable from '@/components/AdminTable/AdminTable'
import DeleteModal from '@/components/AdminTable/DeleteModal'
import { ResponsivePageLayout } from '@/components/ResponsivePage'
import { useAddRoleClaims } from '@/features/identity/api/addRoleClaims'
import {
  PageNames,
  useUserHasClaim,
  useViewPage,
} from '@/features/identity/pagesCheck'
import { Role } from '@/features/identity/types/roles'
import RoleModal from '@/features/roles/components/RoleModal'
import { useNotificationStore } from '@/stores/notifications'
import { Backdrop, Box, CircularProgress } from '@mui/material'

const RolesAdmin = () => {
  const pageAccess = useViewPage(PageNames.Roles)
  const hasRoleEditClaim = useUserHasClaim('Role:Edit')
  const hasRolesDeleteClaim = useUserHasClaim('Role:Delete')
  const { addNotification } = useNotificationStore()

  const {
    data: allRolesData,
    isLoading,
    refetch: refetchRoles,
  } = useGetApiV1Roles()
  const roles = allRolesData

  const { mutateAsync: createMutation } = usePostApiV1Roles()
  const { mutateAsync: deleteMutation } = useDeleteApiV1RolesRoleName()
  const { mutateAsync: editMutation } = useAddRoleClaims()

  const protectedRoles = [
    {
      role: 'Admin',
      description:
        'All privileges are granted for the user. Unrestricted Access to ATSPM',
    },
    {
      role: 'DataAdmin',
      description:
        'Privileges are granted to the Admin menu to access the Raw Data Export page.',
    },
    {
      role: 'GeneralConfigurationAdmin',
      description:
        'Privileges are granted to add, edit, and delete all configurations excluding location configuration.',
    },
    {
      role: 'LocationConfigurationAdmin',
      description:
        'Privileges are granted to add, edit, and delete location configurations excluding all other configurations.',
    },
    {
      role: 'ReportAdmin',
      description: 'Privileges are granted to access restricted reports.',
    },
    {
      role: 'RoleAdmin',
      description:
        'Privileges are granted to add, edit, and delete roles (this page)',
    },
    {
      role: 'UserAdmin',
      description: 'Privileges are granted to view, edit, and delete users.',
    },
    {
      role: 'WatchdogSubscriber',
      description:
        'Privileges are granted to view the watchdog report & subscribe to watchdog emails.',
    },
  ]

  const HandleDeleteRole = async (roleName: string) => {
    if (protectedRoles.includes(roleName)) {
      return
    }
    try {
      await deleteMutation({ roleName })
      refetchRoles()
      addNotification({ title: 'Role Deleted', type: 'success' })
    } catch (error) {
      console.error('Mutation Error:', error)
      addNotification({ title: 'Delete role Unsuccessful', type: 'error' })
    }
  }

  const HandleEditRole = async (roleData: {
    roleName: string
    claims: string[]
  }) => {
    try {
      await editMutation({
        roleName: roleData.roleName,
        claims: roleData.claims,
      })
      refetchRoles()
      addNotification({
        title: `${roleData.roleName} updated`,
        type: 'success',
      })
    } catch (error) {
      console.error('Mutation Error:', error)
      addNotification({ title: ' Role update Unsuccessful', type: 'error' })
    }
  }

  const HandleCreateRole = async (roleData: {
    roleName: string
    claims: string[]
  }) => {
    try {
      await createMutation({
        data: {
          roleName: roleData.roleName,
        },
      })
      if (roleData.claims.length > 0) {
        await editMutation({
          roleName: roleData.roleName,
          claims: roleData.claims,
        })
      }
      refetchRoles()
      addNotification({
        title: `${roleData.roleName} created`,
        type: 'success',
      })
    } catch (error) {
      console.error('Mutation Error:', error)
      addNotification({ title: ' Role create Unsuccessful', type: 'error' })
    }
  }

  if (pageAccess.isLoading) {
    return
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

  if (!roles) {
    return <div>Error returning data</div>
  }

  const customRoleFilteredData = roles
    .filter((role: Role) => !protectedRoles.some((pr) => pr.role === role.role))
    .map((role: Role, index: number) => ({
      id: index,
      role: role.role,
    }))
    .sort((a, b) => a.role.localeCompare(b.role))

  const filteredDefaultRoles = protectedRoles.map((roleObj, index: number) => {
    return {
      id: index,
      role: roleObj.role.replace(/(?<!^)([A-Z])/g, ' $1'),
      description: roleObj.description,
    }
  })

  const defaultRoleHeaders = ['Default Roles', 'description']
  const defaultRoleKeys = ['role', 'description']

  const customRolesHeaders = ['Custom Roles']
  const customRoleKeys = ['role']

  return (
    <ResponsivePageLayout title="Manage Roles" noBottomMargin>
      <Box sx={{ marginBottom: 10 }}>
        <AdminTable
          pageName="Role"
          headers={defaultRoleHeaders}
          headerKeys={defaultRoleKeys}
          data={filteredDefaultRoles}
        />
      </Box>
      <AdminTable
        pageName="Custom Role"
        headers={customRolesHeaders}
        headerKeys={customRoleKeys}
        data={customRoleFilteredData}
        hasEditPrivileges={hasRoleEditClaim}
        hasDeletePrivileges={hasRolesDeleteClaim}
        protectedFromDeleteItems={protectedRoles}
        editModal={
          <RoleModal
            isOpen={true}
            onSave={HandleEditRole}
            onClose={onModalClose}
          />
        }
        createModal={
          <RoleModal
            isOpen={true}
            onSave={HandleCreateRole}
            onClose={onModalClose}
          />
        }
        deleteModal={
          <DeleteModal
            id={''}
            name={''}
            objectType="Role"
            deleteByKey="role"
            open={false}
            onClose={() => {}}
            onConfirm={HandleDeleteRole}
            deleteLabel={(selectedRow: Role) => selectedRow.role}
          />
        }
      />
    </ResponsivePageLayout>
  )
}

export default RolesAdmin
