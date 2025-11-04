import {
  usePostApiV1EntityFileAtspmRefresh,
  usePostApiV1EntityFileGeojsonFetchFile,
  usePostApiV1EntityFileShapefileFetchFile,
} from '@/api/speedManagement/aTSPMSpeedManagementApi'
import { ResponsivePageLayout } from '@/components/ResponsivePage'
import { useNotificationStore } from '@/stores/notifications'
import { dateToTimestamp } from '@/utils/dateTime'
import { zodResolver } from '@hookform/resolvers/zod'
import {
  Alert,
  Box,
  Button,
  Divider,
  List,
  ListItemButton,
  ListItemText,
  Paper,
  Stack,
  TextField,
  Typography,
} from '@mui/material'
import { DatePicker } from '@mui/x-date-pickers/DatePicker'
import { Controller, useForm } from 'react-hook-form'
import { z } from 'zod'

const SOURCE_OPTIONS = [
  { label: 'ATSPM', value: 1 },
  { label: 'PeMS', value: 2 },
  { label: 'ClearGuide', value: 3 },
] as const

const FILE_TYPE_OPTIONS = [
  { label: 'GeoJSON', value: 'geojson' as const },
  { label: 'Shapefile', value: 'shapefile' as const },
]

const baseSchema = z.object({
  sourceId: z.number(),
  bucketName: z.string(),
  fileName: z.string(),
  startDate: z.date(),
  endDate: z.date().optional(),
  fileType: z.enum(['geojson', 'shapefile']).optional(),
})
type BaseForm = z.infer<typeof baseSchema>

function validate(values: BaseForm) {
  const { sourceId, fileType, bucketName, fileName, startDate } = values
  if (sourceId === 1) return { ok: true as const }
  if (sourceId === 2) {
    if (!bucketName)
      return { ok: false as const, message: 'Bucket name is required' }
    if (!fileName)
      return { ok: false as const, message: 'File name is required' }
    if (!startDate || !dateToTimestamp(startDate))
      return { ok: false as const, message: 'Invalid start date' }
    return { ok: true as const }
  }
  if (sourceId === 3) {
    if (!fileType)
      return {
        ok: false as const,
        message: 'Select a file type for ClearGuide',
      }
    if (!bucketName)
      return { ok: false as const, message: 'Bucket name is required' }
    if (!fileName)
      return { ok: false as const, message: 'File name is required' }
    if (!startDate || !dateToTimestamp(startDate))
      return { ok: false as const, message: 'Invalid start date' }
    return { ok: true as const }
  }
  return { ok: false as const, message: 'Invalid selection' }
}

