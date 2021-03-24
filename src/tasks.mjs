import chalk from 'chalk'
import { Listr } from 'listr2'
import osName from 'os-name'
import prompts from 'prompts'
import Observable from 'zen-observable'
import { sleep } from './utils.mjs'
import { countRuns } from './utils.mjs'
import si from 'systeminformation'
import { getSystemModule } from './platforms/index.mjs'
import { downloadFile } from './utils.mjs'
import { getTempDir } from './utils.mjs'
import { getProperties } from './utils.mjs'
import { downloadCertificate } from './utils.mjs'
import fs from 'fs'
import path from 'path'
import { getDirName } from './utils.mjs'
import { downloadSignature } from './utils.mjs'

const { readFile } = fs.promises

export const prepareInstaller = async (ctx, task) =>
  task.newListr(parent =>
    [
      {
        title: 'Identify Operating System',
        task: async (_ctx, subTask) => Object.assign(ctx, {
          os: osName(),
          cpu: await si.cpu(),
          graphics: (await si.graphics())?.controllers
        }) && (subTask.title = chalk`OS: {green ${ctx.os}}`)
      },
      {
        title: 'Identify CPU Make and Model',
        task: async (_ctx, subTask) => Object.assign(ctx, {
          cpu: await si.cpu(),
        })
        && Object.assign(ctx, { _cpuString: `${ctx.cpu.manufacturer} - ${ctx.cpu.brand}` })
        && (subTask.title = chalk`CPU: {green ${ctx._cpuString}}`)
      },
      {
        title: 'Identify GPUs Make and Model',
        task: async (_ctx, subTask) => Object.assign(ctx, {
          graphics: (await si.graphics())?.controllers,
        }) 
        && Object.assign(ctx, { _gpuString: ctx.graphics.reduce((acc, gpu) => [...acc, `${gpu.vendor} - ${gpu.model} (${Math.floor((gpu.vram / 1024) * 100) / 100}gb)`], []).join(', ') })
        && (subTask.title = chalk`GPU${ctx.graphics.length > 1 ? 's' :''}: {green ${ctx._gpuString}}`)
      },
      {
        title: 'Find Supported Modules',
        task: async (_ctx, subTask) => {
          subTask.output = 'System module loading for: ' + ctx.os

          ctx.platform = await getSystemModule(ctx.os)
          if (!ctx.platform) throw new Error('Platform not supported :(')
          subTask.output = 'System module loaded: ' + !!ctx.platform
        }
      },
      {
        title: 'Prepare System',
        enabled: () => !!ctx.platform,
        task: () => parent.title = chalk`System Ready: {bgGreen ${ctx.os}} {bgMagenta ${ctx._cpuString}} {bgBlue ${ctx._gpuString}}`
      }
    ],
    { concurrent: false, rendererOptions: { collapse: true, collapseErrors: true }, exitOnError: false }
  )


export const selectWallet = async (ctx, task) =>
  task.newListr(parent => 
    [
      {
        task: 'Confirm Wallet',
        skip: () => ctx.options.install,
        task: async (_ctx, subTask) => {
          const installWallet = await subTask.prompt({
            type: 'toggle',
            message: 'Would you like to install BitcoinIL wallet?',
            initial: true,
            enabled: 'Yes - install wallet',
            disabled: 'No'
          })

          ctx.selections = { 
            ...(ctx.selections || {}),
            installWallet
          }

          if (!installWallet)
            parent.output = 'No'
        }
      },
      {
        task: 'Prepare wallet installation',
        skip: () => 
          !ctx.selections?.installWallet // User selected not to install
          && !(ctx.options.install === true && (ctx.platform.wallets.length > 1 || (ctx.platform.wallets[0].build && ctx.platform.wallets[0].download))),
        task: async (_ctx, subTask) => {
          const walletTitle = ctx.platform.wallets.length > 1
            ? await subTask.prompt({
                type: 'Select',
                message: 'Select wallet to install',
                choices: ctx.platform.wallets.map(({title}) => title),
                maxChoices: 1
              })
            : ctx.platform.wallets[0].title
            
          const platformWallet = ctx.platform.wallets.find(({ title }) => title === walletTitle)
          const wallet = platformWallet.name
            
          const isBuild = platformWallet.build
            ? ctx.options.build || (!ctx.options.install && await subTask.prompt({
              type: 'Toggle',
              message: 'Build wallet from source?',
              enabled: 'Yes',
              disabled: 'No'
            }))
            : false
          
          const isDownload = platformWallet.download
            ? !isBuild
            : false
          
          ctx.selections = { 
            ...(ctx.selections || {}),
            wallet,
            walletTitle: platformWallet.title,
            isBuild,
            isDownload
          }
        }
      },
      {
        task: async () => {
          if (ctx.options.install && !ctx.selections?.wallet) {
            const platformWallet = ctx.options.install === true
              ? ctx.platform.wallets[0]
              : ctx.platform.wallets.find(({name}) => ctx.options.install === name)
            ctx.selections = {
              ...ctx.selections || {},
              wallet: platformWallet.name,
              walletTitle: platformWallet.title,
              isBuild: platformWallet.build && (ctx.options.build || !platformWallet.download),
              isDownload: platformWallet.download && (!!ctx.options.install || !platformWallet.build)
            }
            if (ctx.options.build && !ctx.selections.isBuild) throw new Error('Unable to build wallet from source')
            if (ctx.options.install && !ctx.selections.isDownload) throw new Error(ctx.selections.isDownload + ' Unable to download wallet binaries')
          }
          if (ctx.selections.isBuild || ctx.selections.isDownload)
            parent.output = chalk`Selected wallet: {cyan ${ctx.selections.walletTitle}}${ctx.selections.isBuild ? ` (build from source)` : ''}`
        }
      },
    ], 
    { concurrent: false, rendererOptions: { collapse: true, collapseErrors: true } }
  )


