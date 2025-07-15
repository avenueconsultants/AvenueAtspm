import {
  useDeleteApiV1UsersUserId,
  useGetApiV1Users,
  usePostApiV1UsersUpdate,
} from '@/api/identity/atspmAuthenticationApi'
import { UserDTO } from '@/api/identity/atspmAuthenticationApi.schemas'
import AdminTable from '@/components/AdminTable/AdminTable'
import DeleteModal from '@/components/AdminTable/DeleteModal'
import { ResponsivePageLayout } from '@/components/ResponsivePage'
import UserModal from '@/features/identity/components/users/UserModal'
import {
  CustomCellConfig,
  UserRolesCell,
} from '@/features/identity/components/users/UserRolesCell'
} from '@/features/identity/components/users/UserRolesCell'
import {
  PageNames,
  useUserHasClaim,
  useViewPage,
} from '@/features/identity/pagesCheck'
import { useNotificationStore } from '@/stores/notifications'
import { Backdrop, CircularProgress } from '@mui/material'

const UsersAdmin = () => {
  const pageAccess = useViewPage(PageNames.Users)
  const hasUserEditClaim = useUserHasClaim('User:Edit')
  const hasUserDeleteClaim = useUserHasClaim('User:Delete')
  const { addNotification } = useNotificationStore()

  const { mutateAsync: deleteMutation } = useDeleteApiV1UsersUserId()
  const { mutateAsync: editMutation } = usePostApiV1UsersUpdate()
  const {
    data: allUserData,
    isLoading: usersIsLoading,
    refetch: refetchUsers,
  } = useGetApiV1Users()

  const users = allUserData
  const users = allUserData

  const handleEditUser = async (userData: UserDTO) => {
    const { userId, firstName, lastName, agency, userName, email, roles } =
      userData
      userData
    try {
      await editMutation({
        data: {
          userId,
          firstName,
          lastName,
          agency,
          email: email.toLowerCase(),
          userName: userName.toLowerCase(),
          roles,
        },
      })
      refetchUsers()
      addNotification({
        title: 'User updated',
        type: 'success',
      })
    } catch (error) {
      console.error('Mutation Error:', error)
      addNotification({
        title: 'Failed to update user',
        type: 'error',
      })
    }
  }

  const handleDeleteUser = async (id: string) => {
    try {
      await deleteMutation({ userId: id })
      refetchUsers()
      addNotification({
        title: 'User deleted',
        type: 'success',
      })
    } catch (error) {
      console.error('Error deleting user:', error)
      addNotification({
        title: 'Failed to deleted user',
        type: 'error',
      })
    }
  }
  }

  if (pageAccess.isLoading) {
    return
    return
  }

  const filteredData = users?.map((user) => {
    return {
      userId: user.userId,
      firstName: user.firstName,
      lastName: user.lastName,
      fullName: user.fullName,
      userName: user.userName,
      agency: user.agency,
      email: user.email,
      roles: user.roles?.sort(),
    }
  })
    }
  })

  const headers = ['Full Name', 'Username', 'Agency', 'Email', 'Roles']
  const headerKeys = ['fullName', 'userName', 'agency', 'email', 'roles']
  const headers = ['Full Name', 'Username', 'Agency', 'Email', 'Roles']
  const headerKeys = ['fullName', 'userName', 'agency', 'email', 'roles']

  if (usersIsLoading) {
    return (
      <Backdrop open>
        <CircularProgress color="inherit" />
      </Backdrop>
    )
    )
  }

  if (!allUserData) {
    return <div>Error returning data</div>
    return <div>Error returning data</div>
  }

  const customCellRender: CustomCellConfig[] = [
    {
      headerKey: 'roles',
      headerKey: 'roles',
      component: (value: string, row: string[]) => (
        <UserRolesCell value={value} row={row} headerKey="roles" />
      ),
    },
  ]
  ]

  return (
    <ResponsivePageLayout title="Manage Users" noBottomMargin>
      <AdminTable
        pageName="User"
        headers={headers}
        headerKeys={headerKeys}
        data={filteredData}
        customCellRender={customCellRender}
        hasEditPrivileges={hasUserEditClaim}
        hasDeletePrivileges={hasUserDeleteClaim}
        editModal={
          <UserModal isOpen={true} onSave={handleEditUser} data={null} />
        }
        deleteModal={
          <DeleteModal
            id={0}
            name={''}
            name={''}
            deleteByKey="userId"
            objectType="User"
            deleteLabel={(selectedRow: UserDto) => selectedRow.fullName}
            open={false}
            onConfirm={handleDeleteUser}
          />
        }
      />
    </ResponsivePageLayout>
  )
}
  )
}

export default UsersAdmin
export default UsersAdmin
