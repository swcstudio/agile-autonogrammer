import { isDeepStrictEqual } from 'node:util'
import {
  useReducer,
  type Reducer,
  useCallback,
  useMemo,
  useState,
  useEffect,
} from 'react'
import OptionMap from './option-map'
import { Option } from '@inkjs/ui'
import type { OptionHeader, OptionSubtree } from './select'

type State = {
  /**
   * Map where key is option's value and value is option's index.
   */
  optionMap: OptionMap

  /**
   * Number of visible options.
   */
  visibleOptionCount: number

  /**
   * Value of the currently focused option.
   */
  focusedValue: string | undefined

  /**
   * Index of the first visible option.
   */
  visibleFromIndex: number

  /**
   * Index of the last visible option.
   */
  visibleToIndex: number

  /**
   * Value of the previously selected option.
   */
  previousValue: string | undefined

  /**
   * Value of the selected option.
   */
  value: string | undefined
}

type Action =
  | FocusNextOptionAction
  | FocusPreviousOptionAction
  | SelectFocusedOptionAction
  | SetFocusAction
  | ResetAction

type SetFocusAction = {
  type: 'set-focus'
  value: string
}

type FocusNextOptionAction = {
  type: 'focus-next-option'
}

type FocusPreviousOptionAction = {
  type: 'focus-previous-option'
}

type SelectFocusedOptionAction = {
  type: 'select-focused-option'
}

type ResetAction = {
  type: 'reset'
  state: State
}

const reducer: Reducer<State, Action> = (state, action) => {
  switch (action.type) {
    case 'focus-next-option': {
      if (!state.focusedValue) {
        return state
      }

      const item = state.optionMap.get(state.focusedValue)

      if (!item) {
        return state
      }

      let next = item.next
      while (next && !('value' in next)) {
        // Skip headers
        next = next.next
      }

      if (!next) {
        return state
      }

      const needsToScroll = next.index >= state.visibleToIndex

      if (!needsToScroll) {
        return {
          ...state,
          focusedValue: next.value,
        }
      }

      const nextVisibleToIndex = Math.min(
        state.optionMap.size,
        state.visibleToIndex + 1,
      )

      const nextVisibleFromIndex = nextVisibleToIndex - state.visibleOptionCount

      return {
        ...state,
        focusedValue: next.value,
        visibleFromIndex: nextVisibleFromIndex,
        visibleToIndex: nextVisibleToIndex,
      }
    }

    case 'focus-previous-option': {
      if (!state.focusedValue) {
        return state
      }

      const item = state.optionMap.get(state.focusedValue)

      if (!item) {
        return state
      }

      let previous = item.previous
      while (previous && !('value' in previous)) {
        // Skip headers
        previous = previous.previous
      }

      if (!previous) {
        return state
      }

      const needsToScroll = previous.index <= state.visibleFromIndex

      if (!needsToScroll) {
        return {
          ...state,
          focusedValue: previous.value,
        }
      }

      const nextVisibleFromIndex = Math.max(0, state.visibleFromIndex - 1)

      const nextVisibleToIndex = nextVisibleFromIndex + state.visibleOptionCount

      return {
        ...state,
        focusedValue: previous.value,
        visibleFromIndex: nextVisibleFromIndex,
        visibleToIndex: nextVisibleToIndex,
      }
    }

    case 'select-focused-option': {
      return {
        ...state,
        previousValue: state.value,
        value: state.focusedValue,
      }
    }

    case 'reset': {
      return action.state
    }

    case 'set-focus': {
      return {
        ...state,
        focusedValue: action.value,
      }
    }
  }
}

export type UseSelectStateProps = {
  /**
   * Number of items to display.
   *
   * @default 5
   */
  visibleOptionCount?: number

  /**
   * Options.
   */
  options: (Option | OptionSubtree)[]

  /**
   * Initially selected option's value.
   */
  defaultValue?: string

  /**
   * Callback for selecting an option.
   */
  onChange?: (value: string) => void

  /**
   * Callback for focusing an option.
   */
  onFocus?: (value: string) => void

  /**
   * Value to focus
   */
  focusValue?: string
}

export type SelectState = Pick<
  State,
  'focusedValue' | 'visibleFromIndex' | 'visibleToIndex' | 'value'
> & {
  /**
   * Visible options.
   */
  visibleOptions: Array<(Option | OptionHeader) & { index: number }>

  /**
   * Focus next option and scroll the list down, if needed.
   */
  focusNextOption: () => void

  /**
   * Focus previous option and scroll the list up, if needed.
   */
  focusPreviousOption: () => void

  /**
   * Select currently focused option.
   */
  selectFocusedOption: () => void
}

