import '@fontsource-variable/bricolage-grotesque'
import '@fontsource-variable/instrument-sans'
import { createApp } from 'vue'
import App from './App.vue'
import router from './router'
import './styles/global.css'

createApp(App).use(router).mount('#app')
