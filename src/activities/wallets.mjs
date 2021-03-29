import chalk from "chalk"
export const LAUNCH = new Date(Date.UTC(2021, 3, 1, 17))

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
      title: 'Mainnet launching on April 1st',
      skip: () => !ctx.selections?.installWallet || ctx.options.testnet || ctx.options.confirm || (Date.now() > LAUNCH),
      enabled: () => (Date.now() < LAUNCH),
      task: async (_, subTask) => {
        ctx.options.testnet = await subTask.prompt({
          type: 'confirm',
          message: 'Use Testnet?',
          initial: true
        })
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


export const installWallet = (ctx, task) =>
  task.newListr(parent => [
    {
      title: 'Download wallet installer',
      task: ctx.platform.wallets.find(({name}) => name === ctx.selections.wallet).download
    },
    {
      task: async (_ctx, subTask) => {
        const { set } = await import('../local-storage.mjs')
        const name = ctx.selections.wallet
        set('installed-wallets', v => [
          ...(v || []).filter((n) => n !== name), name])
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
        // await sleep(12000)
      }
    }
  ])

export const configureWallet = (ctx, task) =>
  task.newListr([
    {
      title: 'Select configuration option',
      task: async (_, subTask) => {
        await subTask.prompt({
          type: 'confirm'
        })
      }
    }
  ])