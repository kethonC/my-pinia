import { effectScope, ref } from 'vue'
import { piniaSymbol, setActivePinia } from './rootStore'

export function createPinia() {
  const scope = effectScope()
  // 存放每个store的state
  const state = scope.run(() => ref({}))
  const pinia = {
    // 存放所有的store, 以store的id作为键值
    _s: new Map(),
    install(app) {
      // 这里允许在组件外调用useStore
      setActivePinia(pinia)
      // 注入pinia实例，让所有store都可以访问到pinia
      app.provide(piniaSymbol, pinia)
    },
    state,
    _e: scope
  }
  return pinia
}
