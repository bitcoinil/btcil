import chalk from 'chalk'
import path from 'path'
import Observable from 'zen-observable'
import { prepareTempDir } from '../tasks.mjs'
import { downloadFile } from '../utils.mjs'
import { sleep } from '../utils.mjs'
import cliProgress from 'cli-progress'
import cliSpinners from 'cli-spinners'
import stream from 'stream'
import fs, { constants } from 'fs'
import { getDirName } from '../utils.mjs'
import { makeFileIntegrityCheck } from '../tasks.mjs'
import { configureJSONRPC } from '../tasks.mjs'

const { access, unlink } = fs.promises

export const getWallet = () => {
  
}

export const platform = 'osx'

export const walletName = 'BitcoinIL Core - OSX v0.21.0'
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
            const downloadUrl = ctx.properties.binaries.osx
            ctx._downloadUrl = downloadUrl
            subTask.output = chalk`File URL: {dim {cyan ${downloadUrl}}}`
          },
          options: {
            persistentOutput: true
          }
        },
        { 
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
          enabled: () => false, // DEBUG ONLY
          task: async (_, subTask) => {
            await unlink(ctx._downloadFullpath)
            ctx._destinationExists = false
          }
        },
        {
          title: 'Download file',
          skip: () => ctx._destinationExists,
          task: async (_ctx, subTask) => {
            const makeSpinner = (width = 8) =>
              [
                ...[...(Array(width))]
                  .map((_, i) => ([...Array(i)].map(() => '▰')).join('') + ([...Array(width - i)].map(() => '▱')).join('') ),
                ([...Array(width)].map(() => '▰')).join('')
              ]
            const spinner = {
              frames: makeSpinner(7)
            }
            

            await subTask.prompt({ type: 'confirm', message: 'Confirm file download' })
            && await downloadFile(ctx._downloadUrl, ctx._walletTempDir, ctx._walletBasename, {
              onResponse: (response) => {
                // console.log('content size: ' + response.headers['content-length'])
                // bar1.start(Math.floor((response.headers['content-length'] / 1024 / 1024) * 100) / 100)
                ctx.stats = { total: response.headers['content-length'], size: Math.floor((response.headers['content-length'] / 1024 / 1024) * 100) / 100 }
                subTask.output = spinner.frames[0] + ' ' + 'Size: ' + ctx.stats.total
              },
              onProgress: (percentage, chunk, remainingSize) => {
                const per = parseFloat(percentage)
                const frameNum = Math.ceil((spinner.frames.length - 1) * (per / 100))
                const frame = spinner.frames[frameNum]
                const totalDownload = Math.floor(((ctx.stats.total - remainingSize) / 1024 / 1024) * 100) / 100
                subTask.output = chalk`${ctx._walletBasename} ${frame} ${percentage}% {dim [${totalDownload}/${ctx.stats.size}mb]}`

                if (per >= 100) {
                  subTask.output = 'Download complete.'
                }
              },
            })

            await sleep(14000)
  

            // // https://guides.bitcoinil.org/assets/downloads/binaries/osx/BitcoinIL-Qt.dmg
            // // subTask.output = 'basename ' + ctx._walletBasename
            // // subTask.output = 'ctx._walletTempDir ' + ctx._walletTempDir
            // // subTask.output = 'ctx._downloadUrl ' + ctx._downloadUrl
            // // await sleep(3003)
            // // subTask.output = 'prep prerp' + ctx.tempDir
            // // await sleep(3003)
            // // subTask.output = 'prop proorp'
            // // await sleep(3003)
            
          },
          options: {
            // bottomBar: Infinity
          }
        },
        {
          title: 'Verify file integrity',
          task: (_, subTask) => makeFileIntegrityCheck(ctx._downloadFullpath, `binaries/osx/${ctx._walletBasename}`)(_, subTask),
        },
        {
          title: 'Run installer',
          skip: () => true,
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
          title: chalk`Create {cyan bitcoinil.conf} file`,
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

            // subTask.output = ' USE TESTNET: ' + useTestnet
            // subTask.output = ' USE SEL: ' + JSON.stringify(ctx.options, 1, 1) + JSON.stringify(ctx.selections, 1, 1)

            // await set('talisawesome', true)
            // subTask.output = ' IS talisawesome: ' + (await get('talisawesome'))

            // await sleep(14000000)
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
          title: 'Run wallet',
          task: async (_, subTask) => {
            const { exec } = await import('child_process')
            const cmd = `open /Applications/BitcoinIL-Qt.app`
            const verified = await new Promise(r => exec(cmd, (err, stdout, stderr) => {
              r(stdout)
            }))
            subTask.output = 'Running wallet...'
          }
        }
      ]),
    build: () => new Observable(async observer => {
      observer.next('Building BitcoinIL Core!!!')
      await sleep(4000)
      observer.complete()
    })
  },
  {
    title: 'BitcoinIL Electrum',
    name: 'electrum',
    download: () => new Observable(async observer => {
      observer.next('Downloading BitcoinIL Core!!!')
      await sleep(4000)
      observer.complete()
    }),
    // build: () => new Observable(async observer => {
    //   observer.next('Building BitcoinIL Core!!!')
    //   await sleep(4000)
    //   observer.complete()
    // })
  }
]

export const miners = [
  {
    title: 'CPUMiner-Opt',
    name: 'cpuminer-opt',
    download: () => {}
  },
  {
    title: 'GeekMiner',
    name: 'geekminer',
    download: () => {},
    build: () => {},
  }
]