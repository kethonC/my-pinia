import { setActivePinia } from 'pinia'
import {
  computed,
  effectScope,
  getCurrentInstance,
  inject,
  isReactive,
  isRef,
  reactive,
  ref,
  toRefs,
  watch
} from 'vue'
import { activePinia, piniaSymbol } from './rootStore'
import { addSubscription, triggerSubscriptions } from './subscribe'
import { isString, isFunction, isObject } from './utils'
function isComputed(v) {
  return !!(isRef(v) && (v as any).effect)
}
// 合并两个对象
function mergeReactiveObject(target, state) {
  for (let key in state) {
    let oldValue = target[key]
    let newValue = state[key]
    // 都是对象，需要递归合并
    if (isObject(oldValue) && isObject(newValue)) {
      target[key] = mergeReactiveObject(oldValue, newValue)
    } else {
      target[key] = newValue
    }
  }
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
  // $patch，可能传入一个对象或函数
  function $patch(partialStateOrMutation) {
    // 函数
    if (isFunction(partialStateOrMutation)) {
      partialStateOrMutation(pinia.state.value[$id])
    } else {
      // 用新的对象合并原来的状态
      mergeReactiveObject(pinia.state.value[$id], partialStateOrMutation)
    }
  }
  let actionSubscriptions = []
  const partialStore = {
    $patch,
    $subscribe(callback, options = {}) {
      scope.run(() => {
        watch(
          pinia.state.value[$id],
          state => {
            callback({ storeId: $id }, state)
          },
          options
        )
      })
    },
    $onAction: addSubscription.bind(null, actionSubscriptions),
    $dispose() {
      // 清除响应式
      scope.stop()
      // 清除订阅
      actionSubscriptions = []
      // 删除store
      pinia._s.delete($id)
    }
  }

  // 每个store都是一个响应式对象
  const store = reactive<any>(partialStore)

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
      const afterCallbackList: any[] = []
      const onErrorCallckList: any[] = []
      function after(callbck) {
        afterCallbackList.push(callbck)
      }
      function onError(callbck) {
        onErrorCallckList.push(callbck)
      }
      triggerSubscriptions(actionSubscriptions, { after, onError })
      const args = Array.from(arguments)
      let ret
      try {
        // 确保this指向store
        ret = action.apply(store, args)
      } catch (e) {
        triggerSubscriptions(onErrorCallckList, e)
      }
      if (ret instanceof Promise) {
        return ret
          .then(value => {
            triggerSubscriptions(afterCallbackList, value)
            return value
          })
          .catch(e => {
            triggerSubscriptions(onErrorCallckList, e)
          })
      }
      triggerSubscriptions(afterCallbackList, ret)
      return ret
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
    const localState = toRefs(pinia.state.value[$id])
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
  const store = createSetupStore($id, setup, pinia, true)
  store.$reset = function () {
    const newState = state ? state() : {}
    store.$patch(state => {
      Object.assign(state, newState)
    })
  }
  return store
}
