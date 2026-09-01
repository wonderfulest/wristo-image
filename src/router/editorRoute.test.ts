import { describe, expect, it } from 'vitest'
import router from './index'

describe('image editor routes', () => {
  it('registers the unified editor as the image editing destination', () => {
    const route = router.getRoutes().find(candidate => candidate.path === '/editor')

    expect(route?.name).toBe('editor')
    expect(route?.meta).toMatchObject({ editor: true })
  })

  it('redirects the former standalone remover route into the editor tool', () => {
    const route = router.getRoutes().find(candidate => candidate.path === '/tools/background-remover')

    expect(route?.redirect).toEqual({ path: '/editor', query: { tool: 'background-remover' } })
  })

  it('registers a standalone image compressor route', () => {
    const route = router.getRoutes().find(candidate => candidate.path === '/tools/image-compressor')

    expect(route?.name).toBe('image-compressor')
  })
})
