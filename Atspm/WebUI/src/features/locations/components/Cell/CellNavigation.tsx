import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react'

type Focus = { row: number; col: number }

interface NavContext {
  focused: Focus
  setFocused: React.Dispatch<React.SetStateAction<Focus>>
}

const NavigationContext = createContext<NavContext | null>(null)

export const NavigationProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [focused, setFocused] = useState<Focus>({ row: 0, col: 0 })
  const value = useMemo(() => ({ focused, setFocused }), [focused, setFocused])
  return (
    <NavigationContext.Provider value={value}>
      {children}
    </NavigationContext.Provider>
  )
}

export function useCellNavigation(
  row: number,
  col: number,
  rowCount: number,
  colCount: number
) {
  const ctx = useContext(NavigationContext)
  if (!ctx) throw new Error('Must be inside NavigationProvider')
  const { focused, setFocused } = ctx
  const [isEditing, setIsEditing] = useState(false)

  useEffect(() => {
    if (!(focused.row === row && focused.col === col) && isEditing) {
      setIsEditing(false)
    }
  }, [focused.row, focused.col, row, col, isEditing])

  const openEditor = useCallback(() => {
    setIsEditing(true)
  }, [])

  const closeEditor = useCallback(() => {
    setIsEditing(false)
  }, [])

  const tabIndex = focused.row === row && focused.col === col ? 0 : -1

  const onFocus = useCallback(() => {
    setFocused({ row, col })
  }, [row, col, setFocused])

  const onKeyDown: React.KeyboardEventHandler<HTMLElement> = useCallback(
    (e) => {
      if (!isEditing && e.key === 'Enter') {
        e.preventDefault()
        e.stopPropagation()
        openEditor()
        return
      }
      if (
        !isEditing &&
        e.key.length === 1 &&
        !e.ctrlKey &&
        !e.metaKey &&
        !e.key.startsWith('Arrow')
      ) {
        e.preventDefault()
        e.stopPropagation()
        openEditor()
        return
      }
      if (e.key.startsWith('Arrow')) {
        e.preventDefault()
        e.stopPropagation()
        let r = row
        let c = col
        switch (e.key) {
          case 'ArrowRight':
            if (c === colCount - 1) {
              c = 0
              r = r === rowCount - 1 ? 0 : r + 1
            } else {
              c++
            }
            break
          case 'ArrowLeft':
            if (c === 0) {
              c = colCount - 1
              r = r === 0 ? rowCount - 1 : r - 1
            } else {
              c--
            }
            break
          case 'ArrowDown':
            r = r === rowCount - 1 ? 0 : r + 1
            break
          case 'ArrowUp':
            r = r === 0 ? rowCount - 1 : r - 1
            break
        }
        setFocused({ row: r, col: c })
      }
    },
    [isEditing, openEditor, row, col, rowCount, colCount, setFocused]
  )

  return { tabIndex, onFocus, onKeyDown, isEditing, openEditor, closeEditor }
}
