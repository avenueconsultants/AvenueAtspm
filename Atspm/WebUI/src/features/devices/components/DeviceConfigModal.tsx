import { useGetDeviceConfigurationEventLogDecoders } from '@/api/config/aTSPMConfigurationApi'
import { knownKeys } from '@/features/devices/components/DeviceConfigCustomRenderCell'
import { DeviceConfiguration } from '@/features/devices/types/index'
import { useGetProducts } from '@/features/products/api'
import { ConfigEnum, useConfigEnums } from '@/hooks/useConfigEnums'
import { zodResolver } from '@hookform/resolvers/zod'
import DeleteIcon from '@mui/icons-material/Delete'
import {
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  IconButton,
  InputLabel,
  MenuItem,
  Select,
  TextField,
} from '@mui/material'
import { useEffect } from 'react'
import { useFieldArray, useForm } from 'react-hook-form'
import { z } from 'zod'

interface ModalProps {
  data?: DeviceConfiguration
  isOpen: boolean
  onClose: () => void
  onSave: (device: DeviceConfiguration) => void
}

const deviceConfigSchema = z.object({
  id: z.number().nullable().optional(),
  description: z.string(),
  notes: z.string().optional(),
  protocol: z.string().min(1),
  port: z.number().min(1),
  path: z.string().min(1),
  query: z.array(z.string()),
  connectionProperties: z
    .array(
      z.object({
        key: z.string(),
        value: z.string(),
      })
    )
    .nullable(),
  connectionTimeout: z.number(),
  operationTimeout: z.number(),
  loggingOffset: z.number().nullable(),
  decoders: z.array(z.string()).nullable(),
  userName: z.string(),
  password: z.string(),
  productId: z.number({ required_error: 'Product is required' }).nullable(),
})

type DeviceConfigFormData = z.infer<typeof deviceConfigSchema>

