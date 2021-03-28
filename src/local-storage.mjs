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

export const get = async (key) => {
  const current = getItem(JSON_STORAGE_KEY)
  return key ? current[key] : current
}

export const set = (key, value) => {
  const current = getItem(JSON_STORAGE_KEY)
  const nextValue = typeof value === 'function'
    ? value(current[key])
    : value

  const nextStorage = lodash.merge({}, current, {
    [key]: nextValue
  })

  return setItem(JSON_STORAGE_KEY, nextStorage)
}