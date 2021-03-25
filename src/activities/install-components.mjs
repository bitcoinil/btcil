import si from 'systeminformation'
import osName from 'os-name'
import chalk from 'chalk'
import { getSystemModule } from '../platforms/index.mjs'
import { installWallet, buildWallet, selectWallet } from './wallets.mjs'
import { buildMiner, installMiner, selectMiner } from './miners.mjs'

export const installComponents = (_, subSubTask) =>
  subSubTask.newListr([
    {
      title: 'Select wallet',
      enabled: ctx => ctx.platform,
      task: selectWallet,
      options: {
        persistentOutput: true
      }
    },
    {
      title: 'Select miner',
      enabled: ctx => ctx.platform?.miners,
      skip: ctx => ctx.options.install && !ctx.options.installMiner,
      task: selectMiner,
      options: {
        persistentOutput: true
      }
    },
    {
      title: 'Install Components',
      enabled: ctx => ctx.platform && (ctx.selections?.wallet || ctx.selections?.miner),
      task: (_, subTask) => 
        subTask.newListr([
          {
            title: 'Confirm Installation',
            task: confirmInstallation,
            options: {
              persistentOutput: true
            },
          },
          {
            title: 'Install',
            enabled: ctx => ctx.doInstall,
            task: processInstall,
            options: {
              persistentOutput: true
            }
          }
        ]),

      options: {
        persistentOutput: true
      }
    }
  ])


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
