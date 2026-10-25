import { ref } from 'vue'

const TOKEN_KEY = 'wristo-image-token'
const TRANSACTION_KEY = 'wristo-image-sso-transaction'
export const signedIn = ref(Boolean(sessionStorage.getItem(TOKEN_KEY)))
export function signOut() { sessionStorage.removeItem(TOKEN_KEY); signedIn.value = false }
export function authHeaders(extra: HeadersInit = {}): Headers {
  const headers = new Headers(extra)
  const token = sessionStorage.getItem(TOKEN_KEY)
  if (token) headers.set('Authorization', `Bearer ${token}`)
  return headers
}
export class ApiError extends Error { constructor(message: string, public code: number) { super(message) } }
export async function readApi<T>(response: Response): Promise<T> {
  const body = await response.json().catch(() => ({}))
  if (response.status === 401 || body.code === 401) {
    signOut()
    throw new Error('请先登录 Wristo，再使用 AI 功能')
  }
  if (!response.ok || (typeof body.code === 'number' && body.code !== 0)) throw new ApiError(body.msg || '请求失败，请稍后重试', body.code ?? response.status)
  return (body.data ?? body) as T
}
const base64 = (bytes: Uint8Array) => btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
export function consumeTransaction(storage: Storage, state: string | null) {
  const raw = storage.getItem(TRANSACTION_KEY)
  storage.removeItem(TRANSACTION_KEY)
  const transaction = JSON.parse(raw || '{}')
  if (!state || transaction.state !== state || typeof transaction.verifier !== 'string'
    || !Number.isFinite(transaction.createdAt) || Date.now() - transaction.createdAt > 900000 || transaction.createdAt > Date.now())
    throw new Error('登录已过期，请关闭窗口后重新登录')
  return transaction.verifier as string
}
export async function signIn(): Promise<void> {
  // Open synchronously inside the click handler; keep the editor and its undo history in memory.
  const popup = window.open('about:blank', 'wristo-image-login', 'width=520,height=760')
  if (!popup) throw new Error('请允许登录弹窗，当前图片和编辑进度会保留')
  try {
    const verifier = base64(crypto.getRandomValues(new Uint8Array(32)))
    const state = base64(crypto.getRandomValues(new Uint8Array(32)))
    const challenge = base64(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier))))
    popup.sessionStorage.setItem(TRANSACTION_KEY, JSON.stringify({ state, verifier, createdAt: Date.now() }))
    const url = new URL('/auth', import.meta.env.VITE_WRISTO_SSO_URL || 'https://sso.wristo.io')
    url.search = new URLSearchParams({ client: 'image', redirect_uri: `${location.origin}/auth/callback`,
      state, code_challenge: challenge, code_challenge_method: 'S256', locale: 'zh-CN' }).toString()
    await new Promise<void>((resolve, reject) => {
      const started = Date.now()
      const cleanup = () => { clearInterval(timer); window.removeEventListener('message', receive) }
      const receive = (event: MessageEvent) => {
        if (event.origin !== location.origin || event.source !== popup || event.data?.type !== 'wristo-image-auth' || event.data?.state !== state) return
        cleanup()
        if (typeof event.data.token !== 'string' || !event.data.token) { reject(new Error('登录失败，请重试')); return }
        sessionStorage.setItem(TOKEN_KEY, event.data.token)
        signedIn.value = true
        popup.close()
        resolve()
      }
      const timer = window.setInterval(() => {
        if (popup.closed || Date.now() - started > 900000) { cleanup(); reject(new Error('登录已取消或超时，编辑进度已保留')) }
      }, 500)
      window.addEventListener('message', receive)
      popup.location.href = url.toString()
    })
  } catch (error) { popup.close(); throw error }
}
export async function completeSignIn() {
  const query = new URLSearchParams(location.search)
  const state = query.get('state')
  const code = query.get('code')
  const codeVerifier = consumeTransaction(sessionStorage, state)
  history.replaceState(null, '', '/auth/callback')
  if (!code || !window.opener) throw new Error('请从图片编辑器重新打开登录窗口')
  const data = await readApi<{ accessToken: string }>(await fetch('/wristo-api/public/sso/token', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code, codeVerifier, clientId: 'image', redirectUri: `${location.origin}/auth/callback` }),
  }))
  window.opener.postMessage({ type: 'wristo-image-auth', state, token: data.accessToken }, location.origin)
}
