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

const winInstall = 'https://guides.bitcoinil.org/assets/downloads/binaries/windows/bitcoinil-0.21.0-win64-setup.exe'

const mainTasks = new Listr([
  {
    title: 'Prepare installer',
    task: prepareInstaller
  },
  {
    title: 'Confirm installation',
    task: confirmInstallation
  },
  {
    title: 'Detect OS',
    task: async (ctx, task) => {
      const thisOs = osName()
      task.output = 'OS Detected: ' + thisOs
      task.output = JSON.stringify(ctx, 1, 1)
      await sleep(5000)
      // await new Promise(r => setTimeout(r, 5000))
      task.title = 'Detected OS: ' + thisOs
      await sleep(5000)
      // await new Promise(r => setTimeout(r, 5000))

      return 'cool'


    }
  }
],
{ concurrent: false }
)
initialize()

async function walletWizard () {
  const thisOs = osName()
  await countRuns()

  const isStart = await prompts({
    type: 'confirm',
    name: 'confirmed',
    initial: true,
    message: `You are about to install ${thisOs} - are you sure?`
  })
  console.log('what is isStart:', isStart)

  if (isStart.confirmed) {
    let osWizardName = thisOs.match(/^macOS/) ? 'osx' : thisOs.match(/^Windows/) ? 'windows' : 'linux'
    
    const ofos = await import('./wizard/' + osWizardName + '.mjs')
    console.log('ofos ready:', ofos)
    const installResult = ofos.installWallet()
    console.log('install result:', installResult)
    installResult.run().catch(err => {
      console.error(err);
    });

  } else {
    console.log('Aborting.')
  }
}

async function initialize () {
  // Load Args
  
  const program = new Command();
  
  program
    .addOption(new Option('-i, --install [wallet]', 'Install BitcoinIL Wallet').choices(['core']))
    .addOption(new Option('-m, --install-miner [type]', 'Install BitcoinIL Compatible Miner').choices(['CPU', 'GPU', 'All']))
    .addOption(new Option('-s, --silent', 'Silent (unattended) operation - suppress all output except errors').choices(['CPU', 'GPU', 'All']))
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
  
  // if (options.install) {
  //   console.log('Installing wallet...')
  //   mainTasks.run()
  //   walletWizard()
  // }

  mainTasks.run({ options })
  
  // Init Wizard
}
