import { Box, MenuItem, Select, Typography } from '@mui/material'
import { useEffect, useState } from 'react'
import { Role } from '../types/roles'

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
  const claims = [
    'User:View',
    'User:Edit',
    'User:Delete',
    'Role:View',
    'Role:Edit',
    'Role:Delete',
    'LocationConfiguration:View',
    'LocationConfiguration:Edit',
    'LocationConfiguration:Delete',
    'GeneralConfiguration:View',
    'GeneralConfiguration:Edit',
    'GeneralConfiguration:Delete',
    'Data:View',
    'Data:Edit',
    'Watchdog:View',
    'Report:View',
  ]

  const SetInStone: Role[] = [
    {
      role: 'Admin',
      claims: ['Admin'],
    },
    {
      role: 'ReportAdmin',
      claims: ['Report:View'],
    },
    {
      role: 'RoleAdmin',
      claims: ['Role:View', 'Role:Edit', 'Role:Delete'],
    },
    {
      role: 'UserAdmin',
      claims: ['User:Edit', 'User:Delete', 'User:View'],
    },
    {
      role: 'LocationConfigurationAdmin',
      claims: [
        'LocationConfiguration:View',
        'LocationConfiguration:Edit',
        'LocationConfiguration:Delete',
      ],
    },
    {
      role: 'GeneralConfigurationAdmin',
      claims: [
        'GeneralConfiguration:View',
        'GeneralConfiguration:Edit',
        'GeneralConfiguration:Delete',
      ],
    },
    {
      role: 'DataAdmin',
      claims: ['Data:View', 'Data:Edit'],
    },
    {
      role: 'WatchdogSubscriber',
      claims: ['Watchdog:View'],
    },
  ]

  const spaceIdName = id
    ? id
        .toString()
        .replace(/(\[A-Z\])/g, ' $1')
        .trim()
    : ''

  const roleCurrentClaims =
    currentClaims.find((item) => item.role === id)?.claims || []
  const roleSetInStoneClaims =
    SetInStone.find((item) => item.role === id)?.claims || []

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

  const uniquePermissions = Array.from(new Set(claims.map(getPermissionName)))

  const formatPermissionName = (permission: string) => {
    return permission.replace(/(?<!^)([A-Z])/g, ' $1')
  }

  const handlePermissionChange = (permission: string, value: string) => {
    if (id === 'Admin' || roleSetInStoneClaims.length > 0) return

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
                disabled={id === 'Admin' || roleSetInStoneClaims.length > 0}
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
