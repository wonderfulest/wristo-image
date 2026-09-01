export const HISTORY_PANEL_WIDTH_STORAGE_KEY = 'wristo-image:history-panel-width'
export const HISTORY_PANEL_DEFAULT_WIDTH = 190
export const HISTORY_PANEL_MIN_WIDTH = 150
export const HISTORY_PANEL_MAX_WIDTH = 420

type ReadableStorage = Pick<Storage, 'getItem'>

export const normalizeHistoryPanelWidth = (width: number): number =>
  Math.min(HISTORY_PANEL_MAX_WIDTH, Math.max(HISTORY_PANEL_MIN_WIDTH, width))

export const loadHistoryPanelWidth = (storage: ReadableStorage): number => {
  const savedWidth = Number(storage.getItem(HISTORY_PANEL_WIDTH_STORAGE_KEY))
  return Number.isFinite(savedWidth) && savedWidth > 0
    ? normalizeHistoryPanelWidth(savedWidth)
    : HISTORY_PANEL_DEFAULT_WIDTH
}
