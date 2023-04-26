export function isObject(val: unknown): val is Record<string, any> {
  return typeof val === 'object' && val !== null
}
export function isFunction(val: unknown) {
  return typeof val === 'function'
}
export function isString(val: unknown): val is string {
  return typeof val === 'string'
}
