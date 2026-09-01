import { describe, expect, it } from 'vitest'
import {
  HISTORY_PANEL_DEFAULT_WIDTH,
  loadHistoryPanelWidth,
  normalizeHistoryPanelWidth,
} from './historyPanelWidth'

describe('history panel width', () => {
  it('keeps the resized panel within the supported desktop range', () => {
    expect(normalizeHistoryPanelWidth(149)).toBe(150)
    expect(normalizeHistoryPanelWidth(286)).toBe(286)
    expect(normalizeHistoryPanelWidth(421)).toBe(420)
  })

  it('restores a valid saved width and ignores invalid stored values', () => {
    const storage = {
      getItem: (key: string) => key === 'wristo-image:history-panel-width' ? '312' : null,
    }

    expect(loadHistoryPanelWidth(storage)).toBe(312)
    expect(loadHistoryPanelWidth({ getItem: () => 'not-a-number' })).toBe(HISTORY_PANEL_DEFAULT_WIDTH)
    expect(loadHistoryPanelWidth({ getItem: () => null })).toBe(HISTORY_PANEL_DEFAULT_WIDTH)
  })
})