export default function Versions() {
  const { addNotification } = useNotificationStore()
  const { mutate: processGeojson, isLoading: isProcessingGeojson } =
    usePostApiV1EntityFileGeojsonFetchFile()

  const { mutateAsync: processShapefile, isLoading: isProcessingShapefile } =
    usePostApiV1EntityFileShapefileFetchFile()

  const { mutate: refreshAtspm, isLoading: isRefreshingAtspm } =
    usePostApiV1EntityFileAtspmRefresh()

  const { register, control, handleSubmit, setValue, watch, reset } =
    useForm<BaseForm>({
      resolver: zodResolver(baseSchema),
      defaultValues: {
        sourceId: 3,
        fileType: undefined,
        bucketName: '',
        fileName: '',
        startDate: undefined,
      },
    })

  const sourceId = watch('sourceId')
  const fileType = watch('fileType')
  const isSubmitBusy = isProcessingGeojson || isProcessingShapefile

  const submitCommon = (values: BaseForm) => {
    processGeojson(
      {
        params: {
          bucketName: values.bucketName,
          fileName: values.fileName,
          startDate: dateToTimestamp(values.startDate),
          sourceId: values.sourceId,
        },
      },
      {
        onSuccess: () => {
          addNotification({
            title: 'File submitted for processing',
            type: 'success',
          })
          reset({ ...values })
        },
        onError: (err: any) =>
          addNotification({
            title:
              err?.response?.data?.message ??
              err?.message ??
              'Failed to submit file',
            type: 'error',
          }),
      }
    )
  }

  const onSubmit = async (values: BaseForm) => {
    const gate = validate(values)
    if (!gate.ok) return addNotification({ title: gate.message, type: 'error' })

    if (values.sourceId === 2) return submitCommon(values)

    if (values.sourceId === 3) {
      if (values.fileType === 'geojson') return submitCommon(values)
      try {
        await processShapefile({
          params: {
            bucketName: values.bucketName,
            fileName: values.fileName,
            sourceId: values.sourceId,
          },
        }).then(() => {
          submitCommon(values)
        })
      } catch (e) {
        addNotification({
          title: e?.message ?? 'Failed to preprocess shapefile',
          type: 'error',
        })
      }
    }
  }

  const handleRefreshAtspm = async () => {
    try {
      await refreshAtspm({})
      addNotification({
        title: 'ATSPM data refresh started',
        type: 'success',
      })
    } catch (e) {
      addNotification({
        title: e?.message ?? 'Failed to refresh ATSPM',
        type: 'error',
      })
    }
  }

  const handleSourceClick = (value: number) => {
    setValue('sourceId', value, { shouldValidate: true, shouldDirty: true })
    if (value !== 3) setValue('fileType', undefined)
  }

  return (
    <ResponsivePageLayout title="Update Source Version">
      <Paper sx={{ p: 3 }}>
        <Typography variant="h5" gutterBottom>
          Manage Data Source & Processing
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          Choose a data source on the left to see how to update its version.
        </Typography>

        <Box sx={{ display: 'flex', alignItems: 'flex-start' }}>
          {/* LEFT: LIST of sources (only thing on the left) */}
          <Box
            sx={{
              flexShrink: 0,
              minWidth: '300px',
              overflowY: 'auto',
              maxHeight: '100%',
            }}
          >
            <List>
              {SOURCE_OPTIONS.map((opt) => (
                <ListItemButton
                  key={opt.value}
                  selected={sourceId === opt.value}
                  onClick={() => handleSourceClick(opt.value)}
                >
                  <ListItemText primary={opt.label} />
                </ListItemButton>
              ))}
            </List>
          </Box>

          <Divider orientation="vertical" flexItem sx={{ mx: 3 }} />

          {/* RIGHT: dynamic panel */}
          <Box sx={{ flex: 1, maxWidth: 800 }}>
            {/* ATSPM → only button */}
            {sourceId === 1 && (
              <>
                <Typography variant="h6" sx={{ mb: 1 }}>
                  ATSPM • Refresh Data
                </Typography>
                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{ mb: 3 }}
                >
                  Updates the ATSPM dataset. No bucket or file input is
                  required; the server uses configured connections to pull the
                  latest data and re-run any necessary processing.
                </Typography>
                {!isRefreshingAtspm && (
                  <Button
                    variant="contained"
                    onClick={handleRefreshAtspm}
                    disabled={isRefreshingAtspm}
                  >
                    Refresh Data
                  </Button>
                )}
                {isRefreshingAtspm && (
                  <Alert severity="info" sx={{ mt: 2 }}>
                    ATSPM data refresh is in progress. No further action is
                    required.
                  </Alert>
                )}
              </>
            )}

            {/* ClearGuide → File Type selector (shown on the RIGHT) */}
            {sourceId === 3 && (
              <Stack spacing={2} sx={{ maxWidth: 400, mb: 3 }}>
                <Typography variant="h6">ClearGuide Options</Typography>
                <Stack direction="row" spacing={1}>
                  {FILE_TYPE_OPTIONS.map((ft) => (
                    <Button
                      key={ft.value}
                      variant={fileType === ft.value ? 'contained' : 'outlined'}
                      onClick={() =>
                        setValue('fileType', ft.value, { shouldDirty: true })
                      }
                    >
                      {ft.label}
                    </Button>
                  ))}
                </Stack>
                {fileType === 'shapefile' && (
                  <Typography variant="body2" color="text.secondary">
                    Shapefile will be converted into GeoJSON before processing.
                  </Typography>
                )}
              </Stack>
            )}

            {/* PeMS and ClearGuide (with a fileType selected) → form */}
            {sourceId === 2 || (sourceId === 3 && !!fileType) ? (
              <Box
                component="form"
                onSubmit={handleSubmit(onSubmit)}
                noValidate
                sx={{ maxWidth: 640 }}
              >
                <Typography variant="h6" sx={{ mb: 2 }}>
                  {sourceId === 2 &&
                    'PeMS • Process File from Google Cloud Storage'}
                  {sourceId === 3 &&
                    (fileType === 'geojson'
                      ? 'ClearGuide (GeoJSON) • Process File from Google Cloud Storage'
                      : 'ClearGuide (Shapefile) • Preprocess then Process')}
                </Typography>
                <Alert severity="info" sx={{ mb: 3 }}>
                  This page does not upload files. Place your provided
                  GeoJSON/Shapefile files from source in your cloud bucket
                  first, then provide the bucket and object path below to
                  process it and create a new dataset version
                </Alert>

                {fileType === 'shapefile' && (
                  <Alert severity="warning" sx={{ mb: 3 }}>
                    Make sure a .shx, .shp, and .dbf file are all included in
                    the bucket
                  </Alert>
                )}

                <Stack spacing={2.5}>
                  <TextField
                    label="Bucket Name"
                    fullWidth
                    required
                    {...register('bucketName')}
                    placeholder="e.g., my-bucket"
                    autoComplete="off"
                    helperText="The name of the Google Cloud Storage bucket containing the file you want to process."
                  />
                  <TextField
                    label="File Name"
                    fullWidth
                    required
                    {...register('fileName')}
                    placeholder={
                      sourceId === 3 && fileType === 'shapefile'
                        ? 'e.g., path/to/files.shp'
                        : 'e.g., path/to/file.geojson'
                    }
                    autoComplete="off"
                    helperText="The name of the file you want to process. This will also be used to identify the version."
                  />
                  <Box sx={{ display: 'flex', gap: 2 }}>
                    <Controller
                      name="startDate"
                      control={control}
                      render={({ field }) => (
                        <DatePicker
                          label="Version Start Date"
                          value={field.value ?? null}
                          onChange={(date: Date | null) =>
                            field.onChange(date ?? undefined)
                          }
                          slotProps={{
                            textField: { required: true },
                          }}
                        />
                      )}
                    />
                    <Controller
                      name="endDate"
                      control={control}
                      render={({ field }) => (
                        <DatePicker
                          label="Version End Date"
                          value={field.value ?? null}
                          onChange={(date: Date | null) =>
                            field.onChange(date ?? undefined)
                          }
                        />
                      )}
                    />
                  </Box>

                  <Stack direction="row" spacing={1.5}>
                    <Button
                      type="submit"
                      variant="contained"
                      disabled={isSubmitBusy}
                    >
                      {isSubmitBusy
                        ? sourceId === 3 && fileType === 'shapefile'
                          ? 'Preprocessing…'
                          : 'Submitting…'
                        : sourceId === 3 && fileType === 'shapefile'
                          ? 'Preprocess & Submit'
                          : 'Submit'}
                    </Button>
                    <Button
                      type="button"
                      variant="outlined"
                      onClick={() =>
                        reset({
                          sourceId,
                          fileType: sourceId === 3 ? fileType : undefined,
                          bucketName: '',
                          fileName: '',
                          startDate: new Date(),
                        })
                      }
                      disabled={isSubmitBusy}
                    >
                      Reset
                    </Button>
                  </Stack>
                </Stack>
              </Box>
            ) : sourceId !== 1 ? (
              <Typography variant="body2" color="text.secondary">
                Select a file type or a different source to continue.
              </Typography>
            ) : null}
          </Box>
        </Box>
      </Paper>
    </ResponsivePageLayout>
  )
}
