import type { IncomingMessage, ServerResponse } from 'node:http'

export const config = { api: { bodyParser: false }, maxDuration: 60 }

// Buffer the multipart body instead of streaming it through an external rewrite.
export default async function handler(
  request: IncomingMessage,
  response: ServerResponse,
  fetcher: typeof fetch = fetch,
): Promise<void> {
  response.setHeader('Cache-Control', 'no-store')
  response.setHeader('Content-Type', 'application/json; charset=utf-8')
  const fail = (status: number, msg: string) => {
    response.statusCode = status
    response.end(JSON.stringify({ msg }))
  }
  if (request.method !== 'POST') {
    response.setHeader('Allow', 'POST')
    fail(405, '仅支持上传图片')
    return
  }
  const contentType = request.headers['content-type'] ?? ''
  if (!contentType.startsWith('multipart/form-data;')) {
    fail(400, '请使用图片表单上传')
    return
  }
  try {
    const chunks: Buffer[] = []
    let size = 0
    for await (const chunk of request) {
      const bytes = Buffer.from(chunk)
      size += bytes.length
      if (size > 4 * 1024 * 1024) {
        fail(413, '图片与蒙版合计不能超过 4MB，请缩小图片后重试')
        return
      }
      chunks.push(bytes)
    }
    const upstream = await fetcher('https://api.wristo.cn/api/public/image-tools/watermark-removal/tasks', {
      method: 'POST',
      headers: { 'Content-Type': contentType },
      body: Buffer.concat(chunks),
      signal: AbortSignal.timeout(45_000),
    })
    const body = await upstream.text()
    try { JSON.parse(body) } catch {
      fail(502, '图片上传转发失败，请稍后重试')
      return
    }
    response.statusCode = upstream.status
    response.end(body)
  } catch {
    fail(502, '图片上传转发失败，请稍后重试')
  }
}
