import { Autocomplete, Chip, TextField } from '@mui/material'
import * as React from 'react'

type Props = {
  EventCodes?: number[]
  setEventCodes: (codes: number[]) => void
  label?: string
  placeholder?: string
}

const clamp = (n: number) => Math.min(255, Math.max(0, n))
const uniqSort = (arr: number[]) =>
  Array.from(new Set(arr)).sort((a, b) => a - b)

function parseToCodes(raw: string): number[] {
  const s = raw.replace(/[–—]/g, '-')
  const tokens = s.split(/[,\s;]+/).filter(Boolean)
  const out: number[] = []
  for (const t of tokens) {
    const m = t.match(/^(\d{1,3})(?:\s*-\s*(\d{1,3}))?$/)
    if (!m) continue
    let a = clamp(parseInt(m[1], 10))
    if (Number.isNaN(a)) continue
    if (m[2]) {
      let b = clamp(parseInt(m[2], 10))
      if (Number.isNaN(b)) continue
      if (a > b) [a, b] = [b, a]
      for (let x = a; x <= b; x++) out.push(x)
    } else {
      out.push(a)
    }
  }
  return out
}

// [1,2,3,7,9,10,11,12] -> ["1-3","7","9-12"]
function condenseToRanges(nums?: number[]): string[] {
  const a = uniqSort(nums ?? [])
  if (!a.length) return []
  const out: string[] = []
  let start = a[0],
    prev = a[0]
  for (let i = 1; i < a.length; i++) {
    const n = a[i]
    if (n === prev + 1) {
      prev = n
      continue
    }
    out.push(start === prev ? `${start}` : `${start}-${prev}`)
    start = prev = n
  }
  out.push(start === prev ? `${start}` : `${start}-${prev}`)
  return out
}

function expandRanges(ranges: string[]): number[] {
  const out: number[] = []
  for (const r of ranges) out.push(...parseToCodes(r))
  return uniqSort(out)
}

export function EventCodesInput({
  EventCodes,
  setEventCodes,
  label = 'Event Codes',
  placeholder = 'e.g., 1,3,5-8,12',
}: Props) {
  const [inputValue, setInputValue] = React.useState('')

  const commit = (raw: string) => {
    const inc = parseToCodes(raw)
    if (!inc.length) return
    const current = Array.isArray(EventCodes) ? EventCodes : []
    setEventCodes(uniqSort([...current, ...inc]))
  }

  return (
    <Autocomplete
      multiple
      freeSolo
      options={[] as string[]}
      value={condenseToRanges(EventCodes ?? [])}
      onChange={(_, vals) => setEventCodes(expandRanges(vals))}
      inputValue={inputValue}
      onInputChange={(_, v) => setInputValue(v)}
      renderTags={(vals, getTagProps) =>
        vals.map((v, i) => (
          <Chip {...getTagProps({ index: i })} key={v} label={v} />
        ))
      }
      renderInput={(params) => (
        <TextField
          {...params}
          label={label}
          placeholder={placeholder}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ',' || e.key === 'Tab') {
              if (inputValue.trim()) {
                e.preventDefault()
                commit(inputValue)
                setInputValue('')
              }
            }
          }}
          onBlur={() => {
            if (inputValue.trim()) {
              commit(inputValue)
              setInputValue('')
            }
          }}
          onPaste={(e) => {
            const text = e.clipboardData.getData('text')
            if (text) {
              e.preventDefault()
              commit(text)
              setInputValue('')
            }
          }}
        />
      )}
    />
  )
}
