import { describe, expect, it } from 'vitest'
import { consumeWheelZoom } from './zoomControl'

describe('consumeWheelZoom', () => {
  it('ignores small trackpad events until they accumulate into one zoom step', () => {
    let state = { remainder: 0, steps: 0 }

    for (let index = 0; index < 7; index += 1) {
      state = consumeWheelZoom(state.remainder, -10)
    }

    expect(state).toEqual({ remainder: -70, steps: 0 })
    expect(consumeWheelZoom(state.remainder, -10)).toEqual({ remainder: 0, steps: 1 })
  })

  it('limits a single wheel event to one zoom step', () => {
    expect(consumeWheelZoom(0, 240)).toEqual({ remainder: 0, steps: -1 })
  })
})
