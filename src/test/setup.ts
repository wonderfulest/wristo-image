import { afterEach } from 'vitest'
import { config } from '@vue/test-utils'

config.global.stubs = {
  RouterLink: true,
  RouterView: true,
}

afterEach(() => {
  document.body.innerHTML = ''
})
