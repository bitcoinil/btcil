import { set, get } from '../bitcoinil-conf.mjs'
import chalk from 'chalk'

export const getNewAddress = (ctx, task) => 
  task.newListr([
    {
      // title: 'Prepare conf',
      task: prepareConf('conf', ctx.options.testnet)
    },
    {
      // title: 'Prepare context',
      task: async (_, subTask) => {
        ctx.conf = await get()

        // subTask.output = 'OPTIONS ' + JSON.stringify(ctx.options)
        const cont = ctx.options.confirm || await subTask.prompt({ 
          type: 'confirm',
          message: chalk`Generate a new address (type: {cyan ${ctx.options.address}})`,
          initial: true
        })
        if (!cont)
          throw new Error('Abort')
      },
      options: {
        bottomBar: Infinity
      }
    },
    {
      title: 'Set address label',
      task: async (_, subTask) => {
        const newLabel = `generate-${Math.floor(Math.random() * 1000000).toString()}`
        ctx.options.label = ctx.options.label && typeof ctx.options.label === 'string'
          ? ctx.options.label
          : (ctx.options.confirm && !ctx.options.label)
              ? newLabel
              : await subTask.prompt({
                type: 'input',
                message: 'Enter address label (or press Enter to use the generated label)',
                initial: newLabel
              })

        subTask.title = chalk`Address label: {cyan ${ctx.options.label}}`
      }
    },
    {
      title: 'Select address type',
      task: async (_, subTask) => {
        ctx.options.address = ctx.options.address && typeof ctx.options.address === 'string'
          ? ctx.options.address
          : (ctx.options.confirm && !ctx.options.address)
            ? 'bech32'
            : await subTask.prompt({
              type: 'select',
              message: 'Select address type',
              initial: 'bech32',
              choices: ['bech32', 'p2sh', 'legacy']
            })
              
        subTask.title = chalk`Address type: {cyan ${ctx.options.address}}`
      }
    },
    {
      // title: 'Generate address',
      task: makeGenerateAddress('address')
    },
    {
      title: 'Create address',
      enabled: () => ctx.address,
      task: async (_, subTask) => {
        subTask.title = chalk`Generate address: {green ${ctx.address}}`
      }
    }
  ])

export const makeGenerateAddress = (ctxName = 'address') =>
  (ctx, task) => 
    task.newListr(parent => [
      {
        // title: 'Prepare wallet config',
        task: async (_, subTask) => {
          const walletConf = ctx.options.testnet
            ? {
              username: ctx.conf.test.rpcuser,
              password: ctx.conf.test.rpcpassword,
              port: ctx.conf.test.rpcport ?? '18332'
            } 
            : {
            username: ctx.conf.rpcuser,
            password: ctx.conf.rpcpassword,
            port: ctx.conf.rpcport ?? '8332'
          }
          ctx.walletConf = walletConf
        },
      },
      {
        title: 'Test wallet connection',
        task: async (_, subTask) => {
          const { getClient } = await import('../adapters/bitcoind/index.mjs')
          try {
            const client = getClient(ctx.walletConf);
            const wallets = await client.listWallets()
            ctx.wallets = wallets
            ctx.client = client
          } catch (error) {
            ctx.clientError = error
          }
        }
      },
      {
        title: 'Activate wallet',
        enabled: () => ctx.clientError && `${ctx.clientError}`.match('ECONNREFUSED'),
        task: async (_, subTask) => {
          // await subTask.prompt({ type: 'confirm', message: 'Activate Wallet!' })
          subTask.output = `Client Error: ${ctx.clientError}\n\n`
          const runit = await subTask.prompt({
            type: 'confirm',
            message: 'It looks like your wallet is not active - would you like to run it?'
          })
          parent.title = 'Wallet error'
          if (runit) {
            const { getSystemModule } = await import('../platforms/index.mjs')
            const osName = (await import('os-name')).default

            const os = osName()
            const platform = await getSystemModule(os)
            platform.wallets.find(({ name }) => name === 'core').run(ctx)
            parent.title = 'Wallet launched - try running the command again'
          }
          throw ctx.clientError
        },
        options: {
          bottomBar: Infinity
        }
      },
      {
        title: 'Wallet Error',
        enabled: () => ctx.clientError && !(`${ctx.clientError}`.match('ECONNREFUSED')),
        task: async (_, subTask) => {
          subTask.title = ctx.clientError
          throw ctx.clientError
        },
        options: {
          bottomBar: Infinity
        }
      },
      {
        title: 'Select wallet',
        enabled: () => ctx.wallets?.length > 1,
        task: async (_, subTask) => {
          const { getClient } = await import('../adapters/bitcoind/index.mjs')
          const walletName = ctx.wallets.length > 1
            ? (
                !ctx.options.confirm && !ctx.options.wallet
                  ? await subTask.prompt({
                    type: 'select',
                    message: 'Select wallet',
                    choices: [...ctx.wallets]
                  })
                  : ctx.options.wallet || ctx.wallets[0]
              )
            : null

          ctx.walletName = walletName
          subTask.title = chalk`Wallet: ${ctx.walletName}`

          ctx.client = walletName ?
            getClient({
              ...ctx.walletConf,
              wallet: walletName,
            })
            : ctx.client
        },
        options: {
          bottomBar: Infinity
        }
      },
      {
        title: 'Make address',
        task: async (_, subTask) => {
          const result = await ctx.client.getNewAddress(ctx.options.label, ctx.options.address)
          ctx[ctxName] = result
        }
      }
    ])

