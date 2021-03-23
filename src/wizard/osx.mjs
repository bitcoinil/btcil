import { cleanupTempDir, getTempDir } from '../utils.mjs'

export async function installWallet () {
  console.log('going to install osx wallet')
  const tempDir = getTempDir()

  console.log('tempDir:', tempDir)

  setTimeout(() => { cleanupTempDir() }, 20000)
}