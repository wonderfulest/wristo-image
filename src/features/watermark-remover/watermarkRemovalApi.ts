import { authHeaders, readApi } from '@/features/auth/imageAuth'
export type WatermarkRemovalMode = 'automatic' | 'mask'
export type WatermarkTaskState = 'pending' | 'running' | 'succeeded' | 'failed' | 'expired'

export interface WatermarkTaskStatus {
  status: WatermarkTaskState
  resultAvailable: boolean
  message?: string
  resultUrl?: string
}

type Fetcher = typeof fetch

const taskUrl = (token?: string): string =>
  `/api/image-tools/watermark-removal/tasks${token ? `/${encodeURIComponent(token)}` : ''}`

const readJson = readApi
export interface ImageAccount { userId: string; balance: number; creditCost: number }
export const getImageAccount = async (): Promise<ImageAccount> =>
  readApi(await fetch('/api/image-tools/account', { headers: authHeaders(), cache: 'no-store' }))

export const createWatermarkRemovalTask = async (
  input: { image: Blob; mode: WatermarkRemovalMode; mask?: Blob; expectedCreditCost: number; requestId: string },
  fetcher: Fetcher = fetch,
): Promise<{ taskToken: string; status: WatermarkTaskState }> => {
  throw new Error('AI 点数仅在 Studio 使用；此工具已停止新的 AI 处理。')
}

export const getWatermarkRemovalTask = async (
  token: string,
  fetcher: Fetcher = fetch,
): Promise<WatermarkTaskStatus> => {
  const status = await readJson<WatermarkTaskStatus>(await fetcher(taskUrl(token), { headers: authHeaders(), cache: 'no-store' }))
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
  const maxAttempts = options.maxAttempts ?? 400
  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const status = await getWatermarkRemovalTask(token, fetcher)
    if (status.status === 'succeeded') return status
    if (status.status === 'expired') throw new Error('AI 结果已过期，无法继续下载')
    if (status.status === 'failed') throw new Error(status.message || 'AI 去水印处理失败')
    await delay(options.intervalMs ?? 1500)
  }
  throw new Error('任务仍在处理中，请点击继续查询')
}
