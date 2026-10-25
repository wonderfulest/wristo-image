import { beforeEach, expect, it } from 'vitest'
import { consumeTransaction, readApi, signedIn } from './imageAuth'
beforeEach(() => sessionStorage.clear())
it('accepts a matching unexpired state only once', () => {
  sessionStorage.setItem('wristo-image-sso-transaction', JSON.stringify({ state: 'state', verifier: 'verifier', createdAt: Date.now() }))
  expect(consumeTransaction(sessionStorage, 'state')).toBe('verifier')
  expect(() => consumeTransaction(sessionStorage, 'state')).toThrow()
})
it('rejects forged and expired states', () => {
  for (const [state, createdAt] of [['forged', Date.now()], ['state', Date.now() - 900001]]) {
    sessionStorage.setItem('wristo-image-sso-transaction', JSON.stringify({ state: 'state', verifier: 'verifier', createdAt }))
    expect(() => consumeTransaction(sessionStorage, String(state))).toThrow()
  }
})
it('handles business authentication failures even when HTTP is 200', async () => {
  signedIn.value = true
  sessionStorage.setItem('wristo-image-token', 'expired')
  await expect(readApi(new Response(JSON.stringify({ code: 401, msg: 'expired' })))).rejects.toThrow('请先登录')
  expect(signedIn.value).toBe(false)
  expect(sessionStorage.getItem('wristo-image-token')).toBeNull()
})
it('does not treat business failures as successful tasks', async () => {
  await expect(readApi(new Response(JSON.stringify({ code: 409, msg: '积分不足' })))).rejects.toThrow('积分不足')
})
