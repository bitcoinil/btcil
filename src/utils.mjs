import tmp from 'tmp'
import { readFile, unlink } from 'fs/promises'
import fs from 'fs'
import { parse } from 'yaml'
import path, { dirname } from 'path'
import { setItem, getItem, removeItem } from './local-storage.mjs'
import Downloader from 'nodejs-file-downloader'

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
  const filepath = path.resolve(dirname, '../', 'properties.yaml')
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
}

export async function downloadFile (url, directory, fileName, options = {}) {

  const downloader = new Downloader({
    ...fileName ? { fileName } : {},
    url,
    directory,//Sub directories will also be automatically created if they do not exist.  
    // onProgress:function(percentage,chunk,remainingSize){//Gets called with each chunk.
    //      console.log('% ',percentage)   
    //      console.log('Current chunk of data: ',chunk)   
    //      console.log('Remaining bytes: ',remainingSize)   
    // },
    ...options
  })    
  
  try {
    await downloader.download();
    return true
  } catch (error) {
    console.log(error)
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
  console.log('SAVE PATH:', savePath)
  console.log('SAVE FILE:', saveFile)
  
  const file = await downloadFile(sigUrl, savePath, saveFile)

  const data = readFile(path.resolve(savePath, saveFile), { encoding: 'utf8' })
  return data
}

export async function compareCertificates (certificate) {
  const dirname = getDirName()
  const local = await readFile(path.resolve(dirname, '../', 'certificate.pem'), { encoding: 'utf8' })
  console.log('local file', local)

  return local.trim() === certificate.trim()
}

export function getPackageJson () {
  const data = fs.readFileSync(path.resolve(getDirName(), '../package.json'))
  const parsed = JSON.parse(data)
  return parsed
}

export const sleep = (time = 1000) =>
  new Promise(r => setTimeout(r, time))