export const prepareConf = (ctxName = 'conf', testnet) =>
  (ctx, task) => 
    task.newListr([
      {
        // title: 'Prepare context',
        task: async (_, subTask) => {
          // get JSON RPC data
          const { get } = await import('../bitcoinil-conf.mjs')
          ctx[ctxName] = await get()
        }
      },
      {
        enabled: () => (!testnet && !(+ctx[ctxName]?.server)) && (testnet && (+ctx[ctxName]?.server || +ctx[ctxName]?.test?.server)),
        title: 'Missing JSON RPC Configuration',
        task: async (_, subTask) => {
          await subTask.prompt({ type: 'confirm', message: 'It seemse you are missing JSON-RPC configuration - enable JSON-RPC on local wallet and try again' })
          throw new Error('Canceled - missing configuration')
        }
      },
    ])

  export const configureJsonRPCServer = (ctx, task) =>
    task.newListr(parent => [
      {
        title: 'Prepare system',
        task: async (_, subTask) => {
          const state = ctx.conf = (await get())
          if (+ctx.options.server === 1) {
            const nextPassword = Math.floor(Math.random() * Date.now()).toString(32)
              + Math.floor(Math.random() * Date.now()).toString(32)
              + Math.floor(Math.random() * Date.now()).toString(32)

            const nextOptions = {
              server: ctx.options.server ?? (state.server || 1),
              allowIps: ctx.options.allowIps ?? (state.rpcallowip || '127.0.0.1'),
              user: ctx.options.user ?? (state.rpcuser || 'bitcoinil'),
              password: (
                  typeof ctx.options.password === 'boolean'
                  || (ctx.options.testnet ? !state?.test?.password : !state.password)
                )
                ? ctx.options.password || (ctx.options.confirm
                    && nextPassword
                  ) || await task.prompt({
                    type: 'input',
                    message: 'Enter new password for JSON-RPC',
                    initial: nextPassword
                  })
                : (ctx.options.testnet ? state?.test?.password : state.password),
              port: ctx.options.port || (
                ctx.options.testnet
                  ? (state?.test?.port || '18332')
                  : (state?.port)
              )
            }
            Object.assign(ctx.options, nextOptions)
          }
        }
      },
      {
        title: 'Update bitcoinil.conf',
        task: configureJsonRPC
      }
    ])
  
  export const configureJsonRPC = async (ctx, task) => {
    const state = ctx.conf = (await get())

    const conf = {
      ...typeof ctx.options.server !== 'undefined'
        ? { server: ctx.options.server } : {},
      ...typeof ctx.options.allowIps !== 'undefined'
        ? { rpcallowip: ctx.options.allowIps } : {},
      ...ctx.options.user
        ? { rpcuser: ctx.options.user } : {},
      ...ctx.options.password
        ? { rpcpassword: ctx.options.password } : {},
      ...ctx.options.port
        ? { rpcport: ctx.options.port } : {}
    }
    const nextState = {
      ...!(+ctx.options.testnet)
        ? {
          ...conf,
          testnet: '0'
        }
        : {
          testnet: '1',
          test: {
            ...(state || {}).test || {},
            ...conf
          }
        }
    }
    await set(nextState)
    ctx.conf = nextState
  }
  