import tmp from 'tmp'
import { readFile, unlink } from 'fs/promises'
import fs from 'fs'
import { parse } from 'yaml'
import path from 'path'
import { setItem, getItem, removeItem } from './local-storage.mjs'
import Downloader from 'nodejs-file-downloader'
import boxen from 'boxen'
import chalk from 'chalk'

const tempCache = {}

export async function cleanupTempDir() {
  await removeItem('temp-dir')
  if (tempCache.cleanupCallback) {
    tempCache.cleanupCallback()
    tempCache.cleanupCallback = null
  }
  else if (tempCache.dir && tempCache.dir.match(/tmp/i)) await unlink(tempCache.dir)

  tempCache.dir = null
}
export async function getTempDir () {
  const existingTempDir = await getItem('temp-dir')
  if (existingTempDir) tempCache.dir = existingTempDir
  const promise = new Promise((resolve) => {
    if (tempCache.dir) return resolve(tempCache.dir)
    tmp.dir(async function _tempDirCreated(err, path, cleanupCallback) {
      if (err) throw err;
    
      tempCache.dir = path
      tempCache.cleanupCallback = cleanupCallback
      await setItem('temp-dir', path)
      resolve(path)
    });
  })
  return promise
}

const propsCache = {}

export async function getProperties () {
  if (propsCache.value) return propsCache.value
  const dirname = getDirName()
  const filepath = path.normalize(dirname + '/../').replace(/^\\/g, '') + 'properties.yaml'
  const data = await readFile(filepath, { encoding: 'utf8' })
  if (data && data.length) {
    const parsed = parse(data)
    propsCache.value = parsed
    return parsed
  }
  return {}
}

export function getDirName () {
  const moduleURL = new URL(import.meta.url);
  const __dirname = path.dirname(moduleURL.pathname);
  return __dirname
}

export async function countRuns () {
  const runs = +(await getItem('runs')) || 0
  await setItem('runs', runs + 1)
  return runs + 1
}

export async function downloadFile (url, directory, fileName, options = {}) {
  const downloader = new Downloader({
    ...fileName ? { fileName } : {},
    url,
    directory, //Sub directories will also be automatically created if they do not exist.  
    ...options
  })    
  
  try {
    await downloader.download();
    return true
  } catch (error) {
    console.log(error)
    throw error
  }
}

export async function downloadCertificate () {
  const tempPath = (await getTempDir()) + '/.certificates'
  const { signatures } = await getProperties()
  const certUrl = `${signatures}/certificate.pem`

  const saveFile = 'certificate.pem'
  const filepath = path.resolve(tempPath, saveFile)
  
  await downloadFile(certUrl, tempPath, saveFile)

  const certificate = await readFile(filepath, { encoding: 'utf8' })
  return {
    certificate,
    filepath
  }
}

export async function downloadSignature (sigPath) {
  const tempPath = (await getTempDir()) + '/.signatures'
  const { signatures } = await getProperties()
  const sigUrl = `${signatures}/${sigPath}.sig`

  const savePath = path.resolve(tempPath, sigPath, '../')
  const saveFile = sigPath.split('/').pop() + '.sig'
  const filepath = path.resolve(savePath, saveFile)

  await downloadFile(sigUrl, savePath, saveFile)

  const signature = await readFile(path.resolve(savePath, saveFile), { encoding: 'utf8' })
  return {
    signature,
    filepath
  }
}

export async function compareCertificates (certificate) {
  const dirname = getDirName()
  const local = await readFile(path.resolve(dirname, '../', 'certificate.pem'), { encoding: 'utf8' })

  return local.trim() === certificate.trim()
}

export function getPackageJson () {
  const pathname = path.normalize(getDirName() + '/../').replace(/^\\/g, '')
  const data = fs.readFileSync(pathname + 'package.json')
  const parsed = JSON.parse(data)
  return parsed
}

export const sleep = (time = 1000) =>
  new Promise(r => setTimeout(r, time))

export const errorBox = (code = 1001, message = 'Fatal Error') =>
  console.log(boxen(chalk`{red Error}\n{dim Code: ${code}}\n\n${message}\n\n{dim https://guides.bitcoinil.org/errors/error-${code}}`, { padding: 1, dimBorder: true }))

  /**
 * Converts a long string of bytes into a readable format e.g KB, MB, GB, TB, YB
 * 
 * @param {Int} num The number of bytes.
 */
export function readableBytes(bytes) {
  var i = Math.floor(Math.log(bytes) / Math.log(1024)),
  sizes = ['B', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];

  return (bytes / Math.pow(1024, i)).toFixed(2) * 1 + ' ' + sizes[i];
}