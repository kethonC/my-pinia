import { defineStore } from '@/pinia'
export const useCounterStore = defineStore('counter', {
  state: () => ({
    count: 1
  })
})
// 或者如下
// export const useCounterStore = defineStore({
//   id: 'counter',
//   state: () => ({
//     count: 1
//   })
// })
