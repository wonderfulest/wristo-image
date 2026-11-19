import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createWatermarkRemovalTask, getWatermarkRemovalTask, waitForWatermarkRemoval } from './watermarkRemovalApi'

describe('watermark removal API', () => {
  beforeEach(() => sessionStorage.setItem('wristo-image-token', 'test-token'))
  it.each(['automatic', 'mask'] as const)('rejects new %s requests without uploading or charging', async (mode) => {
    const fetcher = vi.fn()
    await expect(createWatermarkRemovalTask({ image: new Blob(['image']), mode, expectedCreditCost: 3, requestId: 'new-task' }, fetcher)).rejects.toThrow('此工具已停止新的 AI 处理')
    expect(fetcher).not.toHaveBeenCalled()
  })

  it('polls until the task succeeds and returns the proxied result URL', async () => {
    const fetcher = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ status: 'running', resultAvailable: false })))
      .mockResolvedValueOnce(new Response(JSON.stringify({ status: 'succeeded', resultAvailable: true })))

    const status = await waitForWatermarkRemoval('token-1', {
      fetcher,
      delay: async () => undefined,
      maxAttempts: 3,
    })

    expect(status.status).toBe('succeeded')
    expect(status.resultUrl).toBe('/api/image-tools/watermark-removal/tasks/token-1/result')
    expect(fetcher).toHaveBeenCalledTimes(2)
  })

  it('maps API errors to a readable message', async () => {
    const fetcher = vi.fn().mockResolvedValue(new Response(JSON.stringify({ code: 'INVALID_IMAGE', msg: '图片太小' }), {
      status: 400,
      headers: { 'content-type': 'application/json' },
    }))

    await expect(getWatermarkRemovalTask('token-1', fetcher)).rejects.toThrow('图片太小')
  })
})
