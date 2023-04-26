import { createApp } from 'vue'
import { createPinia } from '@/pinia'
import App from './App.vue'
import { useCounterStore } from './store/counter'

const app = createApp(App)
app.use(createPinia())
app.mount('#app')
