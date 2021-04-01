import chalk from 'chalk'
import { Option } from 'commander'
import { Listr } from 'listr2'
import * as minerTasks from '../../tasks/miner-tasks.mjs'

export default async function configureWalletsCommand (propgram) {

  const command = propgram
    .command('start')
  
  command
    .command('mining', { isDefault: true })
    .addOption(new Option('-c, --confirm', 'Confirm all user prompts automatically'))
    .addOption(new Option('-m, --miner <name>', 'Select specific miner to mine'))
    .addOption(new Option('-o, --output <address>', 'Define an output address'))
    .addOption(new Option('-u, --username <username>', 'Provide a username to connect with'))
    .addOption(new Option('-p, --password <password>', 'Provide a password to connect with'))
    .addOption(new Option('-h, --hostname <url>', 'Provide a hostname URL to connect to'))
    .addOption(new Option('--threads <number>', 'Choose number of threads to use').default('10'))
    .addOption(new Option('-t, --testnet', 'Mine on testnet'))
    .addOption(new Option('-x, --mock <target>', 'Mock target platform (ignore host platform identification)').hideHelp())
    .addOption(new Option('-d, --debug', 'Debug').hideHelp())
    .action(async (options, ...rest) => {
      options.debug && console.log('[DEBUG] CLI Options:', options, '\n')
      const tasks = makeConfigureTasks(minerTasks.runMinerTask)
      const res = await tasks.run({ options })
      if (res.batfile) {
        const batfile = res.batfile.replace(/\//g, '\\')
        console.log(chalk`\n\n\nYou can now run the file: {cyan ${batfile}}\n\n\n`)
      }
    })
}

const makeConfigureTasks = (mainTask) =>
  new Listr([
    ... mainTask
    ? [{
      task: mainTask
    }] : []
  ])