const flattenOptions = (
  options: (Option | OptionSubtree)[],
): (Option | OptionHeader)[] =>
  options.flatMap(option => {
    if ('options' in option) {
      const flatSubtree = flattenOptions(option.options)
      const optionValues = flatSubtree.flatMap(o =>
        'value' in o ? o.value : [],
      )
      const header =
        option.header !== undefined
          ? [{ header: option.header, optionValues }]
          : []

      return [...header, ...flatSubtree]
    }
    return option
  })

const createDefaultState = ({
  visibleOptionCount: customVisibleOptionCount,
  defaultValue,
  options,
}: Pick<
  UseSelectStateProps,
  'visibleOptionCount' | 'defaultValue' | 'options'
>) => {
  const flatOptions = flattenOptions(options)

  const visibleOptionCount =
    typeof customVisibleOptionCount === 'number'
      ? Math.min(customVisibleOptionCount, flatOptions.length)
      : flatOptions.length

  const optionMap = new OptionMap(flatOptions)
  const firstOption = optionMap.first

  // Use defaultValue for focusedValue if it exists and is valid, otherwise use first option
  let focusedValue: string | undefined
  if (defaultValue && optionMap.get(defaultValue)) {
    focusedValue = defaultValue
  } else {
    focusedValue =
      firstOption && 'value' in firstOption ? firstOption.value : undefined
  }

  // Calculate visible range based on focused value
  let visibleFromIndex = 0
  let visibleToIndex = visibleOptionCount

  if (focusedValue && optionMap.get(focusedValue)) {
    const focusedIndex = optionMap.get(focusedValue)!.index
    // Center the focused option in the visible area if possible
    const halfVisible = Math.floor(visibleOptionCount / 2)
    visibleFromIndex = Math.max(0, focusedIndex - halfVisible)
    visibleToIndex = Math.min(
      flatOptions.length,
      visibleFromIndex + visibleOptionCount,
    )

    // Adjust if we can't show enough items at the end
    if (visibleToIndex - visibleFromIndex < visibleOptionCount) {
      visibleFromIndex = Math.max(0, visibleToIndex - visibleOptionCount)
    }
  }

  return {
    optionMap,
    visibleOptionCount,
    focusedValue,
    visibleFromIndex,
    visibleToIndex,
    previousValue: defaultValue,
    value: defaultValue,
  }
}

export const useSelectState = ({
  visibleOptionCount = 5,
  options,
  defaultValue,
  onChange,
  onFocus,
  focusValue,
}: UseSelectStateProps) => {
  const flatOptions = flattenOptions(options)

  const [state, dispatch] = useReducer(
    reducer,
    { visibleOptionCount, defaultValue, options },
    createDefaultState,
  )

  const [lastOptions, setLastOptions] = useState(flatOptions)

  if (
    flatOptions !== lastOptions &&
    !isDeepStrictEqual(flatOptions, lastOptions)
  ) {
    dispatch({
      type: 'reset',
      state: createDefaultState({ visibleOptionCount, defaultValue, options }),
    })

    setLastOptions(flatOptions)
  }

  const focusNextOption = useCallback(() => {
    dispatch({
      type: 'focus-next-option',
    })
  }, [])

  const focusPreviousOption = useCallback(() => {
    dispatch({
      type: 'focus-previous-option',
    })
  }, [])

  const selectFocusedOption = useCallback(() => {
    dispatch({
      type: 'select-focused-option',
    })
  }, [])

  const visibleOptions = useMemo(() => {
    return flatOptions
      .map((option, index) => ({
        ...option,
        index,
      }))
      .slice(state.visibleFromIndex, state.visibleToIndex)
  }, [flatOptions, state.visibleFromIndex, state.visibleToIndex])

  useEffect(() => {
    if (state.value && state.previousValue !== state.value) {
      onChange?.(state.value)
    }
  }, [state.previousValue, state.value, options, onChange])

  useEffect(() => {
    if (state.focusedValue) {
      onFocus?.(state.focusedValue)
    }
  }, [state.focusedValue, onFocus])

  useEffect(() => {
    if (focusValue) {
      dispatch({
        type: 'set-focus',
        value: focusValue,
      })
    }
  }, [focusValue])

  return {
    focusedValue: state.focusedValue,
    visibleFromIndex: state.visibleFromIndex,
    visibleToIndex: state.visibleToIndex,
    value: state.value,
    visibleOptions,
    focusNextOption,
    focusPreviousOption,
    selectFocusedOption,
  }
}
