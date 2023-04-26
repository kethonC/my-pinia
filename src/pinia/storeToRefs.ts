import { isReactive, isRef, toRaw, toRef } from 'vue'

export function storeToRefs(store) {
  store = toRaw(store)
  const refs = {}
  for (let key in store) {
    let value = store[key]
    if (isRef(value) || isReactive(value)) {
      refs[key] = toRef(store, key)
    }
  }
  return refs
}
