import { describe, expect, it } from 'vitest'
import { WEEKDAY_BADGE_CANVAS, createWeekdayBadgePreset } from './weekdayBadge'

describe('weekdayBadge', () => {
  it('creates the seven reference weekday states on the fixed transparent canvas', () => {
    expect(WEEKDAY_BADGE_CANVAS).toEqual({ width: 183, height: 41 })
    expect(createWeekdayBadgePreset()).toEqual([
      expect.objectContaining({ text: 'S', fileName: 'sunday', slot: 156 }),
      expect.objectContaining({ text: 'M', fileName: 'monday', slot: 0 }),
      expect.objectContaining({ text: 'T', fileName: 'tuesday', slot: 26 }),
      expect.objectContaining({ text: 'W', fileName: 'wednesday', slot: 52 }),
      expect.objectContaining({ text: 'T', fileName: 'thursday', slot: 78 }),
      expect.objectContaining({ text: 'F', fileName: 'friday', slot: 104 }),
      expect.objectContaining({ text: 'S', fileName: 'saturday', slot: 130 }),
    ])
  })
})
