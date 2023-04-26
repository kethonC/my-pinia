export const piniaSymbol = Symbol()
// 全局的pinia实例
export let activePinia
// 设置全局的pinia实例
export const setActivePinia = pinia => (activePinia = pinia)
