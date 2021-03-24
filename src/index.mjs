import prompts from 'prompts'
import osName from 'os-name'
import { Command, Option } from 'commander/esm.mjs';
import { installWallet } from './wizard/osx.mjs';
import { countRuns } from './utils.mjs';
import { Listr } from 'listr2';
import Observable from 'zen-observable';
import { welcome } from './messages.mjs';
import logUpdate from 'log-update';
import cliSpinners from 'cli-spinners'
import { prepareInstaller } from './tasks.mjs';
import { confirmInstallation } from './tasks.mjs';
import { sleep } from './utils.mjs';
import chalk from 'chalk';
import boxen from 'boxen';
import { errorBox } from './utils.mjs';
import { getSystemModule } from './platforms/index.mjs';
import { selectWallet } from './tasks.mjs';
import { selectMiner } from './tasks.mjs';
import { processInstall } from './tasks.mjs';
import { prepareProperties } from './tasks.mjs';

const winInstall = 'https://guides.bitcoinil.org/assets/downloads/binaries/windows/bitcoinil-0.21.0-win64-setup.exe'

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
    task: prepareProperties
  },

  {
    title: 'Install wallet',
    enabled: ctx => ctx.platform,
    task: selectWallet,
    options: {
      persistentOutput: true
    }
  },
  {
    title: 'Install miner',
    enabled: ctx => ctx.platform?.miners,
    skip: ctx => ctx.options.install && !ctx.options.installMiner,
    task: selectMiner,
    options: {
      persistentOutput: true
    }
  },
  {
    title: 'Confirm installation',
    enabled: ctx => ctx.platform,
    task: confirmInstallation,
    options: {
      persistentOutput: true
    }
  },
  {
    title: 'Install',
    enabled: ctx => ctx.doInstall,
    task: processInstall,
    options: {
      persistentOutput: true
    }
  },
],
{ concurrent: false }
)
initialize()


async function initialize () {
  // Load Args
  const os = osName()
  const platform = await getSystemModule(os)
  await countRuns()

  const program = new Command();

  let _l
  
  program
    .addOption(new Option('-i, --install [wallet]', 'Install BitcoinIL wallet').choices(platform.wallets.map(({name}) => name)))
    .addOption(new Option('-b, --build', 'Build wallet from source' + `${(_l = platform.wallets.filter(({build}) => build)) && _l.length ? ` (supported wallets: ${_l.map(({name}) => name).join(', ')})` : ' (not supported)'}`))
    .addOption(new Option('-m, --install-miner [type]', 'Install BitcoinIL Compatible Miner'))
    .addOption(new Option('-t, --testnet', 'Use testnet'))
    .addOption(new Option('-p, --password <string>', 'Use pre-defined password'))
    .addOption(new Option('-c, --confirm', 'Confirm all user prompts automatically'))
    .addOption(new Option('-s, --silent', 'Silent (unattended) operation - suppress all output except errors'))
    .addOption(new Option('-o, --ignore-certificate', 'Supress certificate mismatch errors'))
    .addOption(new Option('-is, --ignore-signatures', 'Supress file signature errors'))
    .parse();
  
  const options = program.opts();

  console.log('What are options:', options)

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
    const res = await mainTasks.run({ options })
    if (!res.platform) console.error(errorBox(1002, `Platform not supported`))
  } catch (error) {
    if (error.toString() !== 'Error: Aborted')
      console.log(errorBox(1003, error))
    
    process.exit(1)
  }
}
