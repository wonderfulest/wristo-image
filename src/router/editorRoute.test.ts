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

  it('redirects the former standalone compressor route into the editor tool', () => {
    const route = router.getRoutes().find(candidate => candidate.path === '/tools/image-compressor')

    expect(route?.redirect).toEqual({ path: '/editor', query: { tool: 'image-compressor' } })
  })

  it('registers the time number editor as a full-screen workbench', () => {
    const route = router.getRoutes().find(candidate => candidate.path === '/font-editor')

    expect(route?.name).toBe('font-editor')
    expect(route?.meta).toMatchObject({ editor: true })
  })

  it('registers transparent text assets as their own full-screen tool', () => {
    const route = router.getRoutes().find(candidate => candidate.path === '/text-assets')

    expect(route?.name).toBe('text-assets')
    expect(route?.meta).toMatchObject({ editor: true })
  })
})
