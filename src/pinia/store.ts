import { setActivePinia } from 'pinia'
import { computed, effectScope, getCurrentInstance, inject, isReactive, isRef, reactive } from 'vue'
import { activePinia, piniaSymbol } from './rootStore'
import { isString, isFunction } from './utils'
function isComputed(v) {
  return !!(isRef(v) && (v as any).effect)
}
export function defineStore(idOrOptions, setup) {
  const isSetupStore = typeof setup === 'function'
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
      // 第一次使用该store,则创建映射关系
      if (isSetupStore) {
        createSetupStore(id, options, pinia)
      } else {
        // Options Store
        createOptionsStore(id, options, pinia)
      }
    }
    const store = pinia?._s.get(id)
    return store
  }

  return useStore
}
function createSetupStore($id, setup, pinia, isOptions = false) {
  // store自己的scope,pinia._e是全局的scope
  let scope
  // 每个store都是一个响应式对象
  const store = reactive<any>({})

  // 对于setup api 没有初始化状态
  const initalState = pinia.state.value[$id]
  if (!initalState && !isOptions) {
    pinia.state.value[$id] = {}
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
    // 处理setup store,把ref、reactive放入到state中
    if ((isRef(prop) && !isComputed(prop)) || isReactive(prop)) {
      // 是ref或reactive,并且setup store
      if (!isOptions) {
        pinia.state.value[$id][key] = prop
      }
    }
  }
  store.$id = $id

  pinia._s.set($id, store)
  Object.assign(store, setupStore)
  return store
}
function createOptionsStore($id, options, pinia) {
  const { state, getters, actions } = options

  // 对用户传入的state,getters,actions进行处理
  function setup() {
    // pinia.state是一个ref,给当前store的state赋值
    pinia.state.value[$id] = state ? state() : {}
    const localState = pinia.state.value[$id]
    // getters
    const gettersArgs = Object.keys(getters || {}).reduce((computedGetters, name) => {
      computedGetters[name] = computed(() => {
        let store = pinia._s.get($id)
        return getters[name].call(store, store)
      })
      return computedGetters
    }, {})
    return Object.assign(localState, actions, gettersArgs)
  }

  return createSetupStore($id, setup, pinia, true)
}
