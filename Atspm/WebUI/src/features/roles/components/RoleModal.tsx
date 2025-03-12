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
import React, { useState } from 'react'
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
  const {
    data: claimsData,
    isLoading: claimsIsLoading,
    error: claimsError,
  } = useGetClaims()

  const [userClaims, setUserClaims] = useState<string[]>(data?.claims || [])
  const [currentRole, setCurrentRole] = useState<string>(data?.role || '')

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isValid },
  } = useForm<RoleFormData>({
    defaultValues: {
      roleName: data?.role || '',
      claims: data?.claims || [],
    },
    mode: 'onChange',
  })

  const roleId = data?.role
  const isNewRole = !roleId
  const watchedRoleName = watch('roleName')

  const handleClaimsChange = (_role: string, claims: string[]) => {
    setUserClaims(claims)
    setValue('claims', claims)
  }

  const onSubmit = (formData: RoleFormData) => {
    if (!formData.roleName) return
    onSave({
      roleName: formData.roleName,
      claims: userClaims,
    })
    onClose()
  }

  const existingRoleNames = (rolesData || []).map((role) =>
    role.role.toLowerCase()
  )
  const isDuplicateRoleName =
    isNewRole &&
    watchedRoleName &&
    existingRoleNames.includes(watchedRoleName.toLowerCase())

  if (rolesIsLoading || claimsIsLoading) return null
  if (rolesError || claimsError) {
    return <div>Error: {rolesError?.message || claimsError?.message}</div>
  }

  return (
    <Dialog
      open={isOpen}
      onClose={onClose}
      aria-labelledby="role-permissions-label"
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
          {isNewRole ? 'Create New Role' : `Role Permissions - ${roleId}`}
        </DialogTitle>
        <DialogContent>
          {isNewRole && (
            <Box sx={{ m: 2, mb: 3, mt: 1 }}>
              <TextField
                fullWidth
                label="Role Name"
                {...register('roleName', {
                  required: 'Role name is required',
                  validate: (value) => {
                    // Skip validation if value is empty
                    if (!value || value.trim() === '') return true
                    // Check for duplicate role name only if value is non-empty
                    return (
                      !existingRoleNames.includes(value.toLowerCase()) ||
                      'Role name already exists'
                    )
                  },
                })}
                error={!!errors.roleName || isDuplicateRoleName}
                helperText={errors.roleName ? errors.roleName.message : ''}
              />
            </Box>
          )}
          <PageClaimsCard
            id={isNewRole ? watchedRoleName : (roleId ?? '')}
            currentClaims={rolesData || []}
            onClaimsChange={handleClaimsChange}
            currentRole={currentRole}
            setCurrentRole={setCurrentRole}
            userClaims={userClaims}
            setUserClaims={setUserClaims}
            claimsData={claimsData}
            isNewRole={isNewRole}
          />
        </DialogContent>
        <DialogActions>
          <Box sx={{ marginRight: '1rem', marginBottom: '.5rem' }}>
            <Button onClick={onClose}>Cancel</Button>
            <Button
              variant="contained"
              type="submit"
              disabled={!isValid || isDuplicateRoleName}
            >
              {isNewRole ? 'Create Role' : 'Update Role'}
            </Button>
          </Box>
        </DialogActions>
      </form>
    </Dialog>
  )
}

export default RoleModal
