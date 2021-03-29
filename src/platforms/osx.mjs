import chalk from 'chalk'
import path from 'path'
import fs, { constants } from 'fs'
import { makeFileIntegrityCheck } from '../tasks.mjs'
import { configureJSONRPC } from '../tasks.mjs'
import { prepareTempDir } from '../tasks/system-tasks.mjs'
import { downloadFileTask } from '../tasks.mjs'

const { access, unlink } = fs.promises

export const platform = 'osx'

export const walletName = 'BitcoinIL Core - OSX v0.21.0'
export const wallets = [
  {
    name: 'core',
    title: 'BitcoinIL Core',
    run: async () => {
      const { exec } = await import('child_process')
      const cmd = `open /Applications/BitcoinIL-Qt.app`
      return new Promise(r => exec(cmd, (err, stdout, stderr) => {
        r([err, stdout, stderr])
      }))
    },
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
            const downloadUrl = ctx.properties.binaries.osx
            ctx._downloadUrl = downloadUrl
            subTask.output = chalk`File URL: {dim {cyan ${downloadUrl}}}`
          },
          options: {
            persistentOutput: true
          }
        },
        { 
          // title: 'Define wallet files in context',
          task: async () => {
            Object.assign(ctx, {
              _walletBasename: path.basename(ctx._downloadUrl),
            })
            Object.assign(ctx, {
              _downloadFullpath: ctx._walletTempDir + '/' + ctx._walletBasename,
            })
            Object.assign(ctx, {
              _destinationExists: await (access(ctx._downloadFullpath, constants.F_OK).then(() => true).catch(() => false))
            })
          }
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
          task: downloadFileTask,
          options: {
            persistentOutput: true
            // bottomBar: Infinity
          }
        },
        {
          title: 'Verify file integrity',
          task: (_, subTask) => makeFileIntegrityCheck(ctx._downloadFullpath, `binaries/osx/${ctx._walletBasename}`)(_, subTask),
        },
        {
          title: 'Run installer',
          task: async (_, subTask) => {
            subTask.output = 'running installer...'

            const { exec } = await import('child_process')
            const cmd = `open ${ctx._downloadFullpath}`
            await new Promise(r => exec(cmd, (err, stdout, stderr) => {
              r()
            }))
            await subTask.prompt({
              type: 'confirm',
              initial: true,
              message: 'Add BitcoinIL to your Applications and continue...'
            })
          },
          options: {
            // bottomBar: Infinity
          }
        },
        {
          title: chalk`Prepare {cyan bitcoinil.conf} file`,
          task: async (_, subTask) => {
            const { get, set } = await import('../bitcoinil-conf.mjs')
            const isTestnet = +(await get('testnet')) === 1
            const useTestnet = !isTestnet
              ? (!ctx.options.confirm && await subTask.prompt({
                  type: 'Toggle',
                  initial: isTestnet,
                  message: `Would you like to launch wallet in Testnet mode? (current: "${isTestnet ? 'Yes' : 'No'}")`,
                  enabled: 'Yes',
                  disabled: 'No'
                }))
              : isTestnet
            
            if (useTestnet !== isTestnet) {
              await set('testnet', +useTestnet)
            }
          },
          options: {
            // bottomBar: Infinity
          }
        },
        {
          title: 'Configure JSON-RPC',
          skip: () => !ctx.selections.miner && !ctx.options.jsonRpc,
          task: configureJSONRPC
        },
        {
          title: 'Launch wallet',
          skip: () => ctx.options.confirm,
          task: async (_, subTask) => {
            ctx.confirmLaunchWallet = await subTask.prompt({
              type: 'confirm',
              message: 'Launch BitcoinIL Core wallet now?',
              initial: true
            })
          }
        },
        {
          title: 'Run wallet',
          skip: () => !ctx.confirmLaunchWallet,
          task: async (_, subTask) => {
            const { exec } = await import('child_process')
            const cmd = `open /Applications/BitcoinIL-Qt.app`
            subTask.output = 'Running wallet...'
            await new Promise(r => exec(cmd, (err, stdout, stderr) => {
              r(stdout)
            }))
          }
        }
      ]),
  },
  // {
  //   title: 'BitcoinIL Electrum',
  //   name: 'electrum',
  //   download: () => new Observable(async observer => {
  //     observer.next('Downloading BitcoinIL Core!!!')
  //     await sleep(4000)
  //     observer.complete()
  //   }),
  //   // build: () => new Observable(async observer => {
  //   //   observer.next('Building BitcoinIL Core!!!')
  //   //   await sleep(4000)
  //   //   observer.complete()
  //   // })
  // }
]

export const miners = [
  // {
  //   title: 'CPUMiner-Opt',
  //   name: 'cpuminer-opt',
  //   download: () => {}
  // },
  // {
  //   title: 'GeekMiner',
  //   name: 'geekminer',
  //   download: () => {},
  //   build: () => {},
  // }
]