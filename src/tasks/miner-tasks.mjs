import chalk from 'chalk'
import osName from 'os-name'
import getSystemModule from '../platforms/index.mjs'
import { errorBox } from '../utils.mjs'

export const runMinerTask = (ctx, task) =>
task.newListr(parent => [
  {
    title: 'Locate local installation',
    task: async (_, subTask) => {
      const { get } = await import('../local-storage.mjs')
      const miners = ctx.availableMiners = get('installed-miners')
      if (miners?.length === 1) {
        ctx.options.miner = miners[0].name
      }
    }
  },
  {
    title: 'Select miner',
    enabled: () => ctx.availableMiners?.length,
    skip: () => 
      // !ctx.availableMiners.length &&
      ctx.options.miner ||
      ctx.availableMiners.length === 1,
    task: async (_, subTask) => {
      ctx.options.miner = await subTask.prompt({
        type: 'select',
        message: 'Select miner to run',
        choices: ctx.availableMiners.map(({name}) => name)
      })
      subTask.title = chalk`Selected miner: {cyan ${ctx.options.miner}}`
    }
  },
  {
    title: 'Display selected miner',
    enabled: () => ctx.options.miner,
    task: (_, subTask) => {
      const selectedMiner = ctx.selectedMiner = ctx.availableMiners.find(({name}) => ctx.options.miner === name)
      if (!selectedMiner) {
        subTask.output = errorBox(7010, chalk`Miner "{cyan ${ctx.options.miner}}" not recognized`)
        throw new Error('Unknown miner')
      }
      subTask.title = chalk`Selected miner: {cyan ${ctx.options.miner}}`
    },
    options: {
      persistentOutput: true,
      bottomBar: Infinity
    }
  },
  {
    title: 'No miners installed',
    enabled: () => !ctx.availableMiners?.length,
    task: async (_, subTask) => {
      subTask.output = errorBox(7011, chalk`No miners installed`)
      subTask.output = chalk`Error: {red No miners installed}\n`
      subTask.output = chalk`You can install a miner by running the wizard:`
      subTask.output = chalk`{cyan $ btcil -m}\n`
      throw new Error('No miners installed')
    },
    options: {
      persistentOutput: true,
      bottomBar: Infinity
    }
  },
  {
    // title: 'Load available addresses',
    task: async (_, subTask) => {
      const { get } = await import('../local-storage.mjs')
      const addresses = get('generated-addresses')?.[ctx.options.testnet ? 'test' : 'main']
      
      ctx.availableAddresses = addresses?.filter(({ type }) => type === 'legacy')
    }
  },
  {
    title: 'No available addresses to mine with',
    enabled: () => !ctx.options.output && !ctx.availableAddresses?.length,
    task: async (_, subTask) => {
      subTask.output = 'You can generate a new mining address by running:'
      subTask.output = chalk`$ {cyan btcil wallet configure get-mining-address ${ctx.options.testnet ? '-t' : ''}}`
      subTask.output = chalk`or you can run this command again and provide an output address:`
      subTask.output = chalk`$ {cyan btcil ${process.argv.filter((_, i) => i > 1).join(' ')} -o YOUR_ADDRESS_HERE}`
      
      throw new Error('No address provided')
    },
    options: {
      persistentOutput: true,
      bottomBar: Infinity
    }
  },
  {
    title: 'Prepare receiving address',
    enabled: () => ctx.availableAddresses?.length,
    task: async (_, subTask) => {
      
      ctx.options.output = ctx.options.output ||
        (
          (ctx.options.confirm || ctx.availableAddresses?.length === 1)
          ? ctx.availableAddresses[0].address
          : await subTask.prompt({
              type: 'select',
              message: 'Select receiving address:',
              choices: ctx.availableAddresses.map(({address}) => address)
            })
        )
      subTask.title = chalk`Output address: {cyan ${ctx.options.output}}`
      // await subTask.prompt({
      //   type: 'confirm'
      // })
    },
    options: {
      persistentOutput: true,
      bottomBar: Infinity
    }
  },
  
  ///////////
  // JSON-RPC / Pool
  ///////////
  
  {
    // title: 'Load wallets',
    task: async (_, subTask) => {
      const { get } = await import('../local-storage.mjs')
      ctx.installedWallets = get('installed-wallets')
    },
    options: {
      persistentOutput: true,
      bottomBar: Infinity
    }
  },
  {
    title: 'Select local-wallet server',
    skip: () => !!(ctx.options.hostname || ctx.options.username || ctx.options.password),
    enabled: () => ctx.installedWallets?.length,
    task: async (_, subTask) => {
      ctx.selectedWallet = ctx.installedWallets?.length === 1
        || (ctx.installedWallets?.length >= 1 && ctx.options.confirm)
        ? ctx.installedWallets[0]
        : ctx.installedWallets?.length > 1
        ? await subTask.prompt({
          type: 'select',
          message: 'Select local wallet to use',
          choices: ctx.installedWallets
        })
        : null
    },
    options: {
      persistentOutput: true,
      bottomBar: Infinity
    }
  },
  {
    title: 'Setup local server',
    enabled: () => ctx.selectedWallet && ctx.installedWallets?.indexOf(ctx.selectedWallet) !== -1,
    task: async (_, subTask) => {
      const { get } = await import('../bitcoinil-conf.mjs')

      const conf = await get()
      if (!conf || (ctx.options.testnet && (!conf.test || !conf.test.server)) || (!ctx.options.testnet && !conf.server)) {
        subTask.output = errorBox(6010, 'JSON-RPC not configured')
        subTask.output = chalk`There's no JSON-RPC configuration for {cyan ${ctx.selectedWallet}} wallet`
        subTask.output = chalk`You can configure the local wallet for mining by running:`
        subTask.output = chalk`$ {cyan btcil wallet configure json-rpc -t}`
        throw new Error('Missing configuration')
      }
      ctx.walletConf = ctx.options.testnet
        ? {
          ...conf.test?.rpcuser ? { username: conf.test?.rpcuser } : {},
          ...conf.test?.rpcpassword ? { password: conf.test?.rpcpassword } : {},
          hostname: 'http://localhost:' + (conf.test?.rpcport || '18332'),
          port: conf.test?.rpcport || '18332'
        }
        : {
          ...conf.rpcuser ? { username: conf.rpcuser } : {},
          ...conf.rpcpassword ? { password: conf.rpcpassword } : {},
          hostname: 'http://localhost:' + (conf.rpcport || '8332'),
          port: conf.rpcport || 8332
        }
    },
    options: {
      persistentOutput: true,
      bottomBar: Infinity
    }
  },
  {
    title: 'Test wallet connection',
    task: async (_, subTask) => {
      const { getClient } = await import('../adapters/bitcoind/index.mjs')
      try {
        const client = getClient(ctx.walletConf);
        await client.listWallets()
      } catch (error) {
        ctx.walletError = error
      }
    }
  },
  {
    title: 'Wallet error',
    enabled: () => !!ctx.walletError,
    task: async (_, subTask) => {
      subTask.output = `Error: ${ctx.walletError}`
      subTask.output = errorBox(8001, 'Local wallet JSON-RPC unreachable')
      subTask.output = chalk`Your local wallet is not reachable via JSON-RPC`
      subTask.output = chalk`Try running the wallet and runninng this command again`
      subTask.output = chalk`You can run the local wallet by running:`
      subTask.output = chalk`$ {cyan btcil wallet run ${ctx.options.testnet ? '-t' : ''}}`
      throw new Error('Local server unreachable')
    },
    options: {
      persistentOutput: true,
      bottomBar: Infinity
    }
  },
  {
    title: 'Custom server',
    enabled: () => !ctx.selectedWallet && (ctx.options.hostname || ctx.options.username || ctx.options.password),
    task: async (_, subTask) => {
      ctx.options.username = ctx.options.username || await subTask.prompt({
        type: 'input',
        message: 'Enter username',
      })
      ctx.options.password = ctx.options.password || await subTask.prompt({
        type: 'input',
        message: 'Enter password',
      })
      ctx.options.hostname = ctx.options.hostname || await subTask.prompt({
        type: 'input',
        message: 'Enter hostname',
      })
      
      // await subTask.prompt({
      //   type: 'confirm'
      // })
    },
    options: {
      persistentOutput: true,
      bottomBar: Infinity
    }
  },
  {
    title: 'Test server connection',
    task: async (_, subTask) => {

    },
    options: {
      persistentOutput: true,
      bottomBar: Infinity
    }
  },

  /// END JSON-RPC
  {
    title: 'Run miner',
    task: async (_, subTask) => {
      const platform = await getSystemModule(ctx.options.mock)
      // subTask.output = JSON.stringify(ctx, 1, 1)
      const Miner = ctx.Miner = platform.miners?.find(({ name }) => ctx.options.miner)
      
      subTask.output = 'Selected Miner: ' + JSON.stringify(ctx.selectedMiner, 1, 1)
      subTask.output = 'Miner: ' + JSON.stringify(Miner, 1, 1)
      if (typeof Miner.start !== 'function') {
        subTask.output = errorBox(7012, chalk`Miner is not supported`)
        throw new Error('Miner not supported')
      }
      ctx.miner = ctx.selectedMiner
      ctx.options = {
        ...ctx.options,
        username: ctx.options.username || ctx.walletConf.username,
        password: ctx.options.password || ctx.walletConf.password,
        hostname: ctx.options.hostname || ctx.walletConf.hostname,
      }

      return Miner.start(ctx, subTask)

    },
    options: {
      persistentOutput: true,
      bottomBar: Infinity
    }
  },
  {
    enabled: () => false,
    title: 'Locate local installation',
    task: async (_, subTask) => {
      const { get } = await import('../local-storage.mjs')

      subTask.output = 'CTX: ' + JSON.stringify(ctx, 1, 1)
      const miners = get('installed-miners')
      const miner = miners?.find(({name}) => name === 'cpuminer-opt')
      if (miner) {
        const osname = osName()
        const platform = getSystemModule(osname)
        const Miner = platform.miners?.find(({ name }) => ctx.options.miner)
        subTask.output = 'MINER: ' + JSON.stringify(miner, 1, 1)
        await subTask.prompt({
          type: 'confirm',
          message: 'YES MINER'
        })
      } else {
        subTask.output = 'NO MINER.'
        await subTask.prompt({
          type: 'confirm',
          message: 'NO MINER'
        })
      }
    },
    options: {
      persistentOutput: true,
      bottomBar: Infinity
    }
  }
], {
  rendererOptions: {
    formatOutput: false,
    persistentOutput: true,
    bottomBar: Infinity
  }
})