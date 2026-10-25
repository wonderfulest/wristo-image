import { Readable } from 'node:stream'
import { expect, it, vi } from 'vitest'
import handler from '../api/watermark-removal'

it('buffers multipart uploads and forwards only their content type', async () => {
  const request = Object.assign(Readable.from([Buffer.from('image'), Buffer.from('mask')]), {
    method: 'POST', headers: { 'content-type': 'multipart/form-data; boundary=test', 'transfer-encoding': 'chunked' },
  })
  const response = { setHeader: vi.fn(), end: vi.fn(), statusCode: 0 }
  const fetcher = vi.fn().mockResolvedValue(new Response('{"status":"pending","taskToken":"test"}', { status: 200 }))
  await handler(request as never, response as never, fetcher)
  expect(fetcher).toHaveBeenCalledWith('https://api.wristo.cn/api/public/image-tools/watermark-removal/tasks', expect.objectContaining({
    method: 'POST', body: Buffer.from('imagemask'), headers: { 'Content-Type': 'multipart/form-data; boundary=test' },
  }))
  expect(response.statusCode).toBe(200)
  expect(response.end).toHaveBeenCalledWith('{"status":"pending","taskToken":"test"}')
})

it('returns a readable gateway failure without leaking upstream details', async () => {
  const request = Object.assign(Readable.from([Buffer.from('image')]), { method: 'POST', headers: { 'content-type': 'multipart/form-data; boundary=test' } })
  const response = { setHeader: vi.fn(), end: vi.fn(), statusCode: 0 }
  await handler(request as never, response as never, vi.fn().mockRejectedValue(new Error('private details')))
  expect(response.statusCode).toBe(502)
  expect(response.end).toHaveBeenCalledWith(expect.stringContaining('图片上传转发失败'))
  expect(response.end).not.toHaveBeenCalledWith(expect.stringContaining('private details'))
})