export const selectMiner = async (ctx, task) => 
  task.newListr(parent => 
    [

      {
        task: 'Confirm Miner',
        skip: () => ctx.options.installMiner,
        task: async (_ctx, subTask) => {
          const installMiner = await subTask.prompt({
            type: 'toggle',
            message: 'Would you like to install BitcoinIL miner?',
            initial: true,
            enabled: 'Yes - install miner',
            disabled: 'No'
          })

          ctx.selections = { 
            ...(ctx.selections || {}),
            installMiner
          }

          parent.output = installMiner ? 'Install' : 'No'
        }
      },
      {
        skip: () => !ctx.options.installMiner,
        task: () => {

          ctx.selections = { 
            ...(ctx.selections || {}),
            installMiner
          }
        }
      },
      {
        task: 'Prepare miner installation',
        skip: () => 
          !ctx.selections?.installMiner, 
          // && !(ctx.options.installMiner === true && (ctx.platform.miners?.gpu.length > 1 || (ctx.platform.wallets[0].build && ctx.platform.wallets[0].download))),
        task: async (_ctx, subTask) => {

          const minerTitle = ctx.platform.miners.length > 1
            ? typeof ctx.options.installMiner === 'string' && ctx.platform.miners.find(({name}) => name === ctx.options.installMiner)?.title
            || await subTask.prompt({
                type: 'Select',
                message: 'Select miner to install',
                choices: ctx.platform.miners.map(({title}) => title),
                maxChoices: 1
              })
            : ctx.platform.miners[0].title
            
          const platformMiner = ctx.platform.miners.find(({ title }) => title === minerTitle)
          const miner = platformMiner.name
            
          const isBuildMiner = platformMiner.build
            ? ((typeof ctx.options.installMiner === 'undefined'
                && !ctx.options.build)
                ? await subTask.prompt({
                      type: 'Toggle',
                      message: 'Build miner from source?',
                      enabled: 'Yes',
                      disabled: 'No'
                    })
                : ctx.options.build
              )
            : false
          
          const isDownloadMiner = platformMiner.download
            ? !isBuildMiner
            : false
          
          ctx.selections = { 
            ...(ctx.selections || {}),
            miner,
            minerTitle: platformMiner.title,
            isBuildMiner,
            isDownloadMiner
          }
        }
      },
      {
        task: () => {
          if (ctx.selections.isBuildMiner || ctx.selections.isDownloadMiner)
            parent.output = chalk`Selected miner: {cyan ${ctx.selections.minerTitle}}${ctx.selections.isBuildMiner ? ` (build from source)` : ''}`
        }
      }
    ],
    { concurrent: false, rendererOptions: { collapse: true, collapseErrors: true } }
  )

export const confirmInstallation = async (ctx, task) => {
  ctx.confirmInstall = ctx.options.confirm ? true : await task.prompt({
    type: 'toggle',
    message: chalk`You are about to install {cyan ${ctx.selections.walletTitle || ''}}${(ctx.selections.walletTitle && ctx.selections.minerTitle) ? ' and ' : ''}{cyan ${ctx.selections.minerTitle || ''}} - are you sure?`,
    initial: true,
    enabled: chalk`{green Yes}`,
    disabled: chalk`{red No}`
  })

  task.output = ctx.confirmInstall ? (ctx.options.confirm ? 'Auto-confirmed via CLI options' : 'User confirmed') : 'Aborted'
  if (!ctx.confirmInstall) 
    throw new Error('Aborted')
  
  ctx.doInstall = true
}

