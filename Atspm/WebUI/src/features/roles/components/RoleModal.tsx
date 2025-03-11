import { useGetClaims } from '@/features/identity/api/getClaims'
import { useGetRoles } from '@/features/identity/api/getRoles'
import { Role } from '@/features/identity/types/roles'
import PageClaimsCard from '@/features/roles/components/PageClaimsCard'
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  TextField,
} from '@mui/material'
import React, { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'

interface RoleFormData {
  roleName: string
  claims: string[]
}

interface ModalProps {
  isOpen: boolean
  onClose: () => void
  data: Role | null
  onSave: (roleData: RoleFormData) => void
}

const RoleModal: React.FC<ModalProps> = ({ isOpen, onSave, onClose, data }) => {
  const {
    data: rolesData,
    isLoading: rolesIsLoading,
    error: rolesError,
  } = useGetRoles()
  const { isLoading: claimsIsLoading, error: claimsError } = useGetClaims()

  const [userClaims, setUserClaims] = useState<string[]>([])
  const [currentRole, setCurrentRole] = useState<string>('')
  const [tempRoleName, setTempRoleName] = useState<string>('')
  const [tempClaims, setTempClaims] = useState<string[]>([])
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<RoleFormData>({
    defaultValues: {
      roleName: data?.role || '',
      claims: [],
    },
  })

  const roleId = data?.role || null
  const isNewRole = !roleId
  const watchedRoleName = watch('roleName')

  useEffect(() => {
    if (isNewRole) {
      setCurrentRole(watchedRoleName)
      setTempRoleName(watchedRoleName)
    } else {
      setCurrentRole(data?.role || '')
    }
  }, [watchedRoleName, isNewRole, data])

  const handleClaimsChange = (_role: string, claims: string[]) => {
    setUserClaims(claims)
    setTempClaims(claims)
  }

  const onSubmit = (formData: RoleFormData) => {
    onSave({
      roleName: formData.roleName,
      claims: tempClaims,
    })
    onClose()
  }

  if (rolesIsLoading || claimsIsLoading) return null

  if (rolesError || claimsError) {
    return (
      <div>
        Error:{' '}
        {(rolesError as Error)?.message || (claimsError as Error)?.message}
      </div>
    )
  }

  return (
    <Dialog
      open={isOpen}
      onClose={onClose}
      aria-labelledby="role-permissions-label"
      maxWidth={false}
      sx={{
        '& .MuiDialog-paper': {
          width: 'auto',
          maxWidth: 'none',
          minWidth: '600px',
        },
      }}
    >
      <form onSubmit={handleSubmit(onSubmit)}>
        <DialogTitle
          sx={{ fontSize: '1.3rem', margin: '2rem', mb: 0 }}
          id="role-permissions-label"
        >
          {isNewRole ? (
            <>
              Create New Role
              {errors.roleName && (
                <Box sx={{ color: 'error.main', fontSize: '0.8rem', mt: 1 }}>
                  {errors.roleName.message}
                </Box>
              )}
            </>
          ) : (
            <>Role Permissions - {roleId}</>
          )}
        </DialogTitle>
        <DialogContent>
          {isNewRole && (
            <Box sx={{ mb: 3, mt: 1 }}>
              <TextField
                fullWidth
                label="Role Name"
                {...register('roleName', {
                  required: 'Role name is required',
                })}
                error={!!errors.roleName}
                helperText={errors.roleName?.message}
              />
            </Box>
          )}
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <PageClaimsCard
              id={isNewRole ? tempRoleName : (roleId ?? '')}
              currentClaims={rolesData || []}
              onClaimsChange={handleClaimsChange}
              currentRole={currentRole}
              setCurrentRole={setCurrentRole}
              userClaims={userClaims}
              setUserClaims={setUserClaims}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Box sx={{ marginRight: '1rem', marginBottom: '.5rem' }}>
            <Button onClick={onClose}>Cancel</Button>
            <Button variant="contained" type="submit">
              {isNewRole ? 'Create Role' : 'Update Role'}
            </Button>
          </Box>
        </DialogActions>
      </form>
    </Dialog>
  )
}

export default RoleModal
