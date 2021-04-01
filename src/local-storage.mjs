import os from 'os'
import path from 'path'
import { LocalStorage } from 'node-localstorage'
import lodash from 'lodash'

const homepath = os.homedir()
const storagePath = '.btcil/.storage'
const localStorage = new LocalStorage(path.resolve(homepath, storagePath))

export function setItem(key, value) {
  return localStorage.setItem(key, value)
}
export function getItem(key) {
  return localStorage.getItem(key)
}
export function removeItem(key) {
  return localStorage.removeItem(key)
}

const JSON_STORAGE_KEY = 'json-storage'

export const get = (key) => {
  try {
    const raw = getItem(JSON_STORAGE_KEY)
    const current = JSON.parse(raw) || {}
    return Object.keys(current).length && key ? current?.[key] : current
  } catch (err) {
    // noop
  }
}

export const set = (key, value) => {
  if (!key) throw new Error('Cannot set without a key')
  const current = get()
  const nextValue = typeof value === 'function'
    ? value(current?.[key])
    : value

  const nextStorage = lodash.merge({}, current, {
    [key]: nextValue
  })

  return setItem(JSON_STORAGE_KEY, JSON.stringify(nextStorage))
}