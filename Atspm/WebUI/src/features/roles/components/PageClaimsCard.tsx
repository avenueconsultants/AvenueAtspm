import { useGetApiV1Claims } from '@/api/identity/atspmAuthenticationApi'
import { Box, MenuItem, Select, Typography } from '@mui/material'
import { useEffect, useState } from 'react'

interface PageClaimsCardProps {
  currentClaims: { role: string; claims: string[] }[]
  onClaimsChange: (role: string, claims: string[]) => void
  currentRole: string
  setCurrentRole: (role: string) => void
  userClaims: string[]
  setUserClaims: (claims: string[]) => void
  id: string
}

const permissionOptions = ['View', 'View & Edit', 'View, Edit, Delete']

const PageClaimsCard = ({
  currentClaims,
  onClaimsChange,
  currentRole,
  setCurrentRole,
  userClaims,
  setUserClaims,
  id,
}: PageClaimsCardProps) => {
  const { data: claimsData } = useGetApiV1Claims()
  const claims = claimsData?.filter((claim: string) => claim !== 'Admin')

  const roleCurrentClaims =
    currentClaims.find((item) => item.role === id)?.claims || []

  const [selectedPermissions, setSelectedPermissions] = useState<{
    [key: string]: string
  }>({})

  useEffect(() => {
    if (id === 'Admin') {
      setUserClaims(claims)
      onClaimsChange(id as string, claims)
    } else {
      setCurrentRole(id as string)
      setUserClaims(roleCurrentClaims)

      // Initialize selected permissions based on current claims
      const initialPermissions: { [key: string]: string } = {}
      uniquePermissions.forEach((permission) => {
        const permClaims = roleCurrentClaims.filter((c) =>
          c.startsWith(permission)
        )
        if (
          permClaims.includes(`${permission}:View`) &&
          permClaims.includes(`${permission}:Edit`) &&
          permClaims.includes(`${permission}:Delete`)
        ) {
          initialPermissions[permission] = 'View, Edit, Delete'
        } else if (
          permClaims.includes(`${permission}:View`) &&
          permClaims.includes(`${permission}:Edit`)
        ) {
          initialPermissions[permission] = 'View & Edit'
        } else if (permClaims.includes(`${permission}:View`)) {
          initialPermissions[permission] = 'View'
        } else {
          initialPermissions[permission] = ''
        }
      })
      setSelectedPermissions(initialPermissions)
    }
  }, [id, roleCurrentClaims])

  const getPermissionName = (claim: string) => {
    return claim.split(':')[0]
  }

  const uniquePermissions = Array.from(new Set(claims?.map(getPermissionName)))

  const formatPermissionName = (permission: string) => {
    return permission.replace(/(?<!^)([A-Z])/g, ' $1')
  }

  const handlePermissionChange = (permission: string, value: string) => {
    if (id === 'Admin') return

    const updatedPermissions = {
      ...selectedPermissions,
      [permission]: value,
    }
    setSelectedPermissions(updatedPermissions)

    // Convert selection to claims array
    const newClaims: string[] = []
    Object.entries(updatedPermissions).forEach(([perm, val]) => {
      switch (val) {
        case 'View':
          newClaims.push(`${perm}:View`)
          break
        case 'View & Edit':
          newClaims.push(`${perm}:View`, `${perm}:Edit`)
          break
        case 'View, Edit, Delete':
          newClaims.push(`${perm}:View`, `${perm}:Edit`, `${perm}:Delete`)
          break
      }
    })

    setUserClaims(newClaims)
    onClaimsChange(id as string, newClaims)
  }

  return (
    <Box sx={{ width: '100%', padding: 2 }}>
      {uniquePermissions.map((permission) => (
        <Box
          key={permission}
          sx={{
            display: 'flex',
            flexDirection: 'column',
            mb: 2,
            width: '100%',
          }}
        >
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              mb: 1,
            }}
          >
            <Box>
              <Typography variant="h6" component="div" fontWeight="bold">
                {`${formatPermissionName(permission)}:`}
              </Typography>
              <Box sx={{ marginRight: 2 }}>
                <Typography variant="body2" color="text.secondary">
                  Placeholder description for {formatPermissionName(permission)}
                </Typography>
              </Box>
            </Box>
            <Box sx={{ minWidth: 200 }}>
              {' '}
              {/* Fixed width for dropdown */}
              <Select
                fullWidth
                size="small"
                value={selectedPermissions[permission] || ''}
                onChange={(e) =>
                  handlePermissionChange(permission, e.target.value)
                }
                disabled={id === 'Admin'}
                displayEmpty
              >
                <MenuItem value="">None</MenuItem>
                {permissionOptions.map((option) => (
                  <MenuItem key={option} value={option}>
                    {option}
                  </MenuItem>
                ))}
              </Select>
            </Box>
          </Box>
        </Box>
      ))}
    </Box>
  )
}

export default PageClaimsCard
