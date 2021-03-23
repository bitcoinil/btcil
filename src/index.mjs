import prompts from 'prompts'
import osName from 'os-name'
import { Command, Option } from 'commander/esm.mjs';
import { installWallet } from './wizard/osx.mjs';
import { countRuns } from './utils.mjs';
import Listr from 'listr';
import Observable from 'zen-observable';
import boxen from 'boxen';
import chalk from 'chalk';
import { getPackageJson } from './utils.mjs';

const pkg = getPackageJson()

const program = new Command();

program
  .addOption(new Option('-i, --install [wallet]', 'Install BitcoinIL Wallet').choices(['core']))
  .addOption(new Option('-m, --install-miner [type]', 'Install BitcoinIL Compatible Miner').choices(['CPU', 'GPU', 'All']))
  .parse();

const options = program.opts();

console.log(boxen(chalk`{blue Bitcoin Israel - Automated Wizard}\n{dim {magenta btcil {cyan v${pkg.version}}}}\n\n{dim {blue https://bitcoinil.org}}`, {dimBorder: 1,padding: 1, margin: 1, borderStyle: 'doubleSingle'}))
console.log('opts:', options);


const winInstall = 'https://guides.bitcoinil.org/assets/downloads/binaries/windows/bitcoinil-0.21.0-win64-setup.exe'

const mainTasks = new Listr([
  {
    title: 'Detect OS',
    task: (ctx, task) => new Observable(observer => {

      const thisOs = osName()
      observer.next('OS Detected: ' + thisOs)
      setTimeout(() => {
        task.title = 'Detected OS: ' + thisOs
        observer.complete()

      }, 5000)
    })
  }
])

if (options.install) {
  console.log('Installing wallet...')
  mainTasks.run()
  walletWizard()
}

 
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