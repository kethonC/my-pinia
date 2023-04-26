import { createApp } from 'vue'
import { createPinia } from '@/pinia'
import App from './App.vue'

const app = createApp(App)
const pinia = createPinia()
// pinia 持久化插件
pinia.use(({ store }) => {
  let local = localStorage.getItem(store.$id + 'PINIA_STATE')
  if (local) {
    store.$state = JSON.parse(local)
  }

  store.$subscribe(({ storeId: id }, state) => {
    localStorage.setItem(id + 'PINIA_STATE', JSON.stringify(state))
  })
})
app.use(pinia)
app.mount('#app')

// 组件外使用store
import { useCounterStore } from '@/store/counter'

const countStore = useCounterStore()
console.log('main.ts', countStore)
