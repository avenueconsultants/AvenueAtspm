import { ApproachSpeedChartOptionsDefaults } from '@/features/charts/approachSpeed/types'
import { BinSizeDropdown } from '@/features/charts/components/selectChart/BinSizeDropdown'
import { Default } from '@/features/charts/types'
import { Alert, SelectChangeEvent } from '@mui/material'
import { useState } from 'react'

interface ApproachSpeedChartOptionsProps {
  chartDefaults: ApproachSpeedChartOptionsDefaults
  handleChartOptionsUpdate: (update: Default) => void
}

export const ApproachSpeedChartOptions = ({
  chartDefaults,
  handleChartOptionsUpdate,
}: ApproachSpeedChartOptionsProps) => {
  const [binSize, setBinSize] = useState(chartDefaults.binSize?.value)

  const handleBinSizeChange = (event: SelectChangeEvent<string>) => {
    const newBinSize = event.target.value
    setBinSize(newBinSize)

    handleChartOptionsUpdate({
      id: chartDefaults.binSize.id,
      option: chartDefaults.binSize.option,
      value: newBinSize,
    })
  }

  return (
    <>
      {binSize === undefined ? (
        <Alert severity="error" sx={{ mt: 1 }}>
          Bin Size default value not found.
        </Alert>
      ) : (
        <BinSizeDropdown
          value={binSize}
          handleChange={handleBinSizeChange}
          id="approach-speed"
        />
      )}
    </>
  )
}
