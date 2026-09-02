import { describe, expect, it, vi } from 'vitest'
import { createWatermarkRemovalTask, getWatermarkRemovalTask, waitForWatermarkRemoval } from './watermarkRemovalApi'

describe('watermark removal API', () => {
  it('submits automatic and mask tasks as multipart requests', async () => {
    const fetcher = vi.fn().mockResolvedValue(new Response(JSON.stringify({ taskToken: 'token-1', status: 'pending' }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    }))
    const image = new File(['image'], 'image.png', { type: 'image/png' })
    const mask = new Blob(['mask'], { type: 'image/png' })

    await createWatermarkRemovalTask({ image, mode: 'mask', mask }, fetcher)

    const [url, request] = fetcher.mock.calls[0] as [string, RequestInit]
    expect(url).toBe('/api/image-tools/watermark-removal/tasks')
    expect(request.method).toBe('POST')
    expect(request.body).toBeInstanceOf(FormData)
    expect((request.body as FormData).get('mode')).toBe('mask')
    expect((request.body as FormData).get('mask')).toBeInstanceOf(Blob)
    expect(((request.body as FormData).get('mask') as Blob).size).toBe(4)
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
