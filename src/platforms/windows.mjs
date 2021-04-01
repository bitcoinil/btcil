
import chalk from 'chalk'
import path from 'path'
import fs, { constants } from 'fs'
import { prepareTempDir } from '../tasks/system-tasks.mjs'
import { sleep } from '../utils.mjs'
import { downloadFileTask } from '../tasks.mjs'
import { makeFileIntegrityCheck } from '../tasks.mjs'
import { configureJSONRPC } from '../tasks.mjs'
import { makeDownloadFileTask } from '../tasks.mjs'
import { extractZipFile } from '../utils.mjs'

const { access, unlink } = fs.promises
export const platform = 'windows'
export const wallets = [
  {
    name: 'core',
    title: 'BitcoinIL Core',
    run: async (ctx) => {
      const { spawn } = await import('child_process')

      const useTestnet = ctx.options?.testnet
      const cmd = `C:\\Program Files\\BitcoinIL\\bitcoinil-qt.exe`
      const child = spawn(cmd, [useTestnet ? '-testnet' : ''], {
        detached: true,
        stdio: 'ignore'
      })
      child.unref()
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
              subTask.output = 'Follow the setup instructions...'
              await new Promise(r => exec(cmd, (err, stdout, stderr) => {
                r()
              }))
              // await subTask.prompt({
              //   type: 'confirm',
              //   initial: true,
              //   message: 'Follow the setup instructions and click [Enter] to continue...'
              // })
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
            // skip: () => ctx.options.confirm,
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
              const { spawn } = await import('child_process')

              const useTestnet = ctx.options.testnet

              const cmd = `C:\\Program Files\\BitcoinIL\\bitcoinil-qt.exe`
              subTask.output = 'Running wallet...'
              const child = spawn(cmd, [useTestnet ? '-testnet' : ''], {
                detached: true,
                stdio: 'ignore'
              })
              child.unref()
            },
            options: {
              // bottomBar: Infinity
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

export const miners = [
  {
    title: 'CPUMiner-OPT',
    name: 'cpuminer-opt',
    start: (ctx, task) =>
      task.newListr(parent => [
        {
          title: 'Run Miner',
          task: async (_, subTask) => {
            subTask.output = 'Running miner...'
            const { spawn } = await import('child_process')
            const fullpath = ctx.execPath = ctx.miner.path + '/' + 'cpuminer-aes-sse42.exe'

            const args = ctx.execArgs = [
              `--coinbase-addr=${ctx.options.output}`,
              `--algo=x17`,
              `-o ${ctx.options.hostname}`,
              `-u ${ctx.options.username}`,
              `-p ${ctx.options.password}`,
              `--no-stratum`,
              `--no-longpoll`,
              `-t ${ctx.options.threads}`,
              `--debug`
            ]
            subTask.output = JSON.stringify({ fullpath, args }, 1, 1)
            // await subTask.prompt({
            //   type: 'confirm',
            //   message: 'before'
            // })
            subTask.output = `${fullpath} ${args.join(' ')}`
            ctx.result = `${fullpath} ${args.join(' ')}`
            ctx.exec = ctx.result

            const { writeFile } = (await import('fs')).promises
            const bat = `cpuminer-aes-sse42.exe ${args.join(' ')}`
            const batname = `run${ctx.options.testnet ? '-testnet' : ''}.bat`
            await writeFile(ctx.miner.path + '/' + batname, bat)

            subTask.title = chalk`\n\nYou can now run the file {cyan ${batname}} which will launch the miner`
            ctx.batfile = ctx.miner.path + '/' + batname

            // const child = spawn(fullpath, args)
            // child.on('message', (...r) => {
            //   subTask.output = 'RES: ' + JSON.stringify(r, 1, 1)
            // })
            // subTask.output = JSON.stringify({ child }, 1, 1)
            // await subTask.prompt({
            //   type: 'confirm',
            //   message: 'after'
            // })
            
            // child.stdout.on('data', (data) => {
            //   subTask.output = data
            // });
            // child.stderr.on('data', (data) => {
            //   subTask.output = errorBox(9101, data)
            // });
            // return new Promise((resolve) => {
            //   child.on('exit', function (code, signal) {
            //     // console.log('child process exited with ' +
            //     //             `code ${code} and signal ${signal}`);
            //     subTask.output = 'closed: ${code} ${signal}'
            //     resolve()
            //   });
            // })
            // return child
          },
          options: {
            persistentOutput: true,
            bottomBar: Infinity
          }
        }
      ], {
        rendererOptions: {
          persistentOutput: true,
          bottomBar: Infinity
        }
      }),
    download: (ctx, task) =>
      task.newListr(parent => [
        {
          title: 'Prepare temporary directory',
          enabled: ctx => !ctx.tempDir,
          task: prepareTempDir
        },
        { task: () => ctx._minerTempDir = ctx.tempDir + '/miner-install' },
        {
          title: 'Configure download file',
          task: async (_, subTask) => {
            const downloadUrl = ctx.properties.miners['cpuminer-opt']
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
            _minerBasename: path.basename(ctx._downloadUrl),
          })
          && Object.assign(ctx, {
            _downloadFullpath: ctx._minerTempDir + '/' + ctx._minerBasename,
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
          task: (_, subTask) => makeDownloadFileTask({
                                  downloadUrl: ctx._downloadUrl,
                                  directory: ctx._minerTempDir,
                                  saveFilename: ctx._minerBasename
                                })(_, subTask)
        },
        {
          title: 'Verify file integrity',
          task: (_, subTask) => makeFileIntegrityCheck(ctx._downloadFullpath, `binaries/windows/wallets/${ctx._minerBasename}`)(_, subTask),
        },
        // { task: },
        {
          title: 'Select installation directory',
          task: async (_, subTask) => {
            const cwd = ctx.cwd = process.cwd()
            const { get } = await import('../local-storage.mjs')
            let localInstallPath = ctx.localInstallPath = get('local-install-path')

            subTask.output = chalk`Current directory: {cyan ${cwd}}`
            if (localInstallPath) 
              subTask.output = chalk`Previously used directory: {cyan ${localInstallPath}}`
            
            ctx.suggestedPath = 'C:\\BTCIL'
            
            ctx.selectDir = ctx.options.currentDir
              ? 'Current'
              : (ctx.options.dir
              || (
                ctx.options.confirm
                ? ctx.localInstallPath || ctx.suggestedPath
                : await subTask.prompt({
                  type: 'select',
                  message: 'Where would you like to install the miner to?',
                  choices: [
                    ...localInstallPath ? [
                      chalk`Previously used [{cyan ${ctx.localInstallPath}}]`,
                      chalk`Current directory [{cyan ${ctx.cwd}}]`,
                    ] : [
                      chalk`Current directory [{cyan ${ctx.cwd}}]`,
                      chalk`Previously used [{cyan ${ctx.localInstallPath}}]`,
                    ],
                    ctx.suggestedPath,
                    'Custom'
                  ]
                })
              ))
          },
          options: {
            bottomBar: Infinity
          }
        },
        {
          title: 'Set custom installation path',
          enabled: () => ctx.selectDir === 'Custom',
          task: async (_, subTask) => {
            ctx.installPath = (await subTask.prompt({
              type: 'input',
              message: 'Enter directory',
              initial: ctx.suggestedPath
            }))
          }
        },
        {
          title: 'Set custom installation path',
          enabled: () => ctx.selectDir !== 'Custom',
          task: async (_, subTask) => {
            ctx.installPath = ctx.selectDir.match(/^Current/)
              ? ctx.cwd
              : ctx.options.confirm
              ? ctx.suggestedPath
              : ctx.selectDir.match(/^Previous/)
              ? ctx.localInstallPath
              : ctx.selectDir
          }
        },
        {
          // title: 'Persist installation directory to local storage',
          enabled: () => !ctx.options.confirm,
          task: async (_, subTask) => {
            const { set } = await import('../local-storage.mjs')
            set('local-install-path', ctx.installPath)
          }
        },
        {
          // title: 'Make output path',
          task: async (_, subTask) => {
            ctx.outputPath = ctx.installPath + '/cpuminer-opt'
          }
        },
        {
          // title: 'Create working directory',
          task: async (_, subTask) => {
            const { get } = await import('../local-storage.mjs')
            
            // await subTask.prompt({
            //   type: 'confirm',
            //   message: 'install path: ' + ctx.installPath
            // })

            subTask.output = chalk`Ouptut Path: {cyan ${ctx.outputPath}}`
            await subTask.prompt({
              type: 'confirm',
              message: 'Extracting: ' + ctx._downloadFullpath
            })
            const entries = await extractZipFile(ctx._downloadFullpath, ctx.outputPath)

            // subTask.output = JSON.stringify(entries, 1, 1)
            // await subTask.prompt({
            //   type: 'confirm'
            // })
            // let localInstallPath = get('local-install-path')
            // if (!localInstallPath) {
            //   const cwd = process.cwd()
            //   // await subTask.prompt({
            //   //   type: 'confirm',
            //   //   message: 'current working dir: ' + cwd
            //   // })
            //   localInstallPath = !ctx.options.confirm
            //     ? subTask.prompt({
            //       type: 'input',
            //       message: 'Enter directory where youd like to install wallets to',
            //       initial: 'C:\\btcil\\cpuminer-opt'
            //     })
            //     : 'C:\\btcil\\cpuminer-opt'
            // }
          },
          options: {
            bottomBar: Infinity
          }
        },
        {
          // title: 'Store installed data',
          task: async (_, subTask) => {
            const { set } = await import('../local-storage.mjs')
            set('installed-miners', v => ([
              ...(v || [])
                .filter(({name}) => !!name)
                .filter(({name}) => name !== 'cpuminer-opt'),
              {
                name: 'cpuminer-opt',
                installTime: Date.now(),
                path: ctx.outputPath
              }
            ]))
          }
        },
        {
          title: 'Miner Ready',
          task: async (_, subTask) => {
            subTask.output = 'Miner ready - you can now start mining by running:'
            subTask.output = chalk`\n$ {cyan btcil miner start}\n\n`
          },
          options: {
            bottomBar: Infinity,
            persistentOutput: true
          }
        }
      ], {
        rendererOptions: {
          persistentOutput: true,
          showTimer: true
        }
      })
    // }
  }
]