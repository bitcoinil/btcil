import fs from 'fs'
import os from 'os'
import ini from 'ini'
import osName from 'os-name'
import { getSystemModule } from './platforms/index.mjs'
import { getProperties } from './utils.mjs'
const { readFile, writeFile } = fs.promises

const cacheConf = {
  data: {},
  loaded: false
}

export const get = async (key) => {
  if (!cacheConf.loaded) await loadConfData()
  return cacheConf.data[key]
}

export const set = async (key, value) => {
  if (!cacheConf.loaded) await loadConfData()
  if (typeof key === 'function')
    Object.assign(cacheConf.data, key(cacheConf.data))
  if (typeof key !== 'string' && Object.keys(key).length)
    Object.assign(cacheConf.data, key)
  
  await saveConfData(cacheConf.data)
}

export const loadConfData = async () => {
  const properties = await getProperties()
  const platform = await getSystemModule(osName())

  const homedir = os.homedir()
  const replacers = {
    '{homedir}': homedir
  }
  const filePath = properties.confpath[platform.platform].replace(Object.keys(replacers), Object.values(replacers))

  const fileData = await readFile(filePath, { encoding: 'utf8' })
  const parsed = ini.parse(fileData)
  Object.assign(cacheConf, { data: parsed, loaded: true })
  return parsed
}

export const saveConfData = async (data) => {
  const properties = await getProperties()
  const platform = await getSystemModule(osName())

  const homedir = os.homedir()
  const replacers = {
    '{homedir}': homedir
  }
  const filePath = properties.confpath[platform.platform].replace(Object.keys(replacers), Object.values(replacers))

  await writeFile(filePath, ini.stringify(data))
}