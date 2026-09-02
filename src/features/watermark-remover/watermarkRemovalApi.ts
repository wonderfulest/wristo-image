export type WatermarkRemovalMode = 'automatic' | 'mask'
export type WatermarkTaskState = 'pending' | 'running' | 'succeeded' | 'failed'

export interface WatermarkTaskStatus {
  status: WatermarkTaskState
  resultAvailable: boolean
  message?: string
  resultUrl?: string
}

type Fetcher = typeof fetch

const taskUrl = (token?: string): string =>
  `/api/image-tools/watermark-removal/tasks${token ? `/${encodeURIComponent(token)}` : ''}`

const readJson = async <T>(response: Response): Promise<T> => {
  const body = await response.json().catch(() => ({})) as { msg?: string }
  if (!response.ok) throw new Error(body.msg || 'AI 去水印服务暂时不可用')
  return body as T
}

export const createWatermarkRemovalTask = async (
  input: { image: Blob; mode: WatermarkRemovalMode; mask?: Blob },
  fetcher: Fetcher = fetch,
): Promise<{ taskToken: string; status: WatermarkTaskState }> => {
  const body = new FormData()
  body.append('image', input.image)
  body.append('mode', input.mode)
  if (input.mask) body.append('mask', input.mask)
  return readJson(await fetcher(taskUrl(), { method: 'POST', body }))
}

export const getWatermarkRemovalTask = async (
  token: string,
  fetcher: Fetcher = fetch,
): Promise<WatermarkTaskStatus> => {
  const status = await readJson<WatermarkTaskStatus>(await fetcher(taskUrl(token)))
  return status.status === 'succeeded' && status.resultAvailable
    ? { ...status, resultUrl: `${taskUrl(token)}/result` }
    : status
}

export const waitForWatermarkRemoval = async (
  token: string,
  options: {
    fetcher?: Fetcher
    delay?: (milliseconds: number) => Promise<void>
    intervalMs?: number
    maxAttempts?: number
  } = {},
): Promise<WatermarkTaskStatus> => {
  const fetcher = options.fetcher ?? fetch
  const delay = options.delay ?? ((milliseconds) => new Promise(resolve => setTimeout(resolve, milliseconds)))
  const maxAttempts = options.maxAttempts ?? 60
  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const status = await getWatermarkRemovalTask(token, fetcher)
    if (status.status === 'succeeded') return status
    if (status.status === 'failed') throw new Error(status.message || 'AI 去水印处理失败')
    await delay(options.intervalMs ?? 1500)
  }
  throw new Error('AI 去水印处理超时，请稍后重试')
}
