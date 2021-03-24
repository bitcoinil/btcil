import { sleep } from '../utils.mjs'

export const getSystemModule = async os =>
  os.match(/^Windows 10/)
    ? import('./windows.mjs')
  : os.match(/^macOS/)
    ? import('./osx.mjs')
  : false