const DeviceConfigModal = ({
  data: deviceConfiguration,
  isOpen,
  onClose,
  onSave,
}: ModalProps) => {
  const { data: productData } = useGetProducts()
  const { data: allDecodersData } = useGetDeviceConfigurationEventLogDecoders()
  const { data: transportProtocols } = useConfigEnums(
    ConfigEnum.TransportProtocols
  )
  console.log(allDecodersData)
  const defaultConnectionProperties = deviceConfiguration
    ? Object.entries(deviceConfiguration)
        .filter(([key]) => !knownKeys.has(key))
        .map(([key, value]) => ({ key, value: String(value) }))
    : null

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    control,
    formState: { errors },
  } = useForm<DeviceConfigFormData>({
    resolver: zodResolver(deviceConfigSchema),
    defaultValues: {
      description: deviceConfiguration?.description,
      notes: deviceConfiguration?.notes || '',
      protocol: deviceConfiguration?.protocol || '',
      port: deviceConfiguration?.port,
      path: deviceConfiguration?.path || '',
      query:
        deviceConfiguration?.query && deviceConfiguration.query.length > 0
          ? deviceConfiguration.query
          : [''],
      connectionTimeout: deviceConfiguration?.connectionTimeout,
      operationTimeout: deviceConfiguration?.operationTimeout,
      loggingOffset: deviceConfiguration?.loggingOffset ?? 0,
      decoders: deviceConfiguration?.decoders || [],
      userName: deviceConfiguration?.userName || '',
      password: deviceConfiguration?.password || '',
      productId: deviceConfiguration?.productId,
      id: deviceConfiguration?.id ?? null,
      // Use the computed extra properties
      connectionProperties: defaultConnectionProperties ?? null,
    },
  })

  useEffect(() => {
    if (!deviceConfiguration) return

    setValue('protocol', deviceConfiguration.protocol)
    setValue('productId', deviceConfiguration.productId ?? null)

    Object.entries(deviceConfiguration).forEach(([key, value]) => {
      if (key !== 'protocol' && key !== 'productId') {
        setValue(key as keyof DeviceConfigFormData, value as any)
      }
    })
  }, [deviceConfiguration, setValue])

  const onSubmit = async (data: DeviceConfigFormData) => {
    try {
      const selectedProduct = productData?.value.find(
        (product) => product.id === data.productId
      )

      const { connectionProperties, ...rest } = data

      const flattenedConnectionProperties = Array.isArray(connectionProperties)
        ? connectionProperties.reduce(
            (acc, { key, value }) => {
              if (key) acc[key] = value
              return acc
            },
            {} as Record<string, any>
          )
        : connectionProperties

      const mergedDevice = {
        ...rest,
        ...flattenedConnectionProperties,
        productName: selectedProduct?.model || '',
      }

      onSave(mergedDevice as DeviceConfiguration)
      onClose()
    } catch (error) {
      console.error('Error occurred while editing/creating device:', error)
    }
  }

  const {
    fields: queryFields,
    append: appendQuery,
    remove: removeQuery,
  } = useFieldArray({
    control,
    name: 'query',
  })

  const {
    fields: connectionFields,
    append: appendConnection,
    remove: removeConnection,
  } = useFieldArray({
    control,
    name: 'connectionProperties',
  })

  return (
    <Dialog open={isOpen} onClose={onClose}>
      <DialogTitle sx={{ fontSize: '1.3rem' }} id="role-permissions-label">
        Device Configuration Details
      </DialogTitle>

      <DialogContent sx={{ maxWidth: '457px' }}>
        <form onSubmit={handleSubmit(onSubmit)}>
          <Box sx={{ display: 'flex', gap: 2 }}>
            <TextField
              {...register('description')}
              autoFocus
              margin="dense"
              id="description"
              label="Description"
              type="text"
              fullWidth
              error={!!errors.description}
              helperText={errors.description ? errors.description.message : ''}
            />
            <FormControl fullWidth margin="dense">
              <InputLabel id="product-label">Product</InputLabel>
              <Select
                labelId="product-label"
                id="product-select"
                label="Product"
                error={!!errors.productId}
                value={watch('productId') || ''}
                onChange={(e) =>
                  setValue('productId', Number(e.target.value), {
                    shouldValidate: true,
                  })
                }
              >
                {productData?.value.map((product) => (
                  <MenuItem key={product.id} value={product.id}>
                    {product.model}
                  </MenuItem>
                ))}
              </Select>
              {errors.productId && (
                <p style={{ color: 'red', fontSize: '12px' }}>
                  Product Required
                </p>
              )}
            </FormControl>
          </Box>

          <Box sx={{ display: 'flex', gap: 2 }}>
            <TextField
              {...register('path')}
              margin="dense"
              id="path"
              label="Path"
              type="text"
              fullWidth
              error={!!errors.path}
              helperText={errors.path ? 'Path Required' : ''}
            />
          </Box>
          {/* Query Fields Section */}
          <Box sx={{ mt: 2 }}>
            <InputLabel>Queries</InputLabel>
            {queryFields.map((field, index) => (
              <Box
                key={field.id}
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1,
                  mb: 1,
                }}
              >
                <TextField
                  {...register(`query.${index}`)}
                  margin="dense"
                  label={`Query ${index + 1}`}
                  fullWidth
                  error={!!errors.query?.[index]}
                  helperText={
                    errors.query?.[index] ? errors.query[index].message : ''
                  }
                />
                <IconButton
                  size="small"
                  onClick={() => removeQuery(index)}
                  sx={{ mt: 1 }}
                >
                  <DeleteIcon />
                </IconButton>
              </Box>
            ))}
            <Button
              variant="outlined"
              size="small"
              onClick={() => appendQuery('')}
            >
              + Query
            </Button>
          </Box>
          <Box sx={{ mt: 2, mb: 2 }}>
            <InputLabel>Connection Properties</InputLabel>
            {connectionFields.map((field, index) => (
              <Box
                key={field.id}
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1,
                  mb: 1,
                }}
              >
                <TextField
                  {...register(`connectionProperties.${index}.key`)}
                  margin="dense"
                  label={`Key ${index + 1}`}
                  fullWidth
                  error={!!errors.connectionProperties?.[index]?.key}
                  helperText={
                    errors.connectionProperties?.[index]?.key
                      ? errors.connectionProperties[index].key?.message
                      : ''
                  }
                />
                <TextField
                  {...register(`connectionProperties.${index}.value`)}
                  margin="dense"
                  label={`Value ${index + 1}`}
                  fullWidth
                  error={!!errors.connectionProperties?.[index]?.value}
                  helperText={
                    errors.connectionProperties?.[index]?.value
                      ? errors.connectionProperties[index].value?.message
                      : ''
                  }
                />
                <IconButton
                  size="small"
                  onClick={() => removeConnection(index)}
                  sx={{ mt: 1 }}
                >
                  <DeleteIcon />
                </IconButton>
              </Box>
            ))}
            <Button
              variant="outlined"
              size="small"
              onClick={() => appendConnection({ key: '', value: '' })}
            >
              + Connection Property
            </Button>
          </Box>
          <Box sx={{ display: 'flex', gap: 2 }}>
            <TextField
              {...register('port', { valueAsNumber: true })}
              margin="dense"
              id="port"
              label="Port"
              type="number"
              fullWidth
              error={!!errors.port}
              helperText={errors.port ? 'Port Required' : ''}
            />
            <FormControl fullWidth margin="dense">
              <InputLabel id="protocol-label">Protocol</InputLabel>
              <Select
                labelId="protocol-label"
                id="protocol-select"
                label="Protocol"
                error={!!errors.protocol}
                value={watch('protocol') || ''}
                onChange={(e) => setValue('protocol', e.target.value)}
              >
                {transportProtocols?.map((protocol) => (
                  <MenuItem key={protocol.value} value={protocol.name}>
                    {protocol.name}
                  </MenuItem>
                ))}
              </Select>
              {errors.protocol && (
                <p style={{ color: 'red', fontSize: '12px' }}>
                  Protocol Required
                </p>
              )}
            </FormControl>
          </Box>
          <Box sx={{ display: 'flex', gap: 2 }}>
            <TextField
              {...register('connectionTimeout', { valueAsNumber: true })}
              margin="dense"
              id="connectionTimeout"
              label="Connection Timeout"
              type="number"
              fullWidth
              error={!!errors.connectionTimeout}
              helperText={
                errors.connectionTimeout ? 'Connection Timeout Required' : ''
              }
            />
            <TextField
              {...register('operationTimeout', { valueAsNumber: true })}
              margin="dense"
              id="operationTimeout"
              label="Operation Timeout"
              type="number"
              fullWidth
              error={!!errors.operationTimeout}
              helperText={
                errors.operationTimeout ? 'Operation Timeout Required' : ''
              }
            />
          </Box>
          <Box sx={{ display: 'flex', gap: 2 }}>
            <TextField
              {...register('userName')}
              margin="dense"
              id="userName"
              label="Username"
              type="text"
              fullWidth
            />
            <TextField
              {...register('password')}
              margin="dense"
              id="password"
              label="Password"
              type="text"
              fullWidth
            />
          </Box>
          <FormControl fullWidth margin="dense" sx={{ mt: 2 }}>
            <InputLabel id="decoder-label">Decoders</InputLabel>
            <Select
              labelId="decoder-label"
              label="Decoders"
              id="decoder-select"
              multiple
              value={watch('decoders') || []}
              onChange={(e) =>
                setValue('decoders', e.target.value, { shouldValidate: true })
              }
              renderValue={(selected) => (
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                  {(selected as string[]).map((value) => (
                    <Chip key={value} label={value} />
                  ))}
                </Box>
              )}
            >
              {allDecodersData?.value?.map((decoder: string) => (
                <MenuItem key={decoder} value={decoder}>
                  {decoder}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <TextField
            {...register('notes')}
            margin="dense"
            id="notes"
            label="Notes"
            type="text"
            rows={3}
            multiline
            fullWidth
          />
          <DialogActions>
            <Button onClick={onClose}>Cancel</Button>
            <Button variant="contained" type="submit">
              Save
            </Button>
          </DialogActions>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export default DeviceConfigModal