export const processInstall = (ctx, task) =>
  task.newListr(parent => [
    {
      title: 'Install Wallet',
      enabled: () => ctx.selections.wallet,
      task: ctx.selections.build ? buildWallet : installWallet,
      options: {
        persistentOutput: true

      }
    },
    {
      title: 'Install Miner',
      enabled: () => ctx.selections.miner,
      task: ctx.selections.buildMiner ? buildMiner : installMiner,
      options: {
        persistentOutput: true
      }
    },
  ])

export const installWallet = (ctx, task) =>
  task.newListr(parent => [
    {
      title: 'Download wallet installer',
      task: ctx.platform.wallets.find(({name}) => name === ctx.selections.wallet).download
    },
    {
      task: (_ctx, subTask) => {
        parent.output = 'Wallet installed successfully'
      },
      options: {
        persistentOutput: true

      }

    }
  ])

export const buildWallet = (ctx, task) =>
  task.newListr(parent => [
    {
      title: 'Download wallet sources...',
      task: async () => {
        await sleep(12000)
      }
    }
  ])

export const installMiner = (ctx, task) =>
  task.newListr(parent => [
    {
      title: 'Download miner binaries',
      task: async () => {
        await sleep(3000)
      }
    },
    {
      task: (_ctx, subTask) => {
        parent.output = '[parent] Miner installed successfully'
      },
      options: {
        persistentOutput: true

      }

    }
  ])

export const buildMiner = async (ctx, task) =>
  task.newListr(parent => [
    {
      title: 'Download miner sources...',
      task: async () => {
        await sleep(3300)
      }
    }
  ])

export const prepareTempDir = async (ctx, task) => {
  const tempDir = await getTempDir()
  task.output = 'Temp dir ready: ' + tempDir
  ctx.tempDir = tempDir
}
export const prepareProperties = async (ctx, task) => {
  const properties = await getProperties()
  ctx.properties = properties
}


export const makeFileIntegrityCheck = (file, sigName) =>
  (ctx, task) => task.newListr(parent => [
    {
      title: 'Prepare certificate',
      task: async () => {
        ctx.certificate = await downloadCertificate()
      }
    },
    {
      title: 'Verify certificate',
      task: async (_, subTask) => {
        const dirname = getDirName()
        const downloaded = ctx.certificate.certificate

        const localPath =  path.resolve(dirname, '..', 'certificate.pem')
        const local = await readFile(localPath, { encoding: 'utf8' })
        const identical = (local === downloaded)

        if (!identical && !ctx.options.ignoreCertificate)
          throw new Error('Certificate mismatch')
      }
    },
    {
      title: 'Download signature',
      task: async (_, subTask) => {
        const signature = ctx.signature = await downloadSignature(sigName)
        subTask.output = `File signature: ${signature.signature}` // JSON.stringify(signature)
        // await sleep(14000000)
      },
      options: { persistentOutput: true }
    },
    {
      title: 'Verify signed file',
      task: async (_, subTask) => {
        const { exec } = await import('child_process')
        const path = await import('path')
        const dirname = getDirName()
        const sig = ctx.signature.signature
        const cmd = `node ${dirname}/crypto/verify-file.js ${file} ${ctx.certificate.filepath} ${sig}`
        const verified = await new Promise(r => exec(cmd, (err, stdout, stderr) => {
          r(JSON.parse(stdout))
        }))
        if (!verified && !ctx.options.ignoreSignatures)
        throw new Error('File failed signature test')
        else if (!verified) {
          subTask.output = 'File signature test failed'
        }
        
        subTask.output = 'File signature verified'
        ctx.signatureVerified = true
      },
      options: {
        persistentOutput: true
      }
    }
  ], { rendererOptions: { persistentOutput: true }})

export const configureJSONRPC = async (ctx, task) => {
  const rpcpassword = ctx.options.password
    || (ctx.options.confirm ? 'talisawesome' : await task.prompt({
      type: 'password',
      message: 'Enter new password for JSON-RPC'
    }))

  const { set } = await import('./bitcoinil-conf.mjs')
  await set(state => ({
    rpcallowip: '127.0.0.1',
    rpcuser: 'bitcoinil',
    rpcpassword,
    ...(+state.testnet !== 1 ? { port: 8332 } : {}),
  }))
}