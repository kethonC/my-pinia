import { setActivePinia } from 'pinia'
import { computed, effectScope, getCurrentInstance, inject, reactive } from 'vue'
import { activePinia, piniaSymbol } from './rootStore'
import { isString, isFunction } from './utils'

export function defineStore(idOrOptions, setup) {
  let id
  let options
  if (isString(idOrOptions)) {
    id = idOrOptions
    options = setup
  } else {
    id = idOrOptions.id
    options = idOrOptions
  }
  function useStore() {
    const instance = getCurrentInstance()
    let pinia: any = instance && inject(piniaSymbol)
    if (pinia) {
      setActivePinia(pinia)
    }
    // 这里activePinia肯定不为空，因为至少在安装pinia插件时已经设置过值了
    pinia = activePinia!

    if (!pinia._s.has(id)) {
      // 第一次使用该store,则创建映射关系, Options Store
      createOptionsStore(id, options, pinia)
    }
    const store = pinia?._s.get(id)
    return store
  }

  return useStore
}

function createOptionsStore($id, options, pinia) {
  const { state, getters, actions } = options
  // store自己的scope,pinia._e是全局的scope
  let scope
  // 每个store都是一个响应式对象
  const store = reactive<any>({})

  // 对用户传入的state,getters,actions进行处理
  function setup() {
    // pinia.state是一个ref,给当前store的state赋值
    pinia.state.value[$id] = state ? state() : {}
    const localState = pinia.state.value[$id]
    // getters
    const gettersArgs = Object.keys(getters || {}).reduce((computedGetters, name) => {
      computedGetters[name] = computed(() => {
        return getters[name].call(store, store)
      })
      return computedGetters
    }, {})
    return Object.assign(localState, actions, gettersArgs)
  }

  const setupStore = pinia._e.run(() => {
    scope = effectScope()
    return scope.run(() => setup())
  })

  function wrapAction(name, action) {
    return function () {
      const args = Array.from(arguments)

      // 确保this指向store
      return action.apply(store, arguments)
    }
  }

  for (let key in setupStore) {
    const prop = setupStore[key]
    if (isFunction(prop)) {
      setupStore[key] = wrapAction(key, prop)
    }
  }
  store.$id = $id

  pinia._s.set($id, store)
  Object.assign(store, setupStore)
  return store
}
