import os from 'os'
import path from 'path'
import { LocalStorage } from 'node-localstorage'


const homepath = os.homedir()
const storagePath = '.btcil/.storage'
const localStorage = new LocalStorage(path.resolve(homepath, storagePath))

console.log('what is home path?', homepath)


export function setItem(key, value) {
  return localStorage.setItem(key, value)
}
export function getItem(key) {
  return localStorage.getItem(key)
}
export function removeItem(key) {
  return localStorage.removeItem(key)
}
