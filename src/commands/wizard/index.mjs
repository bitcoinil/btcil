import { Listr } from 'listr2'
import { welcome } from '../../messages.mjs'
import logUpdate from 'log-update'
import cliSpinners from 'cli-spinners'
import { errorBox, makeContext } from '../../utils.mjs'
import { activities } from '../../activities/index.mjs'
import { prepareProperties } from '../../tasks/system-tasks.mjs'
import { prepareInstaller } from '../../activities/install-components.mjs'
import { Option } from 'commander'
import osName from 'os-name'
import { getSystemModule } from '../../platforms/index.mjs'
import chalk from 'chalk'

export default async function wizard (program, context) {

  const os = osName()
  const platform = await getSystemModule(os)
  // const packageJson = await getPackageJson()

  let _l
  program
    .command('wizard', { isDefault: true })
    .description('Run the BTCIL Automated Wizard')
    .addOption(new Option('-i, --install [wallet]', 'Install BitcoinIL wallet').choices(platform.wallets?.map(({name}) => name)))
    .addOption(new Option('-b, --build', 'Build wallet/miner from source' + `${(_l = platform.wallets?.filter(({build}) => build)) && _l.length ? ` (supported wallets: ${_l.map(({name}) => name).join(', ')})` : ' (not supported)'}`))
    .addOption(new Option('-m, --install-miner [type]', 'Install BitcoinIL Compatible Miner'))
    .addOption(new Option('-b, --build', 'Build wallet/miner from source' + `${(_l = platform.wallets?.filter(({build}) => build)) && _l.length ? ` (supported wallets: ${_l.map(({name}) => name).join(', ')})` : ' (not supported)'}`))
    .addOption(new Option('-t, --testnet', 'Use testnet'))
    .addOption(new Option('-p, --password <string>', 'Use pre-defined password'))
    .addOption(new Option('-c, --confirm', 'Confirm all user prompts automatically'))
    .addOption(new Option('-o, --ignore-certificate', 'Supress certificate mismatch errors'))
    .addOption(new Option('-is, --ignore-signatures', 'Supress file signature errors'))
    .addOption(new Option('-sd, --skip-downloads', 'Avoid re-downloading assets'))
    .addOption(new Option('-j, --json-rpc', 'Configure JSON-RPC'))
    .addOption(new Option('-d, --debug', 'Debug').hideHelp())
    .addOption(new Option('-x, --mock <target>', 'Mock target platform (ignore host platform identification)').hideHelp())
    .addOption(new Option('-pt, --paths [pathname]', 'Show paths (use with -c to create tempDir)').hideHelp())
    .action(wizardAction(context))

}

export const wizardAction = ctx => async (options, command) => {
  const { runIndex } = ctx


  options.debug && console.log('[DEBUG] CLI Options:', options, '\n')

  const context = await makeContext({
    runIndex
  }, options)

  options.debug && console.log('[DEBUG] Context:', context, '\n')

  if (options.paths) {
    const paths = Object.keys(context.paths)
    if (typeof options.paths === 'boolean')
      paths.map((p) => console.log(chalk`{cyan ${p}}: ${context.paths[p]}\n`))
    else if (options.paths in context.paths)
      console.log(chalk`{cyan ${options.paths}}: ${context.paths[options.paths]}\n`)
    else
      console.log(`Unknown paths option - available paths: ${paths.map((p) => chalk`{cyan ${p}}`).join(', ')}`)
    process.exit(0)
  }


  if (options.doLongWork) {
    let frameNumber = 0
    const spinner = cliSpinners.aesthetic
    const frame = async () => {
      const spinnerFrame = spinner.frames[frameNumber = ++frameNumber % spinner.frames.length]
      logUpdate(welcome(`Loading...\n${spinnerFrame} `))
    }
    const tid = setInterval(frame, 220)
  
    await new Promise(resolve => setTimeout(resolve, 800))
    // Long polling work here if needed before setup start
    clearInterval(tid)
  }

  logUpdate(welcome())
  logUpdate.done()
  
  try {
    const res = await mainTasks.run({ options, runIndex })
    if (!res.platform) console.error(errorBox(1002, `Platform not supported`))
  } catch (error) {
    if (error.toString() !== 'Error: Aborted')
      console.log(errorBox(1003, error))
    
    process.exit(1)
  }
}

const mainTasks = new Listr([
  {
    title: 'Prepare installer',
    task: prepareInstaller,
    options: {
      persistentOutput: true
    }
  },
  {
    title: 'Load properties',
    task: prepareProperties,
    options: {
      persistentOutput: true
    }
  },
  
  {
    title: 'Activities',
    task: activities,
    options: {
      persistentOutput: true
    }
  },

],
{ concurrent: false }
)