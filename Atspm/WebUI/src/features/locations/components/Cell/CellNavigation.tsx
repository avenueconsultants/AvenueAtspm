import React, {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react'

type Focus = { approachId: number; row: number; col: number }

interface NavContext {
  focused: Focus
  setFocused: React.Dispatch<React.SetStateAction<Focus>>
}

const NavigationContext = createContext<NavContext | null>(null)

export const NavigationProvider = ({ children }: { children: ReactNode }) => {
  const [focused, setFocused] = useState<Focus>({
    approachId: -1,
    row: -1,
    col: -1,
  })

  const value = useMemo(() => ({ focused, setFocused }), [focused, setFocused])
  return (
    <NavigationContext.Provider value={value}>
      {children}
    </NavigationContext.Provider>
  )
}

export function useCellNavigation(
  approachId: number,
  row: number,
  col: number,
  rowCount: number,
  colCount: number
) {
  const ctx = useContext(NavigationContext)
  if (!ctx) throw new Error('Must be inside NavigationProvider')
  const { focused, setFocused } = ctx
  const [isEditing, setIsEditing] = useState(false)

  // clear edit if focus moves to a different table or cell
  useEffect(() => {
    if (
      (focused.approachId !== approachId ||
        focused.row !== row ||
        focused.col !== col) &&
      isEditing
    ) {
      setIsEditing(false)
    }
  }, [focused, approachId, row, col, isEditing])

  const openEditor = useCallback(() => {
    setIsEditing(true)
  }, [])

  const closeEditor = useCallback(() => {
    setIsEditing(false)
  }, [])

  const tabIndex =
    focused.approachId === approachId &&
    focused.row === row &&
    focused.col === col
      ? 0
      : -1

  const onFocus = useCallback(() => {
    setFocused({ approachId, row, col })
  }, [approachId, row, col, setFocused])

  const onKeyDown: React.KeyboardEventHandler<HTMLElement> = useCallback(
    (e) => {
      if (!isEditing && e.key === 'Tab') {
        e.preventDefault()
        e.stopPropagation()
        let r = row,
          c = col
        if (e.shiftKey) {
          // backwards
          if (c === 0) {
            c = colCount - 1
            r = r === 0 ? rowCount - 1 : r - 1
          } else {
            c--
          }
        } else {
          // forwards
          if (c === colCount - 1) {
            c = 0
            r = r === rowCount - 1 ? 0 : r + 1
          } else {
            c++
          }
        }
        console.log('Tab', { approachId, row: r, col: c })
        setFocused({ approachId, row: r, col: c })
        return
      }

      // ENTER to start editing
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
        let r = row,
          c = col
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
        setFocused({ approachId, row: r, col: c })
      }
    },
    [
      isEditing,
      openEditor,
      row,
      col,
      rowCount,
      colCount,
      setFocused,
      approachId,
    ]
  )
  return { tabIndex, onFocus, onKeyDown, isEditing, openEditor, closeEditor }
}
