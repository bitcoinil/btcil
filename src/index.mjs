import prompts from 'prompts'
import osName from 'os-name'
import { Command, Option } from 'commander/esm.mjs';
import { installWallet } from './wizard/osx.mjs';
const program = new Command();

program
  .addOption(new Option('-i, --install [wallet]', 'Install BitcoinIL Wallet').choices(['core']))
  .addOption(new Option('-m, --install-miner [type]', 'Install BitcoinIL Compatible Miner').choices(['CPU', 'GPU', 'All']))
  .parse();

const options = program.opts();
console.log('opts:', options);

const winInstall = 'https://guides.bitcoinil.org/assets/downloads/binaries/windows/bitcoinil-0.21.0-win64-setup.exe'

if (options.install) {
  console.log('Installing wallet...')
  walletWizard()
}

 
async function walletWizard () {
  const thisOs = osName()

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

  } else {
    console.log('Aborting.')
  }
}