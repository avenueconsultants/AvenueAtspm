import { DeviceConfiguration } from '@/features/devices/types/index'
import { useGetProducts } from '@/features/products/api'
import { ConfigEnum, useConfigEnums } from '@/hooks/useConfigEnums'
import { zodResolver } from '@hookform/resolvers/zod'
import DeleteIcon from '@mui/icons-material/Delete'
import {
  Box,
  Button,
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

// Define Zod schema for form validation
const deviceConfigSchema = z.object({
  id: z.number().nullable().optional(),
  description: z.string().optional(), // Updated field from C# model
  notes: z.string().optional(),
  protocol: z.string(),
  port: z.number().nullable(),
  path: z.string(), // Renamed from directory to path
  query: z.array(z.string()),
  connectionProperties: z
    .array(
      z.object({
        key: z.string().min(1, 'Key is required'),
        value: z.string(), // adjust as needed (e.g., make optional)
      })
    )
    // Optionally transform the array into an object:
    .transform((arr) =>
      arr.reduce<Record<string, any>>((acc, { key, value }) => {
        if (key) acc[key] = value
        return acc
      }, {})
    ),
  connectionTimeout: z.number().nullable(),
  operationTimeout: z.number().nullable(),
  loggingOffset: z.number().nullable(),
  decoders: z.array(z.string()),
  userName: z.string(),
  password: z.string(),
  productId: z
    .number()
    .nullable()
    .refine((val) => val !== null, 'Product is required'),
})

type DeviceConfigFormData = z.infer<typeof deviceConfigSchema>

const DeviceConfigModal = ({
  data: deviceConfiguration,
  isOpen,
  onClose,
  onSave,
}: ModalProps) => {
  const { data: productData } = useGetProducts()
  const { data: transportProtocols } = useConfigEnums(
    ConfigEnum.TransportProtocols
  )
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
      description: deviceConfiguration?.description || '',
      notes: deviceConfiguration?.notes || '',
      protocol: deviceConfiguration?.protocol || '',
      port: deviceConfiguration?.port ?? null,
      path: deviceConfiguration?.path || '',
      query:
        deviceConfiguration?.query && deviceConfiguration.query.length > 0
          ? deviceConfiguration.query
          : [''],
      connectionTimeout: deviceConfiguration?.connectionTimeout ?? null,
      operationTimeout: deviceConfiguration?.operationTimeout ?? null,
      connectionProperties:
        deviceConfiguration?.connectionProperties &&
        Object.keys(deviceConfiguration.connectionProperties).length > 0
          ? Object.entries(deviceConfiguration.connectionProperties).map(
              ([key, value]) => ({ key, value })
            )
          : [{ key: '', value: '' }],
      loggingOffset: deviceConfiguration?.loggingOffset ?? null,
      decoders: deviceConfiguration?.decoders || [],
      userName: deviceConfiguration?.userName || '',
      password: deviceConfiguration?.password || '',
      productId: deviceConfiguration?.productId ?? null,
      id: deviceConfiguration?.id ?? null,
    },
  })

  useEffect(() => {
    if (!deviceConfiguration) return

    setValue('protocol', deviceConfiguration.protocol)
    setValue('productId', deviceConfiguration.productId)

    Object.entries(deviceConfiguration).forEach(([key, value]) => {
      if (key !== 'protocol' && key !== 'productId') {
        setValue(key as keyof DeviceConfigFormData, value)
      }
    })
  }, [deviceConfiguration, setValue])

  const onSubmit = async (data: DeviceConfigFormData) => {
    try {
      const selectedProduct = productData?.value.find(
        (product) => product.id === data.productId
      )

      const sanitizedDevice: Partial<DeviceConfiguration> = {
        ...data,
        productName: selectedProduct?.model ? selectedProduct?.model : '',
      }

      onSave(sanitizedDevice as DeviceConfiguration)
      onClose()
    } catch (error) {
      console.error('Error occurred while editing/creating device:', error)
    }
  }
  const { fields, append, remove } = useFieldArray({
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
    <Dialog open={isOpen} onClose={onClose} fullWidth maxWidth="lg">
      <DialogTitle sx={{ fontSize: '1.3rem' }} id="role-permissions-label">
        Device Configuration Details
      </DialogTitle>

      <DialogContent>
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
                  {errors.productId.message}
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
            />
          </Box>
          {/* Query Fields Section */}
          <Box sx={{ mt: 2 }}>
            <InputLabel>Queries</InputLabel>
            {fields.map((field, index) => (
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
                  onClick={() => remove(index)}
                  sx={{ mt: 1 }}
                  disabled={fields.length === 1} // Prevent removing the last field
                >
                  <DeleteIcon />
                </IconButton>
              </Box>
            ))}
            <Button variant="outlined" size="small" onClick={() => append('')}>
              + Query
            </Button>
          </Box>
          <Box sx={{ mt: 2 }}>
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
                  disabled={connectionFields.length === 1}
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
              helperText={errors.port ? errors.port.message : ''}
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
                  {errors.protocol.message}
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
                errors.connectionTimeout ? errors.connectionTimeout.message : ''
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
                errors.operationTimeout ? errors.operationTimeout.message : ''
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
