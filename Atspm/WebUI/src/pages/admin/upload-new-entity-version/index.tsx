import { usePostApiV1EntityFileGeojsonFetchFile } from '@/api/speedManagement/aTSPMSpeedManagementApi'
import { ResponsivePageLayout } from '@/components/ResponsivePage'
import { useNotificationStore } from '@/stores/notifications'
import { dateToTimestamp } from '@/utils/dateTime'
import { zodResolver } from '@hookform/resolvers/zod'
import {
  Box,
  Button,
  FormControl,
  FormHelperText,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Stack,
  TextField,
  Typography,
} from '@mui/material'
import { DatePicker } from '@mui/x-date-pickers/DatePicker'
import { Controller, useForm } from 'react-hook-form'
import { z } from 'zod'

const SOURCE_OPTIONS = [
  { label: 'ClearGuide', value: 3 },
  { label: 'PeMS', value: 2 },
]

const schema = z.object({
  bucketName: z.string().min(1, 'Bucket name is required'),
  fileName: z.string().min(1, 'File name is required'),
  startDate: z.date().refine((date) => dateToTimestamp(date), 'Invalid date'),
  sourceId: z
    .number({ required_error: 'Select a data source' })
    .refine((v) => v === 2 || v === 3, 'Select a data source'),
})

type FormValues = z.infer<typeof schema>

export default function UpdateEntityVersion() {
  const { addNotification } = useNotificationStore()
  const { mutate: fetchFile, isLoading: isPending } =
    usePostApiV1EntityFileGeojsonFetchFile()

  const {
    register,
    control,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      bucketName: '',
      fileName: '',
      startDate: new Date(),
      sourceId: 3,
    },
  })

  const onSubmit = (values: FormValues) => {
    fetchFile(
      { params: values },
      {
        onSuccess: () => {
          addNotification({
            title: 'File submitted for processing',
            type: 'success',
          })
          reset(values)
        },
        onError: (err) => {
          addNotification({
            title:
              err?.response?.data?.message ??
              err?.message ??
              'Failed to submit file',
            type: 'error',
          })
        },
      }
    )
  }

  return (
    <ResponsivePageLayout
      title="Upload New Entity Version"
      hideTitle
      noBottomMargin
      useFullWidth
    >
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          mb: 3,
        }}
      >
        <Paper sx={{ p: 3, maxWidth: 560 }}>
          <Typography variant="h5" gutterBottom>
            Process File from Google Cloud Storage
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Provide the bucket, file name, start date, and source. The API will
            process the file.
          </Typography>

          <Box component="form" onSubmit={handleSubmit(onSubmit)} noValidate>
            <Stack spacing={2.5}>
              <TextField
                label="Bucket Name"
                fullWidth
                required
                {...register('bucketName')}
                error={!!errors.bucketName}
                helperText={errors.bucketName?.message}
                placeholder="e.g., my-gcs-bucket"
                autoComplete="off"
              />

              <TextField
                label="File Name"
                fullWidth
                required
                {...register('fileName')}
                error={!!errors.fileName}
                helperText={errors.fileName?.message}
                placeholder="e.g., path/to/file.geojson"
                autoComplete="off"
              />

              <Controller
                name="startDate"
                control={control}
                render={({ field }) => (
                  <DatePicker
                    label="Start Date"
                    value={field.value}
                    onChange={(date: Date | null) => field.onChange(date)}
                    slotProps={{
                      textField: {
                        required: true,
                        fullWidth: true,
                        error: !!errors.startDate,
                        helperText: errors.startDate?.message,
                      },
                    }}
                  />
                )}
              />

              <Controller
                name="sourceId"
                control={control}
                render={({ field }) => {
                  const labelId = 'source-select-label'
                  return (
                    <FormControl fullWidth required error={!!errors.sourceId}>
                      <InputLabel id={labelId}>Source</InputLabel>
                      <Select
                        labelId={labelId}
                        label="Source"
                        value={field.value}
                        onChange={(e) => field.onChange(Number(e.target.value))}
                      >
                        {SOURCE_OPTIONS.map((opt) => (
                          <MenuItem key={opt.value} value={opt.value}>
                            {opt.label}
                          </MenuItem>
                        ))}
                      </Select>
                      <FormHelperText>
                        {errors.sourceId?.message}
                      </FormHelperText>
                    </FormControl>
                  )
                }}
              />
              <Button
                type="submit"
                variant="contained"
                disabled={isPending}
                sx={{ alignSelf: 'flex-start' }}
              >
                {isPending ? 'Submitting…' : 'Submit'}
              </Button>
            </Stack>
          </Box>
        </Paper>
      </Box>
    </ResponsivePageLayout>
  )
}
