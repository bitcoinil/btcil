import osName from 'os-name'
import { sleep } from '../utils.mjs'

const OS_NAME = osName()

export const getSystemModule = async (os = OS_NAME) =>
  os.match(/^Windows 10/)
    ? import('./windows.mjs')
  : os.match(/^macOS/)
    ? import('./osx.mjs')
  : false

export default getSystemModule
