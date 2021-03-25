
import chalk from 'chalk'
import path from 'path'
import fs, { constants } from 'fs'
import { prepareTempDir } from '../tasks/system-tasks.mjs'
import { sleep } from '../utils.mjs'
import { downloadFileTask } from '../tasks.mjs'
import { makeFileIntegrityCheck } from '../tasks.mjs'

const { access, unlink } = fs.promises

export const getWallet = () => {

}
export const wallets = [
  {
    name: 'core',
    title: 'BitcoinIL Core',
      download: (ctx, task) => 
        task.newListr(parent => [
          {
            title: 'Prepare temporary directory',
            enabled: ctx => !ctx.tempDir,
            task: prepareTempDir
          },
          { task: () => ctx._walletTempDir = ctx.tempDir + '/wallet-install' },
          {
            title: 'Configure download file',
            task: async (_, subTask) => {
              const downloadUrl = ctx.properties.binaries.windows
              ctx._downloadUrl = downloadUrl
              subTask.output = chalk`File URL: {dim {cyan ${downloadUrl}}}`
            },
            options: {
              persistentOutput: true
            }
          },
          { 
            // title: 'Define wallet files in context',
            task: async () => Object.assign(ctx, {
              _walletBasename: path.basename(ctx._downloadUrl),
            })
            && Object.assign(ctx, {
              _downloadFullpath: ctx._walletTempDir + '/' + ctx._walletBasename,
            })
            && Object.assign(ctx, {
              _destinationExists: await (access(ctx._downloadFullpath, constants.F_OK).then(() => true).catch(() => false))
            })
          },
          {
            // title: 'Check existing temp file',
            skip: () => !ctx._destinationExists,
            enabled: () => !ctx.options.skipDownloads, // DEBUG ONLY
            task: async (_, subTask) => {
              await unlink(ctx._downloadFullpath)
              ctx._destinationExists = false
            }
          },
          {
            title: 'Download file',
            skip: () => ctx._destinationExists ? 'File exists - download skipped' : false,
            task: downloadFileTask
          },
          {
            title: 'Verify file integrity',
            task: (_, subTask) => makeFileIntegrityCheck(ctx._downloadFullpath, `binaries/windows/${ctx._walletBasename}`)(_, subTask),
          },
          {
            title: 'Run installer',
            // skip: () => true,
            task: async (_, subTask) => {
              subTask.output = 'running installer...'
  
              const { exec } = await import('child_process')
              const cmd = `${ctx._downloadFullpath}`
              await new Promise(r => exec(cmd, (err, stdout, stderr) => {
                r()
              }))
              await subTask.prompt({
                type: 'confirm',
                initial: true,
                message: 'Follow the setup instructions and click [Enter] to continue...'
              })
            },
            options: {
              // bottomBar: Infinity
            }
          },
          {
            title: 'working',
            task: async (_, subTask) => {
              subTask.output = 'Fullpath: ' + ctx._downloadFullpath
              await subTask.prompt({ type: 'confirm', message: 'proceed' })
            }
          }
        ]),
    // build: () => new Observable(async observer => {
    //   observer.next('Building BitcoinIL Core!!!')
    //   await sleep(4000)
    //   observer.complete()
    // })
  },
]