import { Option } from 'commander'
import { Listr } from 'listr2'
import * as configureWalletTasks from '../../tasks/configure-wallet-tasks.mjs'
import { configureJsonRPCServer } from '../../tasks/configure-wallet-tasks.mjs'

export default async function configureWalletsCommand (propgram) {

  const command = propgram
    .command('configure')
  
  command
    .command('get-mining-address')
    .addOption(new Option('-c, --confirm', 'Confirm all user prompts automatically'))
    .addOption(new Option('-a, --address [type]', 'Select an address type').choices(['bech32', 'p2sh-segwit', 'legacy']).default('legacy'))
    .addOption(new Option('-l, --label [label]', 'Provide a label for new address'))
    .addOption(new Option('-w, --wallet [wallet name]', 'Use a specific wallet (if you have multiple wallets)'))
    .addOption(new Option('-t, --testnet', 'Configure for testnet'))
    .addOption(new Option('-d, --debug', 'Debug').hideHelp())
    .action(async (options, ...rest) => {
      options.debug && console.log('[DEBUG] CLI Options:', options, '\n')
      const tasks = makeConfigureTasks(configureWalletTasks.getNewAddress)
      await tasks.run({ options })
    })
  
  command
    .command('json-rpc')
    .addOption(new Option('-c, --confirm', 'Confirm all user prompts automatically'))
    .addOption(new Option('-t, --testnet', 'Configure for testnet'))
    .addOption(new Option('-u, --user <username>', 'Set JSON-RPC User'))
    .addOption(new Option('-p, --password <password>', 'Set JSON-RPC password'))
    .addOption(new Option('-s, --server [state]', 'Set JSON-RPC server On/Off').choices(['1', '0']).default('1'))
    .addOption(new Option('-i, --allow-ips <ips>', 'Set JSON-RPC Allowed IPs (comma-seperated)'))
    .addOption(new Option('-d, --debug', 'Debug').hideHelp())
    .action(async (options, comm) => {
      options.debug && console.log('[DEBUG] CLI Options:', options, '\n')
      const tasks = makeConfigureTasks(configureJsonRPCServer)
      await tasks.run({ options })
    })
}

const makeConfigureTasks = (mainTask) =>
  new Listr([
    ... mainTask
    ? [{
      task: mainTask
    }] : []
